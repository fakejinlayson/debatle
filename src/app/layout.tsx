import type { Metadata, Viewport } from "next";
import { Silkscreen, VT323 } from "next/font/google";
import "./globals.css";

const display = Silkscreen({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-display" });
const body = VT323({ weight: "400", subsets: ["latin"], variable: "--font-body" });

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  title: "Debatle · win the room",
  description: "One ridiculous motion a day. Argue it against an AI. Win the room.",
  // Tells AdSense's reviewer which account owns the site. Serves no ads (only AdSlot does).
  ...(ADSENSE_CLIENT ? { other: { "google-adsense-account": ADSENSE_CLIENT } } : {}),
};

export const viewport: Viewport = { themeColor: "#140d10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
