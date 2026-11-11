import Link from "next/link";
import SiteLinks from "./SiteLinks";

// Shared shell for the plain text pages (how to play, about, privacy).
// Server-rendered, so the words are in the HTML for readers and crawlers.

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-xs tracking-[0.2em] text-brass">{title}</h2>
      <div className="flex flex-col gap-2 text-lg leading-snug text-parchment/90">{children}</div>
    </section>
  );
}

export default function InfoPage({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-5">
      <header className="flex items-end justify-between">
        <Link href="/" className="font-display text-2xl font-bold tracking-wider text-brass">
          DEBATLE
        </Link>
        <p className="whitespace-nowrap font-display text-xs tracking-[0.25em] text-muted">{label}</p>
      </header>

      {children}

      <Link href="/" className="text-center font-display text-[0.65rem] tracking-[0.2em] text-brass hover:underline">
        ◂ TODAY&apos;S DEBATE
      </Link>
      <SiteLinks />
    </main>
  );
}
