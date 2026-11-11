"use client";

import { useState } from "react";
import Link from "next/link";
import { UNLOCK_PRICE_CENTS } from "@/lib/config";
import type { ArchiveDay, ArchiveView } from "@/lib/archive";
import ArchiveCalendar from "./ArchiveCalendar";
import SiteLinks from "./SiteLinks";

const PRICE = `$${(UNLOCK_PRICE_CENTS / 100).toFixed(0)}`;

const NOTICES: Record<string, { text: string; good?: boolean }> = {
  unlocked: { text: "ARCHIVE UNLOCKED, ADS GONE. EVERY PAST DEBATE IS YOURS.", good: true },
  restored: { text: "WELCOME BACK. YOUR UNLOCK IS RESTORED.", good: true },
  pending: { text: "PAYMENT RECEIVED. YOUR UNLOCK WILL APPEAR IN A MOMENT.", good: true },
  "signed-in": { text: "SIGNED IN.", good: true },
  cancelled: { text: "CHECKOUT CANCELLED. NOTHING WAS CHARGED." },
  "auth-error": { text: "GOOGLE SIGN-IN DIDN'T WORK. TRY AGAIN." },
  "auth-unavailable": { text: "SIGN-IN ISN'T SET UP YET." },
  locked: { text: "THAT DAY IS IN THE FULL ARCHIVE. UNLOCK IT TO PLAY EVERY PAST DEBATE." },
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
    .toUpperCase();
}

function DayRow({ d, canStart }: { d: ArchiveDay; canStart: boolean }) {
  const p = d.played;
  const { label, cls, href } = p
    ? p.status === "finished"
      ? { label: `${p.won ? "WON" : "LOST"} · ${p.finalScore ?? "–"}`, cls: p.won ? "text-brass" : "text-muted", href: `/play?day=${d.day}` }
      : { label: "CONTINUE ▸", cls: "text-parchment", href: `/play?day=${d.day}` }
    : canStart
      ? { label: "PLAY ▸", cls: "text-brass", href: `/archive/${d.day}` }
      : { label: "LOCKED", cls: "text-muted", href: "#unlock" };

  return (
    <Link href={href} className="panel flex items-center gap-3 px-3 py-3 transition-transform hover:-translate-y-0.5">
      <span className="w-8 shrink-0 text-center text-2xl" aria-hidden>
        {d.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[0.55rem] tracking-[0.2em] text-muted">
          NO. {d.day} · {formatDate(d.date)}
        </span>
        <span className="block truncate text-lg leading-tight text-parchment">
          {d.title.replace(/^This House /i, "")}
        </span>
      </span>
      <span className={`shrink-0 font-display text-[0.6rem] tracking-[0.15em] ${cls}`}>{label}</span>
    </Link>
  );
}

function Paywall({ view, prominent }: { view: ArchiveView; prominent: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock/checkout", { method: "POST" });
      const data = await res.json();
      if (data.signIn) {
        // Full navigation on purpose: /auth/google is a route handler that redirects off-site to Google.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/auth/google?next=/archive";
        return;
      }
      if (data.unlocked) {
        window.location.reload();
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't open checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open checkout");
      setBusy(false);
    }
  }

  return (
    <section id="unlock" className={`panel px-4 py-5 text-center ${prominent ? "bg-oxblood" : ""}`}>
      <p className="font-display text-lg tracking-[0.2em] text-brass">THE CHAMBER STAYS OPEN</p>
      {view.user ? (
        <button className="btn mt-4 w-full bg-brass py-4 text-base text-ink" disabled={busy} onClick={buy}>
          {busy ? "…" : `Unlock the archive · ${PRICE}`}
        </button>
      ) : (
        <a href="/auth/google?next=/archive" className="btn mt-4 block w-full bg-brass py-4 text-base text-ink">
          Sign in with Google to unlock
        </a>
      )}
      <p className="mt-3 text-lg text-parchment/80">One time. Every past debate, forever. No ads.</p>
      {!view.user && (
        <p className="mt-1 text-base text-muted">
          Already unlocked?{" "}
          <a href="/auth/google?next=/archive" className="text-brass underline underline-offset-4">
            Sign in with Google to restore it
          </a>
          .
        </p>
      )}
      {error && <p className="mt-2 text-lg text-against">{error}</p>}
    </section>
  );
}

export default function ArchiveScreen({ view, notice }: { view: ArchiveView; notice: string | null }) {
  const { access } = view;
  const n = notice ? NOTICES[notice] : null;
  // "Keep debating": the free days, No. 1 first (like Krillion's "keep diving").
  const keep = view.days.filter((d) => access.freeDays.includes(d.day)).reverse();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pb-12 pt-5">
      <header className="flex items-end justify-between">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-wider text-brass [text-shadow:3px_3px_0_var(--oxblood)] sm:text-3xl"
        >
          DEBATLE
        </Link>
        <p className="font-display text-xs tracking-[0.25em] text-muted">ARCHIVE</p>
      </header>

      {n && (
        <p className={`panel px-4 py-3 text-center font-display text-[0.65rem] tracking-[0.15em] ${n.good ? "text-brass" : "text-parchment"}`}>
          {n.text}
        </p>
      )}

      {view.days.length === 0 ? (
        <p className="panel px-4 py-6 text-center text-xl text-muted">No past debates yet. Come back tomorrow.</p>
      ) : access.unlocked ? (
        <>
          <p className="text-center font-display text-[0.65rem] tracking-[0.2em] text-brass">★ ARCHIVE UNLOCKED</p>
          <ArchiveCalendar view={view} />
        </>
      ) : (
        <>
          {keep.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-center font-display text-sm tracking-[0.25em] text-brass">KEEP DEBATING</h2>
              <ul className="flex flex-col gap-3">
                {keep.map((d) => (
                  <li key={d.day}>
                    <DayRow d={d} canStart />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <h2 className="mt-2 text-center font-display text-sm tracking-[0.25em] text-muted">THE FULL ARCHIVE</h2>
          <ArchiveCalendar view={view} />
          <Paywall view={view} prominent={notice === "locked"} />
        </>
      )}

      {view.user && (
        <form action="/auth/signout" method="post" className="text-center text-base text-muted">
          Signed in{view.user.email ? ` as ${view.user.email}` : ""} ·{" "}
          <button type="submit" className="text-brass underline underline-offset-4">
            Sign out
          </button>
        </form>
      )}

      <Link href="/" className="text-center font-display text-[0.65rem] tracking-[0.2em] text-brass hover:underline">
        ◂ TODAY&apos;S DEBATE
      </Link>
      <SiteLinks />
    </main>
  );
}
