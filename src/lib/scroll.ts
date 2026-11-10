"use client";

// Our own smooth scroll, frame by frame. Browser-native smooth scrolling
// (scrollTo/scrollIntoView with behavior "smooth") behaves differently across
// browsers and older iOS versions and can silently stall; this always runs,
// respects reduced motion, and stops the moment the player touches or scrolls.

let active: (() => void) | null = null;

export function smoothScrollTo(top: number, durationMs = 450): void {
  active?.(); // cancel any scroll already in flight
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const target = Math.max(0, Math.min(top, max));
  const start = window.scrollY;
  const distance = target - start;
  if (Math.abs(distance) < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, target);
    return;
  }

  let frame = 0;
  const t0 = performance.now();
  const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out cubic
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("wheel", stop);
    if (active === stop) active = null;
  };
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / durationMs);
    window.scrollTo(0, start + distance * ease(t));
    if (t < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("wheel", stop, { passive: true });
  active = stop;
  frame = requestAnimationFrame(step);
}

/** Scroll so `el` sits centred (or near the top with `align: "start"`). */
export function scrollElementIntoView(el: HTMLElement, align: "center" | "start" = "center"): void {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const offset = align === "start" ? 16 : Math.max(16, (vh - Math.min(r.height, vh - 32)) / 2);
  smoothScrollTo(window.scrollY + r.top - offset);
}
