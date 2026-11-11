import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { Section } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "About · Debatle",
  description: "What Debatle is, who makes it, and how to get in touch.",
};

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function AboutPage() {
  return (
    <InfoPage label="ABOUT">
      <Section title="WHAT IS DEBATLE">
        <p>
          Debatle is a daily debate game. Each day there&apos;s one silly motion, the same for everyone. You argue
          it against an AI in three short speeches, an AI judge scores every round, and the crowd decides who won
          the room.
        </p>
        <p>
          It&apos;s built for a few minutes a day, like a daily word puzzle, but the skill is arguing. Most motions
          sound trivial. Is cereal a soup? Should the middle seat get both armrests? Winning them takes real
          reasons and good answers to the other side.
        </p>
        <p>
          The judging follows the standards used in competitive debating. You can read{" "}
          <Link href="/how-to-play" className="text-brass underline">
            how it works
          </Link>
          .
        </p>
      </Section>

      <Section title="WHO MAKES IT">
        <p>
          Debatle is made by an independent developer. The AI opponent and judge run on Claude, by
          Anthropic. Ads and the optional archive unlock pay for the AI behind every game.
        </p>
      </Section>

      <Section title="CONTACT">
        {CONTACT ? (
          <p>
            Questions, bug reports, motion ideas or data requests:{" "}
            <a className="text-brass underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        ) : (
          <p>Contact details are coming soon.</p>
        )}
      </Section>
    </InfoPage>
  );
}
