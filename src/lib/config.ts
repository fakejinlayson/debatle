// Central constants and env access. Server-only values are read lazily so the
// client bundle never touches them.

export const SPEECH_MAX_CHARS = 300;
export const ROUNDS = ["opening", "rebuttal", "closing"] as const;
export type RoundType = (typeof ROUNDS)[number];
export const TOTAL_ROUNDS = ROUNDS.length;

export type Side = "for" | "against";
export const otherSide = (s: Side): Side => (s === "for" ? "against" : "for");

// Day 1 of Debatle. Days roll over at 00:00 UTC.
export const EPOCH = process.env.DEBATLE_EPOCH ?? "2026-12-01";

export const MODELS = {
  judge: "claude-opus-5-5",
  opponent: "claude-opus-5-5",
} as const;

export function serverEnv() {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    cookieSecret: process.env.DEBATLE_COOKIE_SECRET ?? "dev-only-insecure-secret",
  };
}
