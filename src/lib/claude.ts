import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Shared Anthropic client. Reads ANTHROPIC_API_KEY (or an `ant auth login` profile). */
export function claude(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/**
 * Server-side refusal fallbacks: on a safety decline the API re-runs on a
 * suitable model. Haiku has no server-side fallback, so it gets none.
 */
export const fallback = (
  model: string,
): { betas?: Anthropic.Beta.AnthropicBeta[]; fallbacks?: "default" } =>
  model.startsWith("claude-haiku")
    ? {}
    : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

export interface CallUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  ms: number;
}

/** USD per million tokens (input, output, cache read). Update when models change. */
const PRICES: Record<string, [number, number, number]> = {
  "claude-opus-5-5": [4, 20, 0.2],
  "claude-sonnet-5-5": [2, 10, 0.2],
  "claude-haiku-5-5": [0.1, 0.5, 0.01],
};

/** Dev-only: log tokens and estimated cost for one Claude call. */
export function logUsage(
  label: string,
  model: string,
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null },
) {
  if (process.env.NODE_ENV === "production") return;
  const [inP, outP, cacheP] = PRICES[model] ?? [0, 0, 0];
  const cached = usage.cache_read_input_tokens ?? 0;
  const cost = (usage.input_tokens * inP + usage.output_tokens * outP + cached * cacheP) / 1e6;
  console.info(
    `[debatle:usage] ${label} ${model} in=${usage.input_tokens} cached=${cached} out=${usage.output_tokens} ≈ $${cost.toFixed(4)}`,
  );
}

export class ClaudeRefusal extends Error {
  constructor(public category: string | null | undefined) {
    super(`Claude declined (${category ?? "unknown"})`);
  }
}
