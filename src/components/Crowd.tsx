"use client";

import { useEffect, useRef } from "react";

// The hall: 100 pixel voters on tiered benches, FOR filling from the left and
// AGAINST from the right. When `forPct` changes, seats flip one by one with a
// flash, so a swing reads as a wave across the room.

const COLS = 20;
const ROWS = 5;
const SEAT_W = 8; // art pixels
const ROW_H = 11;
const PAD_X = 6;
const WALL_H = 18;
const W = COLS * SEAT_W + PAD_X * 2 + SEAT_W / 2;
const H = WALL_H + ROWS * ROW_H + 6;

const C = {
  wall: "#2a1a17",
  wallLine: "#3b2620",
  rail: "#d9a441",
  railShadow: "#8a6a2e",
  bench: "#4a2e24",
  benchTop: "#6b4330",
  floor: "#1d1210",
  for: ["#3fe0b0", "#17785d"],
  against: ["#ff5d73", "#8f2236"],
  flash: "#fff4d6",
  skins: ["#f1c9a5", "#d9a074", "#a8704a", "#7a4a2c", "#f5d7b8"],
  hair: ["#2b1a12", "#5a3a22", "#c9a24b", "#1a1a1a", "#8a3b22", "#d9d2c5"],
};

interface Seat {
  x: number;
  y: number;
  skin: string;
  hair: string;
  order: number; // fill order, left → right with a jagged edge
  phase: number;
  isFor: boolean;
  flashUntil: number;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSeats(seed: number): Seat[] {
  const rnd = mulberry32(seed);
  const seats: Seat[] = [];
  for (let r = 0; r < ROWS; r++) {
    // One nudge per row (not per seat): the FOR/AGAINST boundary is staggered
    // from row to row, but within a row colours never interleave.
    const rowJitter = (rnd() - 0.5) * 2.2;
    for (let c = 0; c < COLS; c++) {
      seats.push({
        x: PAD_X + c * SEAT_W + (r % 2 ? SEAT_W / 2 : 0),
        y: WALL_H + r * ROW_H,
        skin: C.skins[Math.floor(rnd() * C.skins.length)],
        hair: C.hair[Math.floor(rnd() * C.hair.length)],
        order: c + rowJitter + r * 0.001,
        phase: rnd() * Math.PI * 2,
        isFor: false,
        flashUntil: 0,
      });
    }
  }
  seats
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((s, i) => (s.order = i));
  return seats;
}

export default function Crowd({ forPct, seed = 7, className }: { forPct: number; seed?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seatsRef = useRef<Seat[] | null>(null);
  const targetRef = useRef(forPct);

  // Initial assignment (no animation) and later changes (staggered flips).
  useEffect(() => {
    const first = !seatsRef.current;
    const seats = (seatsRef.current ??= buildSeats(seed));
    const target = Math.round(forPct);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const changing = seats.filter((s) => (s.order < target) !== s.isFor);
    // Flip from the boundary outward so it reads as a wave.
    changing.sort((a, b) => (target > targetRef.current ? a.order - b.order : b.order - a.order));
    changing.forEach((s, i) => {
      const delay = first || reduce ? 0 : i * 70;
      window.setTimeout(() => {
        s.isFor = s.order < target;
        s.flashUntil = first || reduce ? 0 : performance.now() + 140;
      }, delay);
    });
    targetRef.current = target;
  }, [forPct, seed]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const px = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    const draw = (t: number) => {
      const seats = seatsRef.current;
      ctx.clearRect(0, 0, W, H);
      // back wall panelling + brass rail
      px(0, 0, W, WALL_H, C.wall);
      for (let x = 4; x < W; x += 14) px(x, 2, 1, WALL_H - 6, C.wallLine);
      px(0, WALL_H - 4, W, 1, C.rail);
      px(0, WALL_H - 3, W, 1, C.railShadow);
      px(0, WALL_H, W, H - WALL_H, C.floor);

      for (let r = 0; r < ROWS; r++) {
        const y = WALL_H + r * ROW_H;
        if (seats) {
          for (const s of seats.filter((q) => q.y === y)) {
            const bob = reduce ? 0 : Math.sin(t / 420 + s.phase) > 0.92 ? -1 : 0;
            const flash = s.flashUntil > t;
            const [body, shade] = s.isFor ? C.for : C.against;
            const bx = s.x + 1;
            const by = y + 3 + bob;
            // head
            px(bx + 1, by, 4, 3, s.skin);
            px(bx + 1, by, 4, 1, s.hair);
            // torso
            px(bx, by + 3, 6, 4, flash ? C.flash : body);
            px(bx + 4, by + 3, 2, 4, flash ? C.flash : shade);
          }
        }
        // bench in front of the row
        px(0, y + 8, W, 1, C.benchTop);
        px(0, y + 9, W, 2, C.bench);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className={`pixelated block w-full ${className ?? ""}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      role="img"
      aria-label={`The hall: ${Math.round(forPct)}% for, ${100 - Math.round(forPct)}% against`}
    />
  );
}
