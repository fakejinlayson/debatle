import "server-only";
import { ROUNDS, type Side } from "./config";
import type { RoundJudgement, SideScore } from "./types";

// DEBATLE_MOCK_AI=1: canned opponent + judge for UI work without API calls.
// Never enabled in production builds.

export const mockAI = () => process.env.DEBATLE_MOCK_AI === "1" && process.env.NODE_ENV !== "production";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LINES: Record<Side, string[]> = {
  for: [
    "Pizza is a democracy of toppings, and pineapple is the swing voter. Its acidity cuts the fat of cheese the way lemon lifts fish. Refusing it isn't tradition, it's fear of flavour.",
    "My opponent calls it 'wrong', but never says why. Wrong for whom? Sweet and salty is the logic of salted caramel and prosciutto with melon. They're defending a rule nobody wrote.",
    "This came down to one clash: rules versus taste. They gave us rules without reasons; we gave you reasons people actually eat by. Taste wins debates at dinner.",
  ],
  against: [
    "A pizza is a balance of dough, tomato and cheese. Pineapple floods it with water and sugar, turning crisp into soggy. Add whatever you like, but don't call the result better.",
    "They say acidity 'cuts the fat', but tomato already does that job. Pineapple doesn't fix a problem; it creates one: a wet base and a dessert where dinner should be.",
    "The key clash was what improves a pizza. Our side showed the mechanism: moisture and sugar wreck the base. Theirs offered vibes about 'swing voters'. Mechanism beats mood.",
  ],
};

export async function mockOpponent(aiSide: Side, round: number): Promise<string> {
  await sleep(900);
  return LINES[aiSide][round - 1];
}

function side(seed: number, line: string): SideScore {
  const n = (k: number, max: number) => Math.max(0, Math.min(max, Math.round(max * (0.62 + ((seed * k) % 23) / 100))));
  const s = { reasoning: n(7, 40), engagement: n(11, 30), rhetoric: n(13, 20), strategy: n(17, 10) };
  return {
    ...s,
    total: s.reasoning + s.engagement + s.rhetoric + s.strategy,
    bestLine: line,
    weakness: "Asserts more than it explains in the second half.",
    metaInstruction: false,
  };
}

export async function mockJudge(round: number, playerText: string, aiText: string): Promise<RoundJudgement> {
  await sleep(1400);
  const seed = playerText.length + round * 31;
  return {
    verdictLine: `Round ${round} (${ROUNDS[round - 1]}): a real clash, and the hall noticed.`,
    player: side(seed, playerText.slice(0, 80)),
    ai: side(seed + 5, aiText.slice(0, 80)),
    droppedPoints: [],
    openClashes: ["Does taste or tradition decide what improves a pizza?"],
  };
}
