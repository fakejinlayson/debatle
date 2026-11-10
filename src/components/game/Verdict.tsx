"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { netSwing, roundEmoji, shareText, tierFor } from "@/lib/scoring";
import type { GameState, PublicMotion } from "@/lib/types";

interface Stats {
  games: number;
  forPct: number;
  winPct: number;
  avgScore: number;
}

function useCountdown(ms: number) {
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    const end = Date.now() + ms;
    const id = window.setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => window.clearInterval(id);
  }, [ms]);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Verdict({
  game,
  motion,
  resetsInMs,
  archiveDay,
}: {
  game: GameState;
  motion: PublicMotion;
  resetsInMs: number;
  archiveDay?: number;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(resetsInMs);
  const score = game.finalScore ?? 0;
  const net = netSwing(game.startFor, game.crowdFor, game.side);

  useEffect(() => {
    fetch(archiveDay ? `/api/stats?day=${archiveDay}` : "/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {});
  }, [archiveDay]);

  async function share() {
    const text = `${shareText(game, motion.dayNumber, motion.emoji, game.startFor)}\n${window.location.origin}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled the share sheet */
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className={`panel anim-stamp px-4 py-5 text-center ${game.won ? "bg-brass text-ink" : "bg-oak-2 text-parchment"}`}>
        <p className="font-display text-xs tracking-[0.3em] opacity-80">{game.won ? "YOU WIN · THE HOUSE" : "YOU LOSE · THE HOUSE"}</p>
        <p className="font-display text-3xl font-bold tracking-widest">{game.won ? "AGREES" : "DISAGREES"}</p>
        <p className="mt-2 text-xl opacity-90">
          {net >= 0 ? "+" : ""}
          {net} voters · {game.rounds.map(roundEmoji).join("")}
        </p>
      </div>

      <div className="panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-display text-[0.6rem] tracking-[0.2em] text-muted">YOUR SCORE</p>
          <p className="font-display text-4xl text-brass">{score}</p>
        </div>
        <p className="font-display text-xl tracking-widest text-parchment">{tierFor(score).toUpperCase()}</p>
      </div>

      <button className="btn bg-brass py-4 text-lg text-ink" onClick={share}>
        {copied ? "Copied!" : "Share result"}
      </button>

      {stats && stats.games > 0 && (
        <div className="panel grid grid-cols-3 gap-2 px-3 py-3 text-center">
          <div>
            <p className="font-display text-xl text-for">{stats.forPct}%</p>
            <p className="text-base text-muted">argued for</p>
          </div>
          <div>
            <p className="font-display text-xl text-parchment">{stats.winPct}%</p>
            <p className="text-base text-muted">beat the AI</p>
          </div>
          <div>
            <p className="font-display text-xl text-brass">{stats.avgScore}</p>
            <p className="text-base text-muted">avg score</p>
          </div>
        </div>
      )}

      {archiveDay ? (
        <Link href="/archive" className="text-center font-display text-sm tracking-[0.2em] text-brass hover:underline">
          ◂ BACK TO THE ARCHIVE
        </Link>
      ) : (
        <p className="text-center text-xl text-muted">
        Next motion in <span className="text-parchment">{countdown}</span>
      </p>
      )}
    </section>
  );
}
