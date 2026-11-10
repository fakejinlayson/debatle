import { z } from "zod";
import { ensureOpenings } from "@/lib/openings";
import { store } from "@/lib/store";
import { errorResponse } from "../../_respond";

// Manually pre-write the round 1 AI openers for one day. The daily cron
// (/api/cron/openings) normally does this automatically.
//   curl -X POST localhost:3107/api/admin/openings -H "x-admin-secret: $DEBATLE_ADMIN_SECRET" -d '{"day":1}'
// Pass "force": true to rewrite openers that already exist.

export const maxDuration = 120;

const Body = z.object({ day: z.number().int().min(1), force: z.boolean().optional() });

export async function POST(req: Request) {
  const secret = process.env.DEBATLE_ADMIN_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Body must be {day: number}" }, { status: 400 });
    if (store().kind !== "supabase") return Response.json({ error: "Supabase is not configured" }, { status: 503 });

    const result = await ensureOpenings(parsed.data.day, { force: parsed.data.force });
    if (result.status === "no motion") {
      return Response.json({ error: `No motion for day ${result.day}` }, { status: 404 });
    }
    if (result.status === "already done") {
      const motion = await store().getMotion(result.day);
      return Response.json({ day: result.day, status: result.status, ...motion!.aiOpening });
    }
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
