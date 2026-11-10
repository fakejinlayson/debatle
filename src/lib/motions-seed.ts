import type { Motion } from "./types";
import { dateForDay } from "./day";

// Dev fallback content, used when Supabase isn't configured. Openings are left
// empty so the opponent writes them live in dev.
const SEED: Omit<Motion, "id" | "dayNumber" | "date">[] = [
  {
    title: "This House believes pineapple belongs on pizza",
    emoji: "🍍",
    info: null,
    aiOpening: {},
  },
  {
    title: "This House believes a hot dog is a sandwich",
    emoji: "🌭",
    info: null,
    aiOpening: {},
  },
  {
    title: "This House would ban reclining seats on planes",
    emoji: "✈️",
    info: null,
    aiOpening: {},
  },
  {
    title: "This House believes cereal is a soup",
    emoji: "🥣",
    info: null,
    aiOpening: {},
  },
  {
    title: "This House would rather fight one horse-sized duck than a hundred duck-sized horses",
    emoji: "🦆",
    info: null,
    aiOpening: {},
  },
  // Food arguments
  m("This House believes crunchy peanut butter beats smooth", "🥜"),
  m("This House would pour the milk in before the cereal", "🥛"),
  m("This House believes a tomato belongs in a fruit salad", "🍅"),
  m("This House believes it's fine to eat pizza with a knife and fork", "🍴"),
  m("This House prefers breakfast for dinner over dinner for breakfast", "🥞"),
  // Everyday life
  m("This House believes toilet paper should hang over, not under", "🧻"),
  m("This House believes the middle seat should get both armrests", "💺"),
  m("This House would ban the snooze button", "⏰"),
  m("This House would ban talking in lifts", "🛗"),
  m("This House would ban reply-all emails", "📧"),
  m("This House would make Monday part of the weekend", "📅"),
  m("This House believes naps should be compulsory at work", "💤"),
  m("This House believes socks with sandals are a fashion statement", "🧦"),
  m("This House regrets autocorrect", "📱"),
  // Philosophy, of a sort
  m("This House believes water is wet", "💧"),
  m("This House believes a straw has one hole, not two", "🥤"),
  m("This House believes a hot tub is just soup for people", "♨️"),
  m("This House believes Pluto is still a planet", "🪐"),
  m("This House believes napping is a sport", "😴"),
  // Animals
  m("This House believes cats are better than dogs", "🐈"),
  m("This House believes geese are the most dangerous animal in the park", "🪿"),
  m("This House believes pigeons deserve the same respect as eagles", "🐦"),
  m("This House would give every dog a vote", "🐕"),
  // Big ideas
  m("This House would paint the Moon", "🌕"),
  m("This House prefers a world where everyone speaks in rhyme", "🎭"),
  m("This House would rather have hands for feet than feet for hands", "🖐️"),
];

/** Shorthand for a seed motion. */
function m(title: string, emoji: string, info: string | null = null): Omit<Motion, "id" | "dayNumber" | "date"> {
  return { title, emoji, info, aiOpening: {} };
}

/**
 * Dev only: DEBATLE_MOTION="This House believes…" in .env.local replaces today's
 * motion.
 * Each distinct motion text gets its own id, so changing it starts a fresh game.
 */
function motionOverride(day: number): Motion | null {
  const title = process.env.DEBATLE_MOTION?.trim();
  if (!title) return null;
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return {
    id: `custom-${(hash >>> 0).toString(36)}`,
    dayNumber: day,
    date: dateForDay(day),
    title,
    emoji: "🎤",
    info: null,
    aiOpening: {},
  };
}

export function seedMotion(day: number): Motion {
  const custom = motionOverride(day);
  if (custom) return custom;
  const m = SEED[(day - 1) % SEED.length];
  return { ...m, id: `seed-${day}`, dayNumber: day, date: dateForDay(day) };
}
