"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Crowd from "./Crowd";
import type { Side } from "@/lib/config";
import type { GameState, PublicMotion } from "@/lib/types";

const PREFIX = /^(this house (?:believes(?: that)?|would(?: rather)?|supports|opposes|regrets|prefers))\s+(.*)$/i;

function splitMotion(title: string) {
  const m = title.match(PREFIX);
  return m ? { lead: m[1], body: m[2] } : { lead: "This House", body: title };
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
    .toUpperCase();
}

export default function TitleScreen({
  motion,
  game,
  archiveDay,
  startFor,
}: {
  motion: PublicMotion;
  game: GameState | null;
  /** Set when replaying a past day from the archive. */
  archiveDay?: number;
  /** Where the hall stands: today's player split (or this game's current crowd). */
  startFor: number;
}) {
  const router = useRouter();
  const playHref = archiveDay ? `/play?day=${archiveDay}` : "/play";
  const [busy, setBusy] = useState<Side | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { lead, body } = splitMotion(motion.title);
  const forPct = game?.crowdFor ?? startFor;

  async function pick(side: Side) {
    setBusy(side);
    setError(null);
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ side, day: archiveDay }),
      });
      const data = await res.json();
      if (res.status === 402) {
        router.push("/archive?locked=1");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Couldn't start the debate");
      router.push(playHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the debate");
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 pb-10 pt-5">
      <header className="flex items-end justify-between">
        <h1 className="font-display text-2xl font-bold tracking-wider text-brass [text-shadow:3px_3px_0_var(--oxblood)] sm:text-3xl">
          DEBATLE
        </h1>
        <p className="whitespace-nowrap text-lg leading-none text-muted">
          {archiveDay ? "ARCHIVE · " : ""}NO. {motion.dayNumber} · {formatDate(motion.date)}
        </p>
      </header>

      <section className="panel relative px-5 pb-5 pt-5 text-center">
        <p className="font-display text-xs uppercase tracking-[0.25em] text-brass">{lead}</p>
        <h2 className="mt-1 text-[2rem] leading-[1.05] text-parchment">{body}</h2>
        {motion.info && <p className="mt-2 text-lg text-muted">{motion.info}</p>}
      </section>

      <section className="panel overflow-hidden p-2">
        <Crowd forPct={forPct} />
        <div className="mt-2 flex h-4 w-full overflow-hidden" aria-hidden>
          <div className="bg-for transition-[width] duration-700" style={{ width: `${forPct}%` }} />
          <div className="flex-1 bg-against" />
        </div>
        <div className="mt-1 flex justify-between font-display text-xs tracking-wider">
          <span className="text-for">{Math.round(forPct)}% FOR</span>
          <span className="text-against">{100 - Math.round(forPct)}% AGAINST</span>
        </div>
      </section>

      {game ? (
        <button className="btn bg-brass py-4 text-lg text-ink" onClick={() => router.push(playHref)}>
          {game.status === "finished" ? "See the verdict" : `Continue · round ${game.round}`}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            className="btn bg-for py-4 text-base text-ink"
            disabled={busy !== null}
            onClick={() => pick("for")}
          >
            {busy === "for" ? "…" : "▲ Argue for"}
          </button>
          <button
            className="btn bg-against py-4 text-base text-ink"
            disabled={busy !== null}
            onClick={() => pick("against")}
          >
            {busy === "against" ? "…" : "▼ Argue against"}
          </button>
        </div>
      )}

      {error && <p className="text-center text-lg text-against">{error}</p>}

      <p className="text-center font-display text-[0.6rem] tracking-[0.12em] text-muted sm:tracking-[0.2em]">
        3 ROUNDS · 300 CHARACTERS · WIN THE ROOM
      </p>
      <Link
        href="/archive"
        className="mx-auto font-display text-[0.65rem] tracking-[0.2em] text-brass underline-offset-4 hover:underline"
      >
        {archiveDay ? "◂ BACK TO THE ARCHIVE" : "PAST DEBATES · ARCHIVE ▸"}
      </Link>
      <Link href="/privacy" className="mx-auto text-base text-muted hover:underline">
        Privacy
      </Link>
    </main>
  );
}
