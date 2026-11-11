import type { Metadata } from "next";
import InfoPage, { Section } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Privacy · Debatle" };

// Plain-language privacy policy. AdSense requires one before approval.
// Have it reviewed before launch; it describes what the code actually does.
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const UPDATED = "11 November 2026";

export default function PrivacyPage() {
  return (
    <InfoPage label="PRIVACY">
      <p className="text-lg text-muted">Last updated {UPDATED}.</p>

      <Section title="WHAT WE STORE">
        <p>
          <b>A random player ID</b> in a cookie, so we can keep today&apos;s game, your archive progress and your
          free archive plays. It isn&apos;t linked to your name.
        </p>
        <p>
          <b>Your speeches and results</b>: what you write each round, the AI&apos;s replies and the judge&apos;s
          scores. We use them to run the game and the daily stats.
        </p>
        <p>
          <b>Your Google account email</b>, only if you choose to sign in to unlock the archive. We use it to tie
          your purchase to your account so you can restore it on other devices.
        </p>
      </Section>

      <Section title="WHO HELPS US RUN DEBATLE">
        <p>
          <b>Anthropic</b> (Claude) writes the AI opponent&apos;s speeches and judges each round, so your speeches
          are sent to Anthropic to do that.
        </p>
        <p>
          <b>Supabase</b> stores the game data and handles Google sign-in. <b>Vercel</b> hosts the site.
        </p>
        <p>
          <b>Stripe</b> processes payments. We never see or store your card details.
        </p>
      </Section>

      <Section title="ADVERTISING">
        <p>
          Debatle shows ads from <b>Google AdSense</b> unless you&apos;ve bought the archive unlock, which also removes
          ads. Google and its partners may use cookies to show ads based on your visits to this and other sites.
        </p>
        <p>
          You can turn off personalised ads in{" "}
          <a className="text-brass underline" href="https://adssettings.google.com" target="_blank" rel="noreferrer">
            Google&apos;s ad settings
          </a>
          , and read how Google uses data at{" "}
          <a
            className="text-brass underline"
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noreferrer"
          >
            policies.google.com
          </a>
          . Visitors in the UK, EU and similar regions are asked for consent before personalised ads are used.
        </p>
      </Section>

      <Section title="YOUR CHOICES">
        <p>
          Clearing your cookies starts you fresh as a new player. Signing out keeps your unlock on your Google
          account. To have your data deleted, get in touch
          {CONTACT ? (
            <>
              {" "}
              at{" "}
              <a className="text-brass underline" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>
            </>
          ) : null}
          .
        </p>
      </Section>

    </InfoPage>
  );
}
