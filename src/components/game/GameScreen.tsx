"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Crowd from "@/components/Crowd";
import RoundCard, { SpeechCard } from "./RoundCard";
import Verdict from "./Verdict";
import Chatter from "./Chatter";
import ScrollHint from "./ScrollHint";
import AdSlot from "@/components/AdSlot";
import SwingBar from "./SwingBar";
import { ROUNDS, SPEECH_MAX_CHARS, TOTAL_ROUNDS, type Side } from "@/lib/config";
import { useSpeechInput } from "@/lib/useSpeechInput";
import type { GameState, PublicMotion, RoundRecord } from "@/lib/types";

type Phase = "write" | "thinking" | "judging" | "reveal" | "done";

const BRIEF = ["Make your case", "Hit back", "Seal it"] as const;
const JUDGING = ["The judge is deliberating…", "Order! Order!", "The hall is muttering…", "Weighing it up…"];
const REVEAL_TIMINGS = [0, 1200, 3200, 4800, 6400]; // ms at which each reveal step starts

const draftKey = (gameId: string, round: number) => `debatle:draft:${gameId}:${round}`;
const readDraft = (k: string) => {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
};
const writeDraft = (k: string, v: string) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {}
};

function Hud({ game, crowdFor, round }: { game: GameState; crowdFor: number; round: number }) {
  const sideCls = game.side === "for" ? "text-for" : "text-against";
  const mine = game.side === "for" ? crowdFor : 100 - crowdFor;
  return (
    <header className="flex items-center justify-between gap-3">
      <Link href="/" className="font-display text-lg font-bold tracking-wider text-brass">
        DEBATLE
      </Link>
      <span className="flex gap-1" aria-label={`Round ${Math.min(round, TOTAL_ROUNDS)} of ${TOTAL_ROUNDS}`}>
        {ROUNDS.map((r, i) => (
          <span
            key={r}
            className={`h-3 w-5 ${i < round - 1 ? "bg-brass" : i === round - 1 ? "bg-parchment" : "bg-oak-2"}`}
          />
        ))}
      </span>
      <span className={`whitespace-nowrap font-display text-xs tracking-wider ${sideCls}`}>
        {game.side.toUpperCase()} {Math.round(mine)}%
      </span>
    </header>
  );
}

function Composer({
  round,
  value,
  onChange,
  onSubmit,
  error,
}: {
  round: number;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
}) {
  const mic = useSpeechInput({ value, onChange, maxChars: SPEECH_MAX_CHARS });
  const left = SPEECH_MAX_CHARS - value.length;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => ref.current?.focus({ preventScroll: true }), [round]);

  function submit() {
    if (mic.listening) mic.stop();
    onSubmit();
  }

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
        <p className="whitespace-nowrap font-display text-xs tracking-[0.12em] text-brass sm:tracking-[0.25em]">
          ROUND {round} · {ROUNDS[round - 1].toUpperCase()}
        </p>
        <p className="whitespace-nowrap text-lg text-muted">{BRIEF[round - 1]}</p>
      </div>
      <label htmlFor="speech" className="sr-only">
        Your speech
      </label>
      <textarea
        id="speech"
        ref={ref}
        value={value}
        maxLength={SPEECH_MAX_CHARS}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && value.trim()) submit();
        }}
        placeholder={mic.supported ? "Type your argument, or tap the mic and speak it" : "Type your argument"}
        className={`w-full resize-none border-2 bg-ink p-3 text-xl leading-snug text-parchment outline-none placeholder:text-muted/60 focus:border-brass ${
          mic.listening ? "border-against" : "border-oak-2"
        }`}
      />
      <div className="flex items-center gap-3">
        {mic.supported && (
          <button
            type="button"
            onClick={mic.toggle}
            aria-pressed={mic.listening}
            aria-label={mic.listening ? "Stop speaking" : "Speak your argument"}
            className={`btn flex h-14 w-14 shrink-0 items-center justify-center ${
              mic.listening ? "anim-pulse bg-against text-ink" : "bg-oak-2 text-parchment"
            }`}
          >
            {mic.listening ? (
              <svg viewBox="0 0 8 8" className="h-5 w-5" shapeRendering="crispEdges" aria-hidden>
                <rect x="1" y="1" width="6" height="6" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 8 10" className="h-6 w-5" shapeRendering="crispEdges" aria-hidden>
                <path d="M3 0h2v1h1v4H5v1H3V5H2V1h1z M0 4h1v1h1v1h4V5h1V4h1v2H7v1H5v1h1v1H2V8h1V7H1V6H0z" fill="currentColor" />
              </svg>
            )}
          </button>
        )}
        <span className={`text-lg ${left < 30 ? "text-against" : "text-muted"}`} aria-live="polite">
          {mic.listening ? "Listening… " : ""}
          {left}
        </span>
        <button className="btn ml-auto bg-brass px-6 py-3 text-base text-ink" disabled={!value.trim()} onClick={submit}>
          Deliver
        </button>
      </div>
      {(mic.error || error) && <p className="text-lg text-against">{mic.error ?? error}</p>}
    </section>
  );
}

// Rendered client-only (see PlayClient) so drafts can be restored from
// localStorage on first render without a hydration mismatch.
export default function GameScreen({
  motion,
  initialGame,
  resetsInMs,
  archiveDay,
  showAds = false,
}: {
  motion: PublicMotion;
  initialGame: GameState;
  resetsInMs: number;
  /** Set when replaying a past day from the archive. */
  archiveDay?: number;
  /** False for players with the unlock (decided on the server). */
  showAds?: boolean;
}) {
  const [game, setGame] = useState(initialGame);
  const [phase, setPhase] = useState<Phase>(initialGame.status === "finished" ? "done" : "write");
  const [reveal, setReveal] = useState<{ record: RoundRecord; step: number } | null>(null);
  const [draft, setDraft] = useState(() => readDraft(draftKey(initialGame.id, initialGame.round)));
  const [error, setError] = useState<string | null>(null);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [speeches, setSpeeches] = useState<{ playerText: string; aiText: string } | null>(null);
  const timers = useRef<number[]>([]);
  const aiSide: Side = game.side === "for" ? "against" : "for";
  const round = Math.min(game.round, TOTAL_ROUNDS);
  const key = draftKey(game.id, game.round);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  useEffect(() => {
    if (phase !== "judging") return;
    const id = window.setInterval(() => setThinkingIdx((i) => (i + 1) % JUDGING.length), 2200);
    return () => window.clearInterval(id);
  }, [phase]);

  function updateDraft(v: string) {
    setDraft(v);
    writeDraft(key, v);
  }

  /** Submits the speech (or, on retry, re-judges the locked one) and streams progress. */
  async function deliver() {
    const text = draft.trim();
    if (!text && !speeches) return;
    setPhase(speeches ? "judging" : "thinking");
    setThinkingIdx(0);
    setError(null);
    try {
      const res = await fetch("/api/round", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: speeches?.playerText ?? text, day: archiveDay }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "The chamber didn't hear you. Try again.");
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (value) buf += value;
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg.type === "speeches") {
            // Both speeches are in: show them side by side while the judge works.
            writeDraft(key, "");
            setSpeeches({ playerText: msg.playerText, aiText: msg.aiText });
            setPhase("judging");
          } else if (msg.type === "result") {
            setDraft("");
            setSpeeches(null);
            startReveal(msg.record as RoundRecord, msg.game as GameState);
            return;
          } else if (msg.type === "error") {
            throw new Error(msg.error ?? "The chamber didn't hear you. Try again.");
          }
        }
        if (done) throw new Error("The chamber lost the thread. Try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The chamber didn't hear you. Try again.");
      // Once the AI's speech has been seen, the player's speech is locked: stay
      // on the judging screen and offer a retry instead of reopening the editor.
      setPhase((p) => (p === "judging" ? "judging" : "write"));
    }
  }

  function startReveal(record: RoundRecord, next: GameState) {
    setGame(next);
    setPhase("reveal");
    // Speeches are already on screen, so the reveal starts at the judge's verdict.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReveal({ record, step: reduce ? 4 : 1 });
    if (reduce) return;
    timers.current = REVEAL_TIMINGS.slice(2).map((t, i) =>
      window.setTimeout(() => setReveal((r) => r && { ...r, step: i + 2 }), t - REVEAL_TIMINGS[1]),
    );
  }

  function finishReveal() {
    timers.current.forEach(window.clearTimeout);
    if (reveal && reveal.step < 4) {
      setReveal({ ...reveal, step: 4 });
      return;
    }
    setReveal(null);
    setDraft(readDraft(draftKey(game.id, game.round)));
    setPhase(game.status === "finished" ? "done" : "write");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // The hall only swings once the reveal reaches the swing step.
  const prevCrowd = reveal ? (game.rounds.at(-2)?.crowdFor ?? game.startFor) : game.crowdFor;
  const crowdFor = reveal && reveal.step < 3 ? prevCrowd : game.crowdFor;
  const history = reveal ? game.rounds.slice(0, -1) : game.rounds;
  // The moment voters change sides (reveal step 3): drives the hall VFX.
  const swingDelta = reveal && reveal.step >= 3 ? game.crowdFor - prevCrowd : 0;
  const swinging = swingDelta !== 0;
  const gainer = swingDelta > 0 ? "FOR" : "AGAINST";
  const lastAi = history.at(-1);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-16 pt-4">
      <Hud game={game} crowdFor={crowdFor} round={phase === "done" ? TOTAL_ROUNDS + 1 : reveal ? reveal.record.round : game.round} />

      <section className="panel p-3 text-center">
        <p className="text-xl leading-tight">{motion.title}</p>
      </section>

      <section
        className={`panel mx-auto w-full max-w-md p-2 ${swinging ? "fx-shake" : ""}`}
        style={{ "--amp": `${Math.min(7, 2 + Math.abs(swingDelta) / 3)}px` } as React.CSSProperties}
      >
        <div className="relative">
          <Crowd forPct={crowdFor} />
          <Chatter active={phase === "judging" && !error} />
          {swinging && (
            <>
              <div
                key={`flash-${reveal?.record.round}`}
                className="fx-flash pointer-events-none absolute inset-0"
                style={{ background: swingDelta > 0 ? "var(--for)" : "var(--against)" }}
              />
              <span
                key={`float-${reveal?.record.round}`}
                className={`fx-float pointer-events-none absolute left-1/2 top-1/3 whitespace-nowrap font-display text-2xl font-bold tracking-widest [text-shadow:2px_2px_0_var(--ink)] ${
                  swingDelta > 0 ? "text-for" : "text-against"
                }`}
              >
                {swingDelta > 0 ? "◀" : ""} {Math.abs(swingDelta)} {gainer} {swingDelta < 0 ? "▶" : ""}
              </span>
            </>
          )}
        </div>
        <div className="mt-2">
          <SwingBar from={prevCrowd} to={crowdFor} animate={swinging} />
        </div>
      </section>

      {phase === "done" && <Verdict game={game} motion={motion} resetsInMs={resetsInMs} archiveDay={archiveDay} showAds={showAds} />}

      {phase === "write" && (
        <>
          {lastAi && <SpeechCard label="THEY SAID" side={aiSide} text={lastAi.aiText} />}
          <Composer round={round} value={draft} onChange={updateDraft} onSubmit={deliver} error={error} />
        </>
      )}

      {(phase === "thinking" || phase === "judging") && (
        <section className="flex flex-col gap-3">
          <p className="text-center font-display text-xs tracking-[0.25em] text-brass">
            ROUND {round} · {ROUNDS[round - 1].toUpperCase()}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SpeechCard label="YOU" side={game.side} text={speeches?.playerText ?? draft.trim()} />
            <SpeechCard label="THEM" side={aiSide} text={speeches?.aiText ?? ""} sealed={!speeches} />
          </div>
          {error ? (
            <>
              <p className="text-center text-lg text-against">{error}</p>
              <button className="btn bg-brass py-4 text-lg text-ink" onClick={deliver}>
                Try again
              </button>
            </>
          ) : (
            <p className="anim-blink text-center font-display text-sm tracking-[0.2em] text-brass" aria-live="polite">
              {phase === "thinking" ? "The opposition rises…" : JUDGING[thinkingIdx]}
            </p>
          )}
          {/* The judge's 5–20s deliberation: the least intrusive moment for an ad. */}
          {showAds && phase === "judging" && !error && <AdSlot placement="judging" className="mt-2" />}
        </section>
      )}

      {phase === "reveal" && reveal && (
        <section className="flex flex-col gap-4">
          <RoundCard record={reveal.record} playerSide={game.side} fromFor={prevCrowd} step={reveal.step} />
          <button id="reveal-next" className="btn scroll-mt-4 bg-brass py-4 text-lg text-ink" onClick={finishReveal}>
            {reveal.step < 4 ? "Skip" : game.status === "finished" ? "The verdict" : `Round ${reveal.record.round + 1}`}
          </button>
        </section>
      )}

      {history.length > 0 && (phase === "write" || phase === "done") && (
        <details className="group" open={phase === "done"}>
          <summary className="cursor-pointer list-none text-center font-display text-xs tracking-[0.25em] text-muted hover:text-parchment">
            <span className="group-open:hidden">▸ The debate so far</span>
            <span className="hidden group-open:inline">▾ The debate</span>
          </summary>
          <div className="mt-4 flex flex-col gap-6">
            {history.map((r, i) => (
              <RoundCard
                key={r.round}
                record={r}
                playerSide={game.side}
                fromFor={i === 0 ? game.startFor : history[i - 1].crowdFor}
              />
            ))}
          </div>
        </details>
      )}
      <ScrollHint targetId="reveal-next" active={phase === "reveal"} />
    </main>
  );
}
