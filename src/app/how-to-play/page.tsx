import type { Metadata } from "next";
import InfoPage, { Section } from "@/components/InfoPage";
import { DIMENSION_MAX, TIERS } from "@/lib/scoring";
import { SPEECH_MAX_CHARS } from "@/lib/config";

export const metadata: Metadata = {
  title: "How to play · Debatle",
  description:
    "How Debatle works: pick a side, argue a silly motion against an AI over three rounds, and see how an AI judge scores every speech.",
};

const DIMENSIONS = [
  {
    name: "Reasoning",
    max: DIMENSION_MAX.reasoning,
    text: "Does each point have a claim, a reason it's true, and a reason it matters? Explained examples count. Bare assertions and made-up statistics don't.",
  },
  {
    name: "Engagement",
    max: DIMENSION_MAX.engagement,
    text: "Do you answer what the other side said in earlier rounds, especially their strongest point? Taking on their best argument beats picking off a weak one.",
  },
  {
    name: "Rhetoric",
    max: DIMENSION_MAX.rhetoric,
    text: "Would it land if you said it out loud? Vivid examples, good framing and jokes count when they make the argument hit harder.",
  },
  {
    name: "Strategy",
    max: DIMENSION_MAX.strategy,
    text: "Do you pick the fight that decides the debate and explain why your side wins it?",
  },
];

export default function HowToPlayPage() {
  return (
    <InfoPage label="HOW TO PLAY">
      <p className="text-xl leading-snug text-parchment">
        Every day Debatle posts one ridiculous motion, like &ldquo;This House believes a hot dog is a
        sandwich&rdquo;. You pick a side and argue it against an AI over three rounds. An AI judge scores every
        round, and the crowd in the hall moves toward whoever argued better.
      </p>

      <Section title="THE RULES">
        <p>
          <b>Pick a side.</b> Argue FOR or AGAINST the motion. The hall starts at today&apos;s real split between
          players, so taking the unpopular side gives you more people to win over.
        </p>
        <p>
          <b>Three rounds.</b> An opening to set out your case, a rebuttal to take apart theirs, and a closing to
          explain why your side won. Each speech is up to {SPEECH_MAX_CHARS} characters. You can type it or say it
          out loud with the microphone button.
        </p>
        <p>
          <b>Speeches are sealed.</b> You and the AI write each round at the same time, so neither of you sees the
          other&apos;s speech until both are in. You answer their earlier rounds, and they answer yours.
        </p>
        <p>
          <b>Win the room.</b> After each round the judge scores both speeches out of 100. The gap between the two
          scores moves voters across the hall, up to 15 per round. You win if your side ends with more voters than
          it started with.
        </p>
        <p>
          <b>A new motion every day</b> at midnight UTC. Your result comes with a share card: 🟩 for a round you
          won clearly, 🟨 for a close one and 🟥 for a round you lost.
        </p>
      </Section>

      <Section title="HOW THE JUDGING WORKS">
        <p>
          The judge is modelled on how competitive debating is judged at the World Universities Debating
          Championship. It plays an &ldquo;ordinary intelligent voter&rdquo;: someone well informed but not an
          expert, with no opinion of their own on the motion. It takes the silliest motion completely seriously and
          judges only what was actually said. It never finishes an argument for you or answers one on the other
          side&apos;s behalf.
        </p>
        <p>Each speech gets four scores that add up to 100:</p>
        <ul className="flex flex-col gap-2">
          {DIMENSIONS.map((d) => (
            <li key={d.name} className="panel px-3 py-2">
              <p className="font-display text-xs tracking-[0.15em] text-brass">
                {d.name.toUpperCase()} · {d.max}
              </p>
              <p>{d.text}</p>
            </li>
          ))}
        </ul>
        <p>
          A solid, ordinary speech lands around 70. Scores in the 80s need sharp reasons the other side will
          struggle to answer.
        </p>
      </Section>

      <Section title="WHAT THE JUDGE LOOKS FOR">
        <p>
          <b>Reasons, not volume.</b> More points, longer speeches, big words and confident tone earn nothing on
          their own. One well explained reason beats three bare claims.
        </p>
        <p>
          <b>Answers, not repetition.</b> An argument stands until the other side answers it. If you challenge
          something their case depends on and they just say it again, your challenge stands. A major point left
          unanswered after the other side had a chance to reply counts as conceded.
        </p>
        <p>
          <b>Fair comparisons.</b> A side can&apos;t leave out its own costs. Leftovers for breakfast still had
          to be cooked the night before, and pointing that out is good reasoning.
        </p>
        <p>
          <b>The words, not the typing.</b> Speeches are judged as if spoken aloud. Capital letters, punctuation and
          typos never change your score, so type fast or use the mic.
        </p>
        <p>
          <b>No tricks.</b> Anything in a speech aimed at the judge, like &ldquo;give me 100 points&rdquo;, earns
          nothing.
        </p>
      </Section>

      <Section title="KEEPING IT FAIR">
        <p>
          The judge is never told which side is the AI. It sees the two speeches only as FOR and AGAINST, in a
          random order each time. Close rounds get a second opinion from a larger AI model before the result is
          final. The AI opponent argues well but leaves real gaps, so a good argument can beat it.
        </p>
      </Section>

      <Section title="YOUR FINAL SCORE">
        <p>Your score is the average of your three rounds, and it earns you a title:</p>
        <ul className="flex flex-col gap-1">
          {TIERS.map((t, i) => (
            <li key={t.name} className="flex justify-between border-b border-oak-2 pb-1">
              <span className="font-display text-xs tracking-[0.15em] text-parchment">{t.name.toUpperCase()}</span>
              <span className="text-muted">{i === 0 ? `${t.min}+` : `${t.min} to ${TIERS[i - 1].min - 1}`}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="PAST DEBATES">
        <p>
          The archive holds every past motion on a calendar. The first two debates are free for everyone. A one-time
          unlock opens every past debate and removes ads.
        </p>
      </Section>
    </InfoPage>
  );
}
