import Link from "next/link";

// Footer links shown on every screen outside a game.
const LINKS = [
  { href: "/how-to-play", label: "How to play" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
];

export default function SiteLinks() {
  return (
    <nav className="mx-auto flex gap-4 text-base text-muted" aria-label="Site">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="hover:underline">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
