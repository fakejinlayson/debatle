import { z } from "zod";
import { after } from "next/server";
import { prepareAiSpeech, startGame, todaysMotion } from "@/lib/game";
import { getOrCreatePlayerId } from "@/lib/player";
import { errorResponse, publicGame } from "../_respond";

// Background AI speech writing runs after the response.
export const maxDuration = 120;

const Body = z.object({ side: z.enum(["for", "against"]) });

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Pick FOR or AGAINST" }, { status: 400 });
    const playerId = await getOrCreatePlayerId();
    const game = await startGame(playerId, parsed.data.side);
    // Write the AI's opening while the player writes theirs.
    after(async () => prepareAiSpeech(game, await todaysMotion()));
    return Response.json({ game: publicGame(game) });
  } catch (err) {
    return errorResponse(err);
  }
}
