import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv, type Side } from "./config";
import { seedMotion } from "./motions-seed";
import type { GameState, Motion, PendingAi, RoundRecord } from "./types";

// Persistence behind one interface. Supabase when SUPABASE_URL is set,
// otherwise an in-memory store (dev only: resets on restart, uses seed motions).

export interface Store {
  readonly kind: "supabase" | "memory";
  getMotion(day: number): Promise<Motion | null>;
  ensurePlayer(playerId: string): Promise<void>;
  getGame(playerId: string, motionId: string): Promise<GameState | null>;
  createGame(playerId: string, motion: Motion, side: Side, startFor: number): Promise<GameState>;
  /** How many of today's games argued FOR, out of how many in total. */
  sideCounts(motionId: string): Promise<{ forCount: number; total: number }>;
  /** Appends a round. Must fail if that round was already saved (double submit). */
  saveRound(game: GameState, record: RoundRecord, finish: { finalScore: number; won: boolean } | null): Promise<GameState>;
  stats(motionId: string): Promise<{ games: number; forPct: number; winPct: number; avgScore: number }>;
  /** Store (or clear) the background-written AI speech for a game. */
  setPendingAi(gameId: string, pending: PendingAi | null): Promise<void>;
}

// ── memory ──────────────────────────────────────────────────────────────────
type Mem = { games: Map<string, GameState & { playerId: string }> };
const g = globalThis as unknown as { __debatleMem?: Mem };
const mem: Mem = (g.__debatleMem ??= { games: new Map() });

const memoryStore: Store = {
  kind: "memory",
  async getMotion(day) {
    return seedMotion(day);
  },
  async ensurePlayer() {},
  async getGame(playerId, motionId) {
    return mem.games.get(`${playerId}:${motionId}`) ?? null;
  },
  async createGame(playerId, motion, side, startFor) {
    const key = `${playerId}:${motion.id}`;
    const existing = mem.games.get(key);
    if (existing) return existing;
    const game: GameState & { playerId: string } = {
      id: crypto.randomUUID(),
      playerId,
      motionId: motion.id,
      side,
      startFor,
      round: 1,
      crowdFor: startFor,
      rounds: [],
      status: "in_progress",
      finalScore: null,
      won: null,
    };
    mem.games.set(key, game);
    return game;
  },
  async saveRound(game, record, finish) {
    const stored = [...mem.games.values()].find((x) => x.id === game.id);
    if (!stored || stored.rounds.some((r) => r.round === record.round)) throw new RoundConflict();
    stored.rounds.push(record);
    stored.round = record.round + 1;
    stored.crowdFor = record.crowdFor;
    if (finish) Object.assign(stored, { status: "finished", ...finish });
    return stored;
  },
  async stats(motionId) {
    const games = [...mem.games.values()].filter((x) => x.motionId === motionId);
    return summarise(games);
  },
  async setPendingAi(gameId, pending) {
    const stored = [...mem.games.values()].find((x) => x.id === gameId);
    if (stored) stored.pendingAi = pending;
  },
  async sideCounts(motionId) {
    const games = [...mem.games.values()].filter((x) => x.motionId === motionId);
    return { forCount: games.filter((x) => x.side === "for").length, total: games.length };
  },
};

function summarise(games: Pick<GameState, "side" | "status" | "won" | "finalScore">[]) {
  const done = games.filter((x) => x.status === "finished");
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  return {
    games: games.length,
    forPct: pct(games.filter((x) => x.side === "for").length, games.length),
    winPct: pct(done.filter((x) => x.won).length, done.length),
    avgScore: done.length ? Math.round(done.reduce((s, x) => s + (x.finalScore ?? 0), 0) / done.length) : 0,
  };
}

export class RoundConflict extends Error {
  constructor() {
    super("Round already submitted");
  }
}

// ── supabase ────────────────────────────────────────────────────────────────
type MotionRow = {
  id: string;
  day_number: number;
  date: string;
  title: string;
  emoji: string;
  info: string | null;
  ai_opening_for: string | null;
  ai_opening_against: string | null;
};
type GameRow = {
  id: string;
  motion_id: string;
  side: Side;
  start_for: number;
  round: number;
  crowd_for: number;
  rounds: RoundRecord[];
  status: GameState["status"];
  final_score: number | null;
  won: boolean | null;
  pending_ai: PendingAi | null;
};

const toMotion = (r: MotionRow): Motion => ({
  id: r.id,
  dayNumber: r.day_number,
  date: r.date,
  title: r.title,
  emoji: r.emoji,
  info: r.info,
  aiOpening: {
    ...(r.ai_opening_for ? { for: r.ai_opening_for } : {}),
    ...(r.ai_opening_against ? { against: r.ai_opening_against } : {}),
  },
});

const toGame = (r: GameRow): GameState => ({
  id: r.id,
  motionId: r.motion_id,
  side: r.side,
  startFor: r.start_for,
  round: r.round,
  crowdFor: r.crowd_for,
  rounds: r.rounds ?? [],
  status: r.status,
  finalScore: r.final_score,
  won: r.won,
  pendingAi: r.pending_ai,
});

function supabaseStore(db: SupabaseClient): Store {
  return {
    kind: "supabase",
    async getMotion(day) {
      const { data, error } = await db.from("motions").select("*").eq("day_number", day).maybeSingle();
      if (error) throw error;
      return data ? toMotion(data as MotionRow) : null;
    },
    async ensurePlayer(playerId) {
      const { error } = await db.from("players").upsert({ id: playerId }, { ignoreDuplicates: true });
      if (error) throw error;
    },
    async getGame(playerId, motionId) {
      const { data, error } = await db
        .from("games")
        .select("*")
        .eq("player_id", playerId)
        .eq("motion_id", motionId)
        .maybeSingle();
      if (error) throw error;
      return data ? toGame(data as GameRow) : null;
    },
    async createGame(playerId, motion, side, startFor) {
      const { data, error } = await db
        .from("games")
        .upsert(
          { player_id: playerId, motion_id: motion.id, side, start_for: startFor, crowd_for: startFor },
          { onConflict: "player_id,motion_id", ignoreDuplicates: true },
        )
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ? toGame(data as GameRow) : (await this.getGame(playerId, motion.id))!;
    },
    async saveRound(game, record, finish) {
      // Optimistic concurrency: only advance if the game is still on this round.
      const { data, error } = await db
        .from("games")
        .update({
          rounds: [...game.rounds, record],
          round: record.round + 1,
          crowd_for: record.crowdFor,
          ...(finish
            ? { status: "finished", final_score: finish.finalScore, won: finish.won, finished_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", game.id)
        .eq("round", record.round)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new RoundConflict();
      return toGame(data as GameRow);
    },
    async stats(motionId) {
      const { data, error } = await db
        .from("games")
        .select("side,status,won,final_score")
        .eq("motion_id", motionId);
      if (error) throw error;
      return summarise(
        (data ?? []).map((r) => ({ side: r.side, status: r.status, won: r.won, finalScore: r.final_score })),
      );
    },
    async setPendingAi(gameId, pending) {
      const { error } = await db.from("games").update({ pending_ai: pending }).eq("id", gameId);
      if (error) throw error;
    },
    async sideCounts(motionId) {
      const count = async (side?: Side) => {
        let q = db.from("games").select("id", { count: "exact", head: true }).eq("motion_id", motionId);
        if (side) q = q.eq("side", side);
        const { count: n, error } = await q;
        if (error) throw error;
        return n ?? 0;
      };
      const [forCount, total] = await Promise.all([count("for"), count()]);
      return { forCount, total };
    },
  };
}

let cached: Store | null = null;
export function store(): Store {
  if (cached) return cached;
  const { supabaseUrl, supabaseServiceKey } = serverEnv();
  cached =
    supabaseUrl && supabaseServiceKey
      ? supabaseStore(createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }))
      : memoryStore;
  return cached;
}
