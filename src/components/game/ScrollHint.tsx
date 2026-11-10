"use client";

import { useEffect, useState } from "react";
import { scrollElementIntoView } from "@/lib/scroll";

// A small pinned "▼ SCROLL" button shown while `targetId` is below the fold.
// Tapping it scrolls there; it disappears once the target is on screen.
// Backup for the auto-follow in RoundCard (e.g. after the player scrolls up).

export default function ScrollHint({ targetId, active }: { targetId: string; active: boolean }) {
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    if (!active) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setOffscreen(!entry.isIntersecting && entry.boundingClientRect.top > 0),
      { rootMargin: "0px 0px -24px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetId, active]);

  if (!active || !offscreen) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById(targetId);
          if (el) scrollElementIntoView(el);
        }}
        className="btn anim-bob pointer-events-auto bg-brass px-4 py-2 text-[0.65rem] text-ink"
        aria-label="Scroll down"
      >
        ▼ Scroll
      </button>
    </div>
  );
}
