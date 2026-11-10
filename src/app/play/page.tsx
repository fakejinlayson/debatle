import { redirect } from "next/navigation";
import { after } from "next/server";
import GameScreen from "@/components/game/PlayClient";
import { msUntilReset } from "@/lib/day";
import { prepareAiSpeech, publicGame, todaysMotion, toPublic } from "@/lib/game";
import { readPlayerId } from "@/lib/player";
import { store } from "@/lib/store";

export default async function Play() {
  const motion = await todaysMotion();
  const playerId = await readPlayerId();
  const game = playerId ? await store().getGame(playerId, motion.id) : null;
  if (!game) redirect("/");
  // Safety net (e.g. a background write failed or the server restarted).
  after(() => prepareAiSpeech(game, motion));

  return <GameScreen motion={toPublic(motion)} initialGame={publicGame(game)} resetsInMs={msUntilReset()} />;
}
