"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// One Google AdSense display slot. Only rendered for players who aren't
// ad-free (the server decides; see adsEnabled in lib/ads.ts), so paying
// players never load the AdSense script at all.
//
// Env (public, safe in the browser):
//   NEXT_PUBLIC_ADSENSE_CLIENT  e.g. ca-pub-1234567890123456
//   NEXT_PUBLIC_ADSENSE_SLOT_VERDICT  ad unit id
// (No ad during the judging wait: AdSense doesn't allow ads on loading or
// transition screens.)
// Unset on the live site → renders nothing. In dev → a dashed placeholder
// showing where the ad goes. Space is reserved either way so nothing jumps.

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const SLOTS = {
  verdict: process.env.NEXT_PUBLIC_ADSENSE_SLOT_VERDICT,
} as const;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSlot({ placement, className }: { placement: keyof typeof SLOTS; className?: string }) {
  const slot = SLOTS[placement];
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT || !slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers and AdSense hiccups must never break the game.
    }
  }, [slot]);

  if (!CLIENT || !slot) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <div
        className={`flex min-h-[100px] items-center justify-center border-2 border-dashed border-oak-2 font-display text-[0.6rem] tracking-[0.25em] text-muted ${className ?? ""}`}
        aria-hidden
      >
        AD · {placement.toUpperCase()}
      </div>
    );
  }

  return (
    <div className={`min-h-[100px] w-full overflow-hidden ${className ?? ""}`}>
      <Script
        id="adsense"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
      />
      <p className="mb-1 text-center font-display text-[0.5rem] tracking-[0.25em] text-muted">ADVERTISEMENT</p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
