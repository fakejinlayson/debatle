import "server-only";
import { FREE_ARCHIVE_GAMES, otherSide, SPEECH_MAX_CHARS, TOTAL_ROUNDS, type Side } from "./config";
import { dayNumber } from "./day";
import { judgeWithTiebreak } from "./judge";
import { opponentSpeech } from "./opponent";
import { mockAI, mockJudge, mockOpponent } from "./mock";
import { applySwing, didWin, finalScore, startingSplit, swingFor } from "./scoring";
import { store } from "./store";
import type { GameState, Motion, PublicMotion, RoundRecord } from "./types";

// Game service: the rules, independent of HTTP.

export class GameError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function toPublic(motion: Motion): PublicMotion {
  const { aiOpening, ...rest } = motion;
  void aiOpening; // never sent to the browser
  return rest;
}

/** Strip anything the browser doesn't need (e.g. the memory store's playerId). */
export const publicGame = (g: GameState): GameState => ({
  id: g.id,
  motionId: g.motionId,
  side: g.side,
  startFor: g.startFor,
  round: g.round,
  crowdFor: g.crowdFor,
  rounds: g.rounds,
  status: g.status,
  finalScore: g.finalScore,
  won: g.won,
});

export async function todaysMotion(): Promise<Motion> {
  const motion = await store().getMotion(dayNumber());
  if (!motion) throw new GameError("No motion scheduled for today", 503);
  return motion;
}

/** Today's motion, or a past day's (archive). Future days are never playable. */
export async function motionForDay(day?: number): Promise<Motion> {
  const today = dayNumber();
  if (day === undefined || day === today) return todaysMotion();
  if (!Number.isInteger(day) || day < 1 || day > today) throw new GameError("That day isn't available", 404);
  const motion = await store().getMotion(day);
  if (!motion) throw new GameError("No motion for that day", 404);
  return motion;
}

export const isArchiveDay = (day?: number) => day !== undefined && day < dayNumber();

/** Thrown when a player needs the unlock to start another archive game. Maps to HTTP 402. */
export class ArchiveLocked extends GameError {
  constructor() {
    super("That day is in the full archive. Unlock it to play every past debate.", 402);
  }
}

export interface ArchiveAccess {
  unlocked: boolean;
  /** Past days anyone can play: the first FREE_ARCHIVE_GAMES days (No. 1, No. 2), the same for everyone. */
  freeDays: number[];
}

/** The most recent past days, free for everyone (like Krillion's "keep diving"). */
export function freeArchiveDays(today = dayNumber()): number[] {
  return Array.from({ length: FREE_ARCHIVE_GAMES }, (_, i) => i + 1).filter((d) => d < today);
}

/** What this player may do in the archive. `userId` is the signed-in account, if any. */
export async function archiveAccess(userId: string | null): Promise<ArchiveAccess> {
  const unlocked = userId ? await store().hasUnlock(userId) : false;
  return { unlocked, freeDays: freeArchiveDays() };
}

/** Whether this player may start (not just resume) a game on a past day. */
export const canStartArchiveDay = (access: ArchiveAccess, day: number) =>
  access.unlocked || access.freeDays.includes(day);

/** The hall's starting FOR share for a game begun now: today's player split so far. */
export async function startingCrowd(motion: Motion): Promise<number> {
  const { forCount, total } = await store().sideCounts(motion.id);
  return startingSplit(forCount, total);
}

/**
 * Starts (or resumes) a game. `day` defaults to today; a past day is an archive
 * game: the two most recent past days are free, the rest need the unlock.
 * A game already started can always be resumed.
 */
export async function startGame(
  playerId: string,
  side: Side,
  opts: { day?: number; userId?: string | null } = {},
): Promise<GameState> {
  const motion = await motionForDay(opts.day);
  const archive = isArchiveDay(opts.day);
  await store().ensurePlayer(playerId);
  if (archive) {
    const existing = await store().getGame(playerId, motion.id);
    if (existing) return existing;
    const access = await archiveAccess(opts.userId ?? null);
    if (!canStartArchiveDay(access, opts.day!)) throw new ArchiveLocked();
  }
  return store().createGame(playerId, motion, side, await startingCrowd(motion), archive);
}

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") console.info("[debatle]", ...args);
};

/**
 * Plays the current round. `onSpeeches` fires as soon as both speeches are
 * known (before judging) so the UI can show them side by side. Once the player
 * has seen the AI's speech, their own speech is locked: a retry after an error
 * re-judges the locked speech instead of accepting a new one.
 */
export async function playRound(
  playerId: string,
  rawText: string,
  onSpeeches?: (speeches: { round: number; playerText: string; aiText: string }) => void,
  day?: number,
): Promise<{ game: GameState; record: RoundRecord }> {
  // Archive games can only exist if startGame allowed them, so no access check here.
  const motion = await motionForDay(day);
  const game = await store().getGame(playerId, motion.id);
  if (!game) throw new GameError("Pick a side first", 409);
  if (game.status === "finished") throw new GameError("This debate is over", 409);

  const round = game.round;
  const locked = game.pendingAi?.round === round ? game.pendingAi.playerText : undefined;
  const text = locked ?? rawText.trim();
  if (!text) throw new GameError("Say something!", 400);
  if (text.length > SPEECH_MAX_CHARS) throw new GameError(`Speeches are limited to ${SPEECH_MAX_CHARS} characters`, 400);

  const mock = mockAI();
  const t0 = Date.now();
  const { text: aiText, source } = await aiSpeechFor(playerId, game, motion);
  const t1 = Date.now();
  await store().setPendingAi(game.id, {
    round,
    text: aiText,
    startedAt: game.pendingAi?.startedAt ?? t0,
    playerText: text,
  });
  onSpeeches?.({ round, playerText: text, aiText });

  const judgement = mock
    ? await mockJudge(round, text, aiText)
    : await judgeWithTiebreak({ motion, playerSide: game.side, round, playerText: text, aiText, previous: game.rounds });
  devLog(`round ${round}: AI speech ${source} in ${((t1 - t0) / 1000).toFixed(1)}s, judge (${judgement.judgedBy ?? "mock"}) ${((Date.now() - t1) / 1000).toFixed(1)}s`);

  const swing = swingFor(judgement.player.total, judgement.ai.total);
  const crowdFor = applySwing(game.crowdFor, game.side, swing);
  const record: RoundRecord = { round, playerText: text, aiText, judgement, swing, crowdFor };

  const rounds = [...game.rounds, record];
  const finish =
    round >= TOTAL_ROUNDS
      ? { finalScore: finalScore(rounds), won: didWin(rounds, game.startFor, crowdFor, game.side) }
      : null;

  const updated = await store().saveRound(game, record, finish);
  return { game: updated, record };
}

// ── AI speech written ahead of time ──────────────────────────────────────────
// Speeches are sealed, so the AI's round N speech depends only on rounds before
// N. That means it can be written the moment round N-1 ends, while the player
// is still typing. On submit only the judge has to run.

/** How long to wait for an in-flight background speech before writing one inline. */
const PENDING_WAIT_MS = 45_000;
const POLL_MS = 700;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function writeAiSpeech(game: GameState, motion: Motion): Promise<string> {
  const aiSide = otherSide(game.side);
  return mockAI()
    ? mockOpponent(aiSide, game.round)
    : opponentSpeech({ motion, aiSide, round: game.round, previous: game.rounds });
}

/**
 * Pre-write the AI's speech for the game's current round, if it isn't already
 * written or being written. Call from `after()` so it never delays a response.
 */
export async function prepareAiSpeech(game: GameState, motion: Motion): Promise<void> {
  if (game.status === "finished") return;
  const round = game.round;
  if (round === 1 && motion.aiOpening[otherSide(game.side)]) return; // daily opener already exists
  const p = game.pendingAi;
  if (p?.round === round && (p.text || Date.now() - p.startedAt < PENDING_WAIT_MS)) return;

  const startedAt = Date.now();
  await store().setPendingAi(game.id, { round, text: null, startedAt });
  try {
    const text = await writeAiSpeech(game, motion);
    await store().setPendingAi(game.id, { round, text, startedAt });
  } catch (err) {
    console.error("Background AI speech failed; it will be written on submit", err);
    await store().setPendingAi(game.id, null).catch(() => {});
  }
}

/** The AI's speech for this round: daily opener, pre-written, in-flight, or written now. */
async function aiSpeechFor(
  playerId: string,
  game: GameState,
  motion: Motion,
): Promise<{ text: string; source: "daily opener" | "pre-written" | "waited for" | "written inline" }> {
  const round = game.round;
  const opener = round === 1 ? motion.aiOpening[otherSide(game.side)] : undefined;
  if (opener) return { text: opener, source: "daily opener" };

  let p = game.pendingAi;
  if (p?.round === round && p.text) return { text: p.text, source: "pre-written" };
  while (p?.round === round && !p.text && Date.now() - p.startedAt < PENDING_WAIT_MS) {
    await sleep(POLL_MS);
    p = (await store().getGame(playerId, motion.id))?.pendingAi ?? null;
  }
  if (p?.round === round && p.text) return { text: p.text, source: "waited for" };
  return { text: await writeAiSpeech(game, motion), source: "written inline" };
}
