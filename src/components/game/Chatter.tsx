"use client";

import { useEffect, useState } from "react";

// Speech bubbles popping up over the audience while the judge deliberates, so
// the wait feels alive. Purely cosmetic.

const WORDS = [
  "Interesting…",
  "Intriguing",
  "Hmm",
  "Ooh",
  "Good point",
  "Really?",
  "Hear, hear!",
  "Fair",
  "Bold",
  "Huh",
  "Nah",
  "Oof",
  "Go on…",
  "Spicy",
  "Shh!",
  "True",
];

interface Bubble {
  id: number;
  word: string;
  x: number; // % across the hall
  y: number; // % down the hall
  flip: boolean; // tail on the right instead of the left
}

const MAX_BUBBLES = 4;
const EVERY_MS = 700;
const LIFE_MS = 1700;

export default function Chatter({ active }: { active: boolean }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    if (!active) return;
    let id = 0;
    let lastWord = "";
    const timers: number[] = [];
    const spawn = () => {
      let word = WORDS[Math.floor(Math.random() * WORDS.length)];
      if (word === lastWord) word = WORDS[(WORDS.indexOf(word) + 1) % WORDS.length];
      lastWord = word;
      const x = 6 + Math.random() * 74;
      const b: Bubble = { id: ++id, word, x, y: 22 + Math.random() * 50, flip: x > 55 };
      setBubbles((cur) => [...cur.slice(-(MAX_BUBBLES - 1)), b]);
      timers.push(window.setTimeout(() => setBubbles((cur) => cur.filter((c) => c.id !== b.id)), LIFE_MS));
    };
    timers.push(window.setTimeout(spawn, 150));
    const interval = window.setInterval(spawn, EVERY_MS);
    return () => {
      window.clearInterval(interval);
      timers.forEach(window.clearTimeout);
      setBubbles([]);
    };
  }, [active]);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {bubbles.map((b) => (
        <span
          key={b.id}
          className={`bubble anim-bubble absolute whitespace-nowrap ${b.flip ? "bubble-flip" : ""}`}
          style={{ left: `${b.x}%`, top: `${b.y}%` }}
        >
          {b.word}
        </span>
      ))}
    </div>
  );
}
