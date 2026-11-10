import "server-only";
import { opponentSpeech } from "./opponent";
import { store } from "./store";
import type { Side } from "./config";

// Pre-written round 1 AI openers: every player on a day faces the same opener,
// and it costs nothing per game. Used by the admin route and the daily cron.

export type OpeningsResult =
  | { day: number; status: "written"; wrote: Side[]; for: string; against: string }
  | { day: number; status: "already done" }
  | { day: number; status: "no motion" };

/**
 * Make sure a day's motion has both openers. Only missing sides are written,
 * so an opener players may already have seen never changes, unless `force`.
 */
export async function ensureOpenings(day: number, opts: { force?: boolean } = {}): Promise<OpeningsResult> {
  const motion = await store().getMotion(day);
  if (!motion) return { day, status: "no motion" };

  const sides: Side[] = ["for", "against"];
  const wrote = sides.filter((s) => opts.force || !motion.aiOpening[s]);
  if (!wrote.length) return { day, status: "already done" };

  const texts = await Promise.all(
    sides.map((side) =>
      wrote.includes(side)
        ? opponentSpeech({ motion, aiSide: side, round: 1, previous: [] })
        : Promise.resolve(motion.aiOpening[side]!),
    ),
  );
  const [forText, againstText] = texts;
  await store().setOpenings(motion.id, { for: forText, against: againstText });
  return { day, status: "written", wrote, for: forText, against: againstText };
}
