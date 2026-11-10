// Central constants and env access. Server-only values are read lazily so the
// client bundle never touches them.

export const SPEECH_MAX_CHARS = 300;
export const ROUNDS = ["opening", "rebuttal", "closing"] as const;
export type RoundType = (typeof ROUNDS)[number];
export const TOTAL_ROUNDS = ROUNDS.length;

/** Archive debates a player can play before needing the one-time unlock. */
export const FREE_ARCHIVE_GAMES = 2;
/** The unlock price in US cents. */
export const UNLOCK_PRICE_CENTS = 500;

export type Side = "for" | "against";
export const otherSide = (s: Side): Side => (s === "for" ? "against" : "for");

// Day 1 of Debatle. Days roll over at 00:00 UTC.
// Falls back to the default if the env value isn't a valid YYYY-MM-DD date
// (e.g. half-typed while editing .env.local), so the site never crashes on it.
const DEFAULT_EPOCH = "2026-12-01";
const envEpoch = process.env.DEBATLE_EPOCH?.trim();
export const EPOCH =
  envEpoch && /^\d{4}-\d{2}-\d{2}$/.test(envEpoch) && !Number.isNaN(Date.parse(`${envEpoch}T00:00:00Z`))
    ? envEpoch
    : DEFAULT_EPOCH;

// Model setup (decided 10 Nov 2026 from scripts/eval/model_compare.py):
// Haiku judges every round; Opus re-judges close rounds, where Haiku and Opus
// most often disagree. Haiku writes the AI's speeches; Opus is the backup if
// Haiku refuses or errors (Haiku has no server-side refusal fallback).
export const MODELS = {
  judge: "claude-haiku-5-5",
  judgeTiebreak: "claude-opus-5-5",
  opponent: "claude-haiku-5-5",
  opponentBackup: "claude-opus-5-5",
} as const;

/** Opus re-judges any round whose Haiku score gap is this many points or fewer. */
export const TIEBREAK_GAP = 3;

export function serverEnv() {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    cookieSecret: process.env.DEBATLE_COOKIE_SECRET ?? "dev-only-insecure-secret",
  };
}
