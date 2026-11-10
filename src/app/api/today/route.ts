import { todaysMotion, toPublic } from "@/lib/game";
import { msUntilReset } from "@/lib/day";
import { readPlayerId } from "@/lib/player";
import { store } from "@/lib/store";
import { errorResponse, publicGame } from "../_respond";

export async function GET() {
  try {
    const motion = await todaysMotion();
    const playerId = await readPlayerId();
    const game = playerId ? await store().getGame(playerId, motion.id) : null;
    return Response.json({
      motion: toPublic(motion),
      game: game && publicGame(game),
      resetsInMs: msUntilReset(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
