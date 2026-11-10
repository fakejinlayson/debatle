import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Google sign-in through Supabase Auth. It's only used to tie the archive
// unlock to an account, so it can be restored on any device. Playing never
// needs it: players stay anonymous (see player.ts).
//
// Env: SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY. Both are read on the server
// only; nothing auth-related runs in the browser.

export const authConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);

/** Supabase client bound to the request's auth cookies (Route Handlers, Server Components). */
export async function supabaseAuth() {
  const jar = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes sessions.
        }
      },
    },
  });
}

/** Supabase stores its session in cookies named sb-<project>-auth-token(.N). */
export const hasAuthCookie = (names: string[]) => names.some((n) => n.startsWith("sb-") && n.includes("-auth-token"));

export interface AuthUser {
  id: string;
  email: string | null;
}

/** The signed-in user, or null. Cheap for anonymous visitors (no network call). */
export async function currentUser(): Promise<AuthUser | null> {
  if (!authConfigured()) return null;
  const jar = await cookies();
  if (!hasAuthCookie(jar.getAll().map((c) => c.name))) return null;
  const { data } = await (await supabaseAuth()).auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}
