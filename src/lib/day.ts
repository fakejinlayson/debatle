import { EPOCH } from "./config";

const DAY_MS = 86_400_000;

/** Debatle day number for a moment in time (UTC rollover). Never below 1. */
export function dayNumber(now: Date = new Date()): number {
  const epoch = Date.parse(`${EPOCH}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.floor((today - epoch) / DAY_MS) + 1);
}

/** ISO date (YYYY-MM-DD) for a day number. */
export function dateForDay(day: number): string {
  const epoch = Date.parse(`${EPOCH}T00:00:00Z`);
  return new Date(epoch + (day - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** Milliseconds until the next 00:00 UTC rollover. */
export function msUntilReset(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}
