import { dayNumber } from "@/lib/day";
import { ensureOpenings, type OpeningsResult } from "@/lib/openings";
import { store } from "@/lib/store";

// Daily job (Vercel Cron, see vercel.json): pre-writes the AI openers for
// tomorrow and the day after, so a single failed run never leaves a day
// without them. Existing openers are never overwritten. Days with no motion
// scheduled are reported so the schedule doesn't silently run out.
//
// Vercel calls this with "Authorization: Bearer $CRON_SECRET". To run it by hand:
//   curl localhost:3107/api/cron/openings -H "Authorization: Bearer $CRON_SECRET"

export const maxDuration = 120;

const DAYS_AHEAD = [1, 2];

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (store().kind !== "supabase") {
    return Response.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const today = dayNumber();
  const results = await Promise.all(
    DAYS_AHEAD.map(async (offset): Promise<OpeningsResult | { day: number; status: "failed"; error: string }> => {
      const day = today + offset;
      try {
        return await ensureOpenings(day);
      } catch (err) {
        console.error(`[cron] openings for day ${day} failed`, err);
        return { day, status: "failed", error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );

  const summary = results.map((r) => ({
    day: r.day,
    status: r.status,
    ...(r.status === "written" ? { wrote: r.wrote } : {}),
    ...(r.status === "failed" ? { error: r.error } : {}),
  }));
  const unscheduled = summary.filter((r) => r.status === "no motion").map((r) => r.day);
  if (unscheduled.length) console.warn(`[cron] no motion scheduled for day(s) ${unscheduled.join(", ")}`);
  console.info("[cron] openings", JSON.stringify(summary));

  const failed = summary.some((r) => r.status === "failed");
  return Response.json({ today, results: summary, unscheduled }, { status: failed ? 500 : 200 });
}
