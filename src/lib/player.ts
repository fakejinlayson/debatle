import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "./config";

// Anonymous player identity: a UUID in an httpOnly cookie, HMAC-signed so it
// can't be forged to hijack someone else's game.

const COOKIE = "dbt_pid";
const ONE_YEAR = 60 * 60 * 24 * 365;

const sign = (id: string) => createHmac("sha256", serverEnv().cookieSecret).update(id).digest("base64url");

function verify(value: string | undefined): string | null {
  if (!value) return null;
  const [id, sig] = value.split(".");
  if (!id || !sig) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

/** Existing player ID, or null. Safe to call from Server Components. */
export async function readPlayerId(): Promise<string | null> {
  return verify((await cookies()).get(COOKIE)?.value);
}

/** Existing player ID, or a new one set as a cookie. Route Handlers only. */
export async function getOrCreatePlayerId(): Promise<string> {
  const jar = await cookies();
  const existing = verify(jar.get(COOKIE)?.value);
  if (existing) return existing;
  const id = crypto.randomUUID();
  jar.set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return id;
}
