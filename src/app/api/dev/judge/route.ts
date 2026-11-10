import { z } from "zod";
import { judgeRound, judgeWithTiebreak } from "@/lib/judge";
import { opponentSpeech } from "@/lib/opponent";
import { errorResponse } from "../../_respond";
import type { Motion } from "@/lib/types";
import type { CallUsage } from "@/lib/claude";

// Dev-only calibration tool: judge (or have the opponent write) an arbitrary
// speech pair outside a real game. Used for bias tests and the Phase 2 eval.
// Disabled in production.

export const maxDuration = 120;

const Prev = z.object({ round: z.number(), playerText: z.string(), aiText: z.string() });
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("judge"),
    motion: z.string(),
    playerSide: z.enum(["for", "against"]),
    round: z.number().int().min(1).max(3),
    playerText: z.string(),
    aiText: z.string(),
    previous: z.array(Prev).default([]),
    model: z.string().optional(),
  }),
  z.object({
    action: z.literal("speak"),
    motion: z.string(),
    side: z.enum(["for", "against"]),
    round: z.number().int().min(1).max(3),
    previous: z.array(Prev).default([]),
    model: z.string().optional(),
  }),
]);

const devMotion = (title: string): Motion => ({
  id: "dev",
  dayNumber: 1,
  date: "2026-01-01",
  title,
  emoji: "🎤",
  info: null,
  aiOpening: {},
});

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "speak") {
      let usage: CallUsage | null = null;
      const text = await opponentSpeech({
        motion: devMotion(b.motion),
        aiSide: b.side,
        round: b.round,
        previous: b.previous,
        model: b.model,
        onUsage: (u) => (usage = u),
      });
      return Response.json({ text, usage });
    }
    const previous = b.previous.map((p) => ({
      ...p,
      judgement: { verdictLine: "", player: null!, ai: null!, droppedPoints: [], openClashes: [] },
      swing: 0,
      crowdFor: 50,
    }));
    let usage: CallUsage | null = null;
    // model "production" runs the real Haiku-then-Opus-tiebreak path.
    const judge = b.model === "production" ? judgeWithTiebreak : judgeRound;
    const judgement = await judge({
      ...(b.model && b.model !== "production" ? { model: b.model } : {}),
      onUsage: (u) => (usage = u),
      motion: devMotion(b.motion),
      playerSide: b.playerSide,
      round: b.round,
      playerText: b.playerText,
      aiText: b.aiText,
      previous,
    });
    return Response.json({ judgement, usage });
  } catch (err) {
    return errorResponse(err);
  }
}
