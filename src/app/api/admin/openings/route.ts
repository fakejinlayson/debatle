import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { opponentSpeech } from "@/lib/opponent";
import { serverEnv } from "@/lib/config";
import { store } from "@/lib/store";
import { errorResponse } from "../../_respond";

// Pre-generates the round 1 AI openings for a scheduled motion, so every
// player faces the same opener and it costs nothing per game.
//   curl -X POST localhost:3000/api/admin/openings -H "x-admin-secret: $DEBATLE_ADMIN_SECRET" -d '{"day":1}'

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
    const { day, force } = parsed.data;

    const { supabaseUrl, supabaseServiceKey } = serverEnv();
    if (store().kind !== "supabase" || !supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: "Supabase is not configured" }, { status: 503 });
    }
    const motion = await store().getMotion(day);
    if (!motion) return Response.json({ error: `No motion for day ${day}` }, { status: 404 });

    const [forText, againstText] = await Promise.all(
      (["for", "against"] as const).map((side) =>
        !force && motion.aiOpening[side]
          ? motion.aiOpening[side]!
          : opponentSpeech({ motion, aiSide: side, round: 1, previous: [] }),
      ),
    );

    const db = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { error } = await db
      .from("motions")
      .update({ ai_opening_for: forText, ai_opening_against: againstText })
      .eq("id", motion.id);
    if (error) throw error;

    return Response.json({ day, for: forText, against: againstText });
  } catch (err) {
    return errorResponse(err);
  }
}
