import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuth } from "@/lib/auth";
import { getOrCreatePlayerId } from "@/lib/player";
import { store } from "@/lib/store";
import { safeNext } from "@/lib/safe-next";

// Google sends the user back here. Exchange the code for a session, then link
// this browser's anonymous player to the account, so an unlock bought (or
// restored) on the account applies here.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL(`${next}?auth=error`, origin));

  const supabase = await supabaseAuth();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL(`${next}?auth=error`, origin));

  try {
    const playerId = await getOrCreatePlayerId();
    await store().ensurePlayer(playerId);
    await store().linkPlayer(playerId, data.user.id);
  } catch (err) {
    console.error("Couldn't link player to account", err);
  }
  return NextResponse.redirect(new URL(`${next}?auth=signed-in`, origin));
}
