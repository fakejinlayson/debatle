import "server-only";
import { currentUser } from "./auth";
import { dayNumber } from "./day";
import { archiveAccess, todaysMotion, type ArchiveAccess } from "./game";
import { readPlayerId } from "./player";
import { store } from "./store";

export interface ArchiveDay {
  day: number;
  date: string;
  title: string;
  emoji: string;
  /** This player's game on that day, if any. */
  played: { status: "in_progress" | "finished"; side: "for" | "against"; finalScore: number | null; won: boolean | null } | null;
}

export interface ArchiveView {
  today: { day: number; date: string; emoji: string; title: string } | null;
  /** Past days, newest first. */
  days: ArchiveDay[];
  access: ArchiveAccess;
  user: { email: string | null } | null;
}

/** Past days (newest first) with this player's progress, today's cell, and archive access. */
export async function archiveList(): Promise<ArchiveView> {
  const today = dayNumber();
  const [playerId, user, todayMotion] = await Promise.all([
    readPlayerId(),
    currentUser(),
    todaysMotion().catch(() => null),
  ]);
  const motions = today > 1 ? await store().listMotions(today - 1) : [];
  const [games, access] = await Promise.all([
    playerId ? store().playerGames(playerId, motions.map((m) => m.id)) : Promise.resolve([]),
    archiveAccess(user?.id ?? null),
  ]);
  const byMotion = new Map(games.map((g) => [g.motionId, g]));
  return {
    today: todayMotion
      ? { day: today, date: todayMotion.date, emoji: todayMotion.emoji, title: todayMotion.title }
      : null,
    access,
    user: user ? { email: user.email } : null,
    days: motions.map((m) => {
      const g = byMotion.get(m.id);
      return {
        day: m.dayNumber,
        date: m.date,
        title: m.title,
        emoji: m.emoji,
        played: g ? { status: g.status, side: g.side, finalScore: g.finalScore, won: g.won } : null,
      };
    }),
  };
}
