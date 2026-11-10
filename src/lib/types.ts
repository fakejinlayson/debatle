import type { Side } from "./config";

export interface Motion {
  id: string;
  dayNumber: number;
  date: string;
  /** Full motion text, e.g. "This House believes pineapple belongs on pizza". */
  title: string;
  emoji: string;
  /** Optional context shown under the motion. */
  info: string | null;
  /** Pre-generated round 1 AI speeches. Never sent to the browser. */
  aiOpening: Partial<Record<Side, string>>;
}

/** What the browser is allowed to see about a motion. */
export type PublicMotion = Omit<Motion, "aiOpening">;

export interface SideScore {
  reasoning: number;
  engagement: number;
  rhetoric: number;
  strategy: number;
  total: number;
  bestLine: string;
  weakness: string;
  metaInstruction: boolean;
}

export interface RoundJudgement {
  verdictLine: string;
  /** Which model produced this judgement (Haiku, or Opus on a tiebreak). */
  judgedBy?: string;
  player: SideScore;
  ai: SideScore;
  /** Points a side raised that the other side has not yet answered. */
  droppedPoints: { by: "player" | "ai"; point: string }[];
  openClashes: string[];
}

export interface RoundRecord {
  round: number;
  playerText: string;
  aiText: string;
  judgement: RoundJudgement;
  swing: number;
  crowdFor: number;
}

export interface GameState {
  id: string;
  motionId: string;
  side: Side;
  /** FOR share of the hall when this game began (today's player split at the time). */
  startFor: number;
  /** Next round to play (1-based); TOTAL_ROUNDS + 1 when finished. */
  round: number;
  crowdFor: number;
  rounds: RoundRecord[];
  status: "in_progress" | "finished";
  finalScore: number | null;
  won: boolean | null;
  /**
   * The AI's speech for an upcoming round, written in the background while the
   * player writes theirs. Server-only: publicGame() never includes it.
   */
  pendingAi?: PendingAi | null;
}

export interface PendingAi {
  round: number;
  /** null while it's still being written. */
  text: string | null;
  startedAt: number;
  /** Set once the player has submitted and seen the AI's speech: their speech is locked in. */
  playerText?: string;
}
