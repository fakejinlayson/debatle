import type { Side } from "./config";
import type { GameState, RoundRecord } from "./types";

// See PLAN.md §1. Pure functions, safe on client and server.

export const DIMENSION_MAX = { reasoning: 40, engagement: 30, rhetoric: 20, strategy: 10 } as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Where the hall starts: the share of today's earlier players who argued FOR.
 * Smoothed toward 50/50 (as if 10 extra players had split evenly) so a handful
 * of early games can't produce a lopsided room, and kept within 25–75% so
 * either side always has room to swing.
 */
export function startingSplit(forCount: number, total: number): number {
  const PRIOR = 10;
  return clamp(Math.round(((forCount + PRIOR / 2) / (total + PRIOR)) * 100), 25, 75);
}

/** Voters moved toward the player this round (negative = toward the AI). */
export function swingFor(playerScore: number, aiScore: number): number {
  return clamp(Math.round((playerScore - aiScore) * 1.5), -15, 15);
}

/** New FOR share after a swing toward the player's side. */
export function applySwing(crowdFor: number, playerSide: Side, swing: number): number {
  const delta = playerSide === "for" ? swing : -swing;
  return clamp(crowdFor + delta, 0, 100);
}

/** Net voters gained by the player's side across the whole debate. */
export function netSwing(startFor: number, endFor: number, side: Side): number {
  return side === "for" ? endFor - startFor : startFor - endFor;
}

export function finalScore(rounds: RoundRecord[]): number {
  if (!rounds.length) return 0;
  return Math.round(rounds.reduce((s, r) => s + r.judgement.player.total, 0) / rounds.length);
}

/** IQ2 rule: you win if your side gained voters. Ties go to total score. */
export function didWin(rounds: RoundRecord[], startFor: number, endFor: number, side: Side): boolean {
  const net = netSwing(startFor, endFor, side);
  if (net !== 0) return net > 0;
  const p = rounds.reduce((s, r) => s + r.judgement.player.total, 0);
  const a = rounds.reduce((s, r) => s + r.judgement.ai.total, 0);
  return p >= a;
}

export const TIERS = [
  { min: 90, name: "Unanswerable" },
  { min: 80, name: "Orator" },
  { min: 70, name: "Barrister" },
  { min: 60, name: "Backbencher" },
  { min: 0, name: "Heckler" },
] as const;

export const tierFor = (score: number) => TIERS.find((t) => score >= t.min)!.name;

export function roundEmoji(r: RoundRecord): string {
  const diff = r.judgement.player.total - r.judgement.ai.total;
  return diff >= 3 ? "🟩" : diff <= -3 ? "🟥" : "🟨";
}

export function shareText(game: GameState, dayNumber: number, emoji: string, startFor: number): string {
  const net = netSwing(startFor, game.crowdFor, game.side);
  const score = game.finalScore ?? finalScore(game.rounds);
  return [
    `Debatle #${dayNumber} ${emoji} ${game.side.toUpperCase()}`,
    `${game.rounds.map(roundEmoji).join("")}  ${net >= 0 ? "+" : ""}${net} swing · ${game.won ? "WON" : "LOST"}`,
    `${score} · ${tierFor(score)}`,
  ].join("\n");
}
