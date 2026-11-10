import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, supabaseAuth } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

// Starts Google sign-in. Supabase sends the user to Google, then back to
// /auth/callback with a code. ?next=/archive picks where they land afterwards.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  if (!authConfigured()) return NextResponse.redirect(new URL(`${next}?auth=unavailable`, origin));

  const { data, error } = await (await supabaseAuth()).auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) return NextResponse.redirect(new URL(`${next}?auth=error`, origin));
  return NextResponse.redirect(data.url);
}
