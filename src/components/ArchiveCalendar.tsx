"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ArchiveDay, ArchiveView } from "@/lib/archive";

// Month-grid archive (Krillion-style): every day shows its motion's emoji.
// With the unlock every past day opens; without it the calendar is a teaser:
// only the free "keep debating" days and days already started are open.

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const ym = (iso: string) => iso.slice(0, 7); // "2026-11"
const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00Z`)
    .toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    .toUpperCase();

function addMonths(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type Cell =
  | { kind: "blank" }
  | { kind: "empty"; dom: number }
  | { kind: "today"; dom: number; emoji: string; title: string }
  | { kind: "day"; dom: number; d: ArchiveDay; open: boolean };

export default function ArchiveCalendar({ view }: { view: ArchiveView }) {
  const { days, today, access } = view;
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const currentKey = ym(today?.date ?? days[0]?.date ?? new Date().toISOString());
  const firstKey = ym(days.at(-1)?.date ?? currentKey);
  const [month, setMonth] = useState(currentKey);

  const cells = useMemo<Cell[]>(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7; // Monday-first
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: Cell[] = Array.from({ length: lead }, () => ({ kind: "blank" }));
    for (let dom = 1; dom <= count; dom++) {
      const iso = `${month}-${String(dom).padStart(2, "0")}`;
      const d = byDate.get(iso);
      if (today && iso === today.date) out.push({ kind: "today", dom, emoji: today.emoji, title: today.title });
      else if (d)
        out.push({ kind: "day", dom, d, open: access.unlocked || access.freeDays.includes(d.day) || d.played !== null });
      else out.push({ kind: "empty", dom });
    }
    return out;
  }, [month, byDate, today, access]);

  return (
    <section className="panel p-3" aria-label="Archive calendar">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="px-2 font-display text-sm text-brass disabled:opacity-20"
          onClick={() => setMonth((k) => addMonths(k, -1))}
          disabled={month <= firstKey}
          aria-label="Previous month"
        >
          ◂
        </button>
        <p className="font-display text-xs tracking-[0.25em] text-parchment">{monthLabel(month)}</p>
        <button
          type="button"
          className="px-2 font-display text-sm text-brass disabled:opacity-20"
          onClick={() => setMonth((k) => addMonths(k, 1))}
          disabled={month >= currentKey}
          aria-label="Next month"
        >
          ▸
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="pb-1 font-display text-[0.55rem] tracking-widest text-muted">
            {w}
          </span>
        ))}
        {cells.map((c, i) => {
          if (c.kind === "blank") return <span key={i} />;
          if (c.kind === "empty")
            return (
              <span key={i} className="flex aspect-square items-start p-1 text-xs text-muted/30">
                {c.dom}
              </span>
            );
          if (c.kind === "today")
            return (
              <Link
                key={i}
                href="/"
                title={`Today: ${c.title}`}
                className="relative flex aspect-square flex-col items-center justify-center bg-oak outline outline-2 outline-brass"
              >
                <span className="absolute left-1 top-0.5 text-[0.65rem] leading-none text-brass">{c.dom}</span>
                <span className="text-xl leading-none sm:text-2xl">{c.emoji}</span>
                <span className="absolute bottom-0.5 font-display text-[0.4rem] tracking-widest text-brass">TODAY</span>
              </Link>
            );

          const { d, open } = c;
          const p = d.played;
          const href = p ? `/play?day=${d.day}` : open ? `/archive/${d.day}` : "#unlock";
          const status = p
            ? p.status === "finished"
              ? `${p.won ? "won" : "lost"}${p.finalScore !== null ? ` · ${p.finalScore}` : ""}`
              : "in progress"
            : open
              ? "play"
              : "locked";
          return (
            <Link
              key={i}
              href={href}
              title={`No. ${d.day}: ${d.title} (${status})`}
              aria-label={`Day ${d.day}, ${d.title}, ${status}`}
              className={`relative flex aspect-square flex-col items-center justify-center bg-oak-2 transition-transform hover:-translate-y-0.5 ${
                open ? "" : "opacity-35 grayscale"
              }`}
            >
              <span className="absolute left-1 top-0.5 text-[0.65rem] leading-none text-muted">{c.dom}</span>
              <span className="text-xl leading-none sm:text-2xl">{d.emoji}</span>
              {p?.status === "finished" && (
                <span className={`absolute inset-x-1 bottom-1 h-1 ${p.won ? "bg-brass" : "bg-muted/60"}`} />
              )}
              {p?.status === "in_progress" && <span className="absolute bottom-1 h-1.5 w-1.5 bg-parchment" />}
              {!open && <span className="absolute right-1 top-0.5 text-[0.55rem] leading-none text-muted">🔒</span>}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 font-display text-[0.5rem] tracking-[0.15em] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-1 w-3 bg-brass" /> WON
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1 w-3 bg-muted/60" /> LOST
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 bg-parchment" /> IN PROGRESS
        </span>
      </div>
    </section>
  );
}
