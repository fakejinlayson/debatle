import "server-only";
import { otherSide, SPEECH_MAX_CHARS, TOTAL_ROUNDS, type Side } from "./config";
import { dayNumber } from "./day";
import { judgeRound } from "./judge";
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

/** The hall's starting FOR share for a game begun now: today's player split so far. */
export async function startingCrowd(motion: Motion): Promise<number> {
  const { forCount, total } = await store().sideCounts(motion.id);
  return startingSplit(forCount, total);
}

export async function startGame(playerId: string, side: Side): Promise<GameState> {
  const motion = await todaysMotion();
  await store().ensurePlayer(playerId);
  return store().createGame(playerId, motion, side, await startingCrowd(motion));
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
): Promise<{ game: GameState; record: RoundRecord }> {
  const motion = await todaysMotion();
  const game = await store().getGame(playerId, motion.id);
  if (!game) throw new GameError("Pick a side first", 409);
  if (game.status === "finished") throw new GameError("Today's debate is over", 409);

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
    : await judgeRound({ motion, playerSide: game.side, round, playerText: text, aiText, previous: game.rounds });
  devLog(`round ${round}: AI speech ${source} in ${((t1 - t0) / 1000).toFixed(1)}s, judge ${((Date.now() - t1) / 1000).toFixed(1)}s`);

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
