import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 16 proxy (formerly middleware): keeps Google sign-in sessions fresh.
 * Supabase sessions expire hourly and Server Components can't write cookies,
 * so the refresh happens here. Visitors without a sign-in cookie (almost
 * everyone) skip it entirely, with no network call.
 */
export async function proxy(request: NextRequest) {
  const signedIn = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!signedIn || !process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Pages and API routes, not static files or the Stripe webhook.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
