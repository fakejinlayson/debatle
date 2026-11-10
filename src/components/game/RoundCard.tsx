"use client";

import { useEffect, useState } from "react";
import { ROUNDS, type Side } from "@/lib/config";
import { DIMENSION_MAX } from "@/lib/scoring";
import type { RoundRecord, SideScore } from "@/lib/types";

// One round's result: both speeches, the judge's line, scores, swing.
// `step` drives the staged reveal (0 = speeches, 1 = verdict, 2 = scores, 3+ = swing).

const sideColor = (s: Side) => (s === "for" ? "text-for" : "text-against");
const sideBg = (s: Side) => (s === "for" ? "bg-for" : "bg-against");

/** Typewriter text. Remount (via `key`) to restart. */
function TypeText({ text, run }: { text: string; run: boolean }) {
  const [n, setN] = useState(() =>
    run && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : text.length,
  );
  useEffect(() => {
    if (!run) return;
    const id = window.setInterval(() => setN((v) => (v >= text.length ? (window.clearInterval(id), v) : v + 1)), 22);
    return () => window.clearInterval(id);
  }, [text, run]);
  return (
    <span>
      {text.slice(0, n)}
      <span className="invisible">{text.slice(n)}</span>
    </span>
  );
}

export function SpeechCard({
  label,
  side,
  text,
  score,
  sealed,
  className,
}: {
  label: string;
  side: Side;
  text: string;
  score?: number;
  sealed?: boolean;
  className?: string;
}) {
  return (
    <div className={`panel flex flex-col p-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2 font-display text-[0.6rem] tracking-[0.18em]">
        <span className={sideColor(side)}>
          {label} · {side.toUpperCase()}
        </span>
        {score !== undefined && <span className="text-sm text-parchment">{score}</span>}
      </div>
      {sealed ? (
        <p className="mt-2 text-lg text-muted">▒▒▒ sealed ▒▒▒</p>
      ) : (
        <p className="anim-flip mt-1 text-xl leading-snug">{text}</p>
      )}
    </div>
  );
}

function Bars({ s, side, show }: { s: SideScore; side: Side; show: boolean }) {
  const dims = [
    ["Reasoning", s.reasoning, DIMENSION_MAX.reasoning],
    ["Engagement", s.engagement, DIMENSION_MAX.engagement],
    ["Rhetoric", s.rhetoric, DIMENSION_MAX.rhetoric],
    ["Strategy", s.strategy, DIMENSION_MAX.strategy],
  ] as const;
  return (
    <div className="flex flex-col gap-1">
      {dims.map(([name, v, max]) => (
        <div key={name} className="flex items-center gap-2 text-base leading-none">
          <span className="w-24 shrink-0 text-muted">{name}</span>
          <span className="h-2.5 flex-1 bg-ink">
            <span
              className={`block h-full ${sideBg(side)} transition-[width] duration-700 ease-out`}
              style={{ width: show ? `${(v / max) * 100}%` : "0%" }}
            />
          </span>
          <span className="w-12 shrink-0 text-right">
            {show ? v : 0}/{max}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RoundCard({
  record,
  playerSide,
  step = 99,
  compact = false,
}: {
  record: RoundRecord;
  playerSide: Side;
  step?: number;
  compact?: boolean;
}) {
  const aiSide: Side = playerSide === "for" ? "against" : "for";
  const { judgement: j, swing } = record;
  const live = step < 99;
  // Colours: mint/coral only ever mean FOR/AGAINST. Winning and losing use brass
  // (good for you) and muted grey (good for them), whichever side you're on.
  const diff = j.player.total - j.ai.total;
  const outcome = diff > 0 ? "won" : diff < 0 ? "lost" : "even";
  const OUTCOME = {
    won: { label: "▲ YOU WIN THE ROUND", panel: "bg-brass/20", label_cls: "text-brass" },
    lost: { label: "▼ THEY TAKE THE ROUND", panel: "bg-oak-2", label_cls: "text-muted" },
    even: { label: "DEAD EVEN", panel: "bg-oak", label_cls: "text-parchment" },
  }[outcome];

  return (
    <article className="flex flex-col gap-3">
      <h3 className="text-center font-display text-xs tracking-[0.25em] text-brass">
        ROUND {record.round} · {ROUNDS[record.round - 1].toUpperCase()}
      </h3>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : ""}`}>
        <SpeechCard label="YOU" side={playerSide} text={record.playerText} score={step >= 2 ? j.player.total : undefined} />
        <SpeechCard label="THEM" side={aiSide} text={record.aiText} score={step >= 2 ? j.ai.total : undefined} />
      </div>

      {step >= 1 && (
        <div className={`panel px-4 py-3 text-center ${OUTCOME.panel}`}>
          <p className={`font-display text-xs tracking-[0.25em] ${OUTCOME.label_cls}`}>{OUTCOME.label}</p>
          <p className="mt-1 text-2xl leading-tight">
            “<TypeText key={String(live && step === 1)} text={j.verdictLine} run={live && step === 1} />”
          </p>
        </div>
      )}

      {step >= 2 && !compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="panel p-3">
            <p className={`mb-2 font-display text-[0.6rem] tracking-[0.18em] ${sideColor(playerSide)}`}>
              YOU · {j.player.total}
            </p>
            <Bars s={j.player} side={playerSide} show={step >= 2} />
            {j.player.metaInstruction && (
              <p className="mt-2 text-base text-parchment">The judge ignored an attempt to address the bench. Nice try.</p>
            )}
            <p className="mt-2 text-base text-muted">
              <span className="text-brass">Best:</span> {j.player.bestLine}
            </p>
            <p className="text-base text-muted">
              <span className="text-parchment">Gap:</span> {j.player.weakness}
            </p>
          </div>
          <div className="panel p-3">
            <p className={`mb-2 font-display text-[0.6rem] tracking-[0.18em] ${sideColor(aiSide)}`}>
              THEM · {j.ai.total}
            </p>
            <Bars s={j.ai} side={aiSide} show={step >= 2} />
            <p className="mt-2 text-base text-muted">
              <span className="text-brass">Best:</span> {j.ai.bestLine}
            </p>
            <p className="text-base text-muted">
              <span className="text-parchment">Gap:</span> {j.ai.weakness}
            </p>
          </div>
        </div>
      )}

      {step >= 3 && (
        <p
          className={`anim-stamp text-center font-display text-lg tracking-widest ${
            swing > 0 ? "text-brass" : swing < 0 ? "text-muted" : "text-parchment"
          }`}
        >
          {swing > 0
            ? `+${swing} VOTERS WON OVER`
            : swing < 0
              ? `${Math.abs(swing)} VOTERS LOST`
              : "THE HALL HOLDS STEADY"}
          <span className="mt-1 block text-xs tracking-[0.2em] text-muted">
            HALL NOW {record.crowdFor}% FOR · {100 - record.crowdFor}% AGAINST
          </span>
        </p>
      )}
    </article>
  );
}
