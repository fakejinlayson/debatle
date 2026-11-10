"use client";

import dynamic from "next/dynamic";

// The game screen reads localStorage and matchMedia during first render, so it
// is rendered on the client only.
const PlayClient = dynamic(() => import("./GameScreen"), {
  ssr: false,
  loading: () => (
    <p className="anim-blink pt-24 text-center font-display text-sm tracking-[0.2em] text-brass">ORDER! ORDER!</p>
  ),
});

export default PlayClient;
