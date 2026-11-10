import TitleScreen from "@/components/TitleScreen";
import { publicGame, startingCrowd, todaysMotion, toPublic } from "@/lib/game";
import { readPlayerId } from "@/lib/player";
import { store } from "@/lib/store";

export default async function Home() {
  const motion = await todaysMotion();
  const playerId = await readPlayerId();
  const game = playerId ? await store().getGame(playerId, motion.id) : null;
  return (
    <TitleScreen
      motion={toPublic(motion)}
      game={game && publicGame(game)}
      startFor={game ? game.startFor : await startingCrowd(motion)}
    />
  );
}
