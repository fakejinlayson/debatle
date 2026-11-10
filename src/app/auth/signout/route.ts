import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, supabaseAuth } from "@/lib/auth";

// Signs out of the Google-linked account (the anonymous player cookie stays).
export async function POST(request: NextRequest) {
  if (authConfigured()) await (await supabaseAuth()).auth.signOut();
  return NextResponse.redirect(new URL("/archive", request.nextUrl.origin), { status: 303 });
}
