import { redirect } from "next/navigation";
import { after } from "next/server";
import GameScreen from "@/components/game/PlayClient";
import { msUntilReset } from "@/lib/day";
import { isArchiveDay, motionForDay, prepareAiSpeech, publicGame, toPublic } from "@/lib/game";
import { readPlayerId } from "@/lib/player";
import { store } from "@/lib/store";
import { adsEnabled } from "@/lib/ads";

// /play = today's debate; /play?day=N = an archive debate already started.
export default async function Play({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day: rawDay } = await searchParams;
  const day = rawDay ? Number(rawDay) : undefined;
  const motion = await motionForDay(day).catch(() => null);
  if (!motion) redirect(day ? "/archive" : "/");

  const playerId = await readPlayerId();
  const game = playerId ? await store().getGame(playerId, motion.id) : null;
  if (!game) redirect(day ? `/archive/${day}` : "/");
  // Safety net (e.g. a background write failed or the server restarted).
  after(() => prepareAiSpeech(game, motion));

  return (
    <GameScreen
      motion={toPublic(motion)}
      initialGame={publicGame(game)}
      resetsInMs={msUntilReset()}
      archiveDay={isArchiveDay(day) ? day : undefined}
      showAds={await adsEnabled()}
    />
  );
}
