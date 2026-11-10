"use client";

import type { CSSProperties } from "react";

// The FOR/AGAINST split bar. With `animate`, it slides from the old split to
// the new one with a shake (stronger for bigger swings) and a flash over the
// exact slice of voters that changed sides. Animations run once on mount of
// the classes, so re-rendering with the same props doesn't replay them.

export default function SwingBar({
  from,
  to,
  animate,
  className = "h-3",
}: {
  /** FOR share before the swing (0–100). */
  from: number;
  /** FOR share after the swing (0–100). */
  to: number;
  animate: boolean;
  className?: string;
}) {
  const delta = to - from;
  const moving = animate && delta !== 0;
  const amp = Math.min(7, 2 + Math.abs(delta) / 3);
  const vars = { "--amp": `${amp}px`, "--from": `${from}%`, "--to": `${to}%` } as CSSProperties;

  return (
    <div className={`relative w-full ${moving ? "fx-shake" : ""}`} style={vars} aria-hidden>
      <div className={`flex w-full overflow-hidden ${className}`}>
        <div className={`bg-for ${moving ? "fx-bar-move" : ""}`} style={{ width: `${to}%` }} />
        <div className="flex-1 bg-against" />
      </div>
      {moving && (
        <div
          className="fx-bar-flash pointer-events-none absolute inset-y-0 bg-parchment"
          style={{ left: `${Math.min(from, to)}%`, width: `${Math.abs(delta)}%` }}
        />
      )}
    </div>
  );
}
