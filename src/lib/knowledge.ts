import { ROUNDS } from "./config";

// Who had heard what, round by round. Speeches within a round are written at
// the same time, so in round N each side has heard the other's speeches from
// rounds 1..N-1 only. A point made in round K can fairly be called "ignored"
// only if the other side has since spoken in a round after K (i.e. K <= N-2
// when judging or writing round N).

const name = (r: number) => `round ${r} (${ROUNDS[r - 1]})`;
const list = (rs: number[]) => rs.map(name).join(" and ");
const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/** Rounds whose points the other side has already had a chance to answer, as of round `round`. */
export const answerableRounds = (round: number) => range(1, round - 2);

/** Briefing for the opponent, in second person and plain words. */
export function opponentKnowledge(round: number): string {
  if (round === 1) {
    return "This is round 1. You haven't heard anything from the other person yet, and they haven't heard you. Don't refer to anything they've said.";
  }
  const heard = range(1, round - 1);
  const answerable = answerableRounds(round);
  const last = round - 1;
  return [
    `This is ${name(round)}. You've heard their ${list(heard)}.`,
    `They're writing their ${name(round)} speech right now, at the same time as you, and they have NOT heard your ${name(last)} speech yet.`,
    answerable.length
      ? `They've only had a chance to answer what you said in ${list(answerable)}. If they ignored something from that, you can say so. Never say they ignored, skipped or dodged anything from your ${name(last)} speech. They haven't heard it.`
      : `They haven't had any chance to answer anything you've said yet, so never say they ignored, skipped or dodged a point.`,
  ].join(" ");
}

/** Briefing for the judge about the round being judged. */
export function judgeKnowledge(round: number): string {
  if (round === 1) {
    return "When writing these round 1 speeches, neither side had heard anything from the other.";
  }
  const heard = range(1, round - 1);
  const fairClaims = answerableRounds(round);
  return [
    `When writing these ${name(round)} speeches, each side had heard the other's ${list(heard)} speeches, but NOT the other's ${name(round)} speech.`,
    `So in this round each side could answer anything the other said in ${list(heard)}. An important point from those rounds that a side leaves unanswered in this round now counts as dropped. Points made in this round can't be dropped yet.`,
    fairClaims.length
      ? `Check any claim that the other side "ignored", "skipped" or "dodged" something: their earlier speeches could only answer points made before them, so such a claim is fair only for points from ${list(fairClaims)}. Claiming they ignored a point from ${name(round - 1)} is false, because they hadn't heard it yet.`
      : `Neither side had any earlier chance to answer the other, so any claim in this round that the other side "ignored", "skipped" or "dodged" a point is false.`,
    `A false "they ignored it" claim earns no credit and counts against that speech's reasoning.`,
  ].join(" ");
}
