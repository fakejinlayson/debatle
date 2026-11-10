import { notFound, redirect } from "next/navigation";
import TitleScreen from "@/components/TitleScreen";
import { dayNumber } from "@/lib/day";
import { motionForDay, publicGame, startingCrowd, toPublic } from "@/lib/game";
import { readPlayerId } from "@/lib/player";
import { store } from "@/lib/store";

// Pick a side for a past day. Starting the game (POST /api/game {day}) is
// where the free allowance / unlock is enforced.
export default async function ArchiveDayPage({ params }: { params: Promise<{ day: string }> }) {
  const day = Number((await params).day);
  if (!Number.isInteger(day) || day < 1) notFound();
  if (day >= dayNumber()) redirect("/");
  const motion = await motionForDay(day).catch(() => null);
  if (!motion) notFound();

  const playerId = await readPlayerId();
  const game = playerId ? await store().getGame(playerId, motion.id) : null;
  return (
    <TitleScreen
      motion={toPublic(motion)}
      game={game && publicGame(game)}
      startFor={game ? game.startFor : await startingCrowd(motion)}
      archiveDay={day}
    />
  );
}
