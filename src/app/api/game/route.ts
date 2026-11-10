import { z } from "zod";
import { after } from "next/server";
import { motionForDay, prepareAiSpeech, startGame } from "@/lib/game";
import { getOrCreatePlayerId } from "@/lib/player";
import { currentUser } from "@/lib/auth";
import { errorResponse, publicGame } from "../_respond";

// Background AI speech writing runs after the response.
export const maxDuration = 120;

// `day` omitted = today; a past day = an archive game (free allowance / unlock).
const Body = z.object({ side: z.enum(["for", "against"]), day: z.number().int().min(1).optional() });

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Pick FOR or AGAINST" }, { status: 400 });
    const { side, day } = parsed.data;
    const playerId = await getOrCreatePlayerId();
    const user = await currentUser();
    const game = await startGame(playerId, side, { day, userId: user?.id ?? null });
    // Write the AI's opening while the player writes theirs (if not pre-written).
    after(async () => prepareAiSpeech(game, await motionForDay(day)));
    return Response.json({ game: publicGame(game) });
  } catch (err) {
    return errorResponse(err);
  }
}
