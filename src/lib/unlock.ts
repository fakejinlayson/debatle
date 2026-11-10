import "server-only";
import Stripe from "stripe";
import { UNLOCK_PRICE_CENTS } from "./config";
import { store } from "./store";

// The one-time archive unlock: $5 USD through Stripe Checkout, tied to the
// buyer's Google account (Supabase Auth user id) so it restores anywhere.
// Env: STRIPE_SECRET_KEY, and STRIPE_WEBHOOK_SECRET for the webhook.

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

export const paymentsConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Starts a Checkout session for the signed-in user; returns the Stripe-hosted URL. */
export async function createUnlockCheckout(opts: {
  userId: string;
  email: string | null;
  playerId: string | null;
  origin: string;
}): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: UNLOCK_PRICE_CENTS,
          product_data: {
            name: "Debatle archive unlock",
            description: "Play every past debate, forever, with no ads. One-time purchase.",
          },
        },
      },
    ],
    client_reference_id: opts.userId,
    customer_email: opts.email ?? undefined,
    metadata: { kind: "archive_unlock", user_id: opts.userId, player_id: opts.playerId ?? "" },
    success_url: `${opts.origin}/archive?unlock=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/archive?unlock=cancelled`,
  });
  if (!session.url) throw new Error("Stripe didn't return a checkout page");
  return session.url;
}

/** Records the unlock if this Checkout session is a paid archive unlock. Safe to call repeatedly. */
export async function recordPaidSession(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.metadata?.kind !== "archive_unlock" || session.payment_status !== "paid") return false;
  const userId = session.metadata.user_id || session.client_reference_id;
  if (!userId) return false;
  await store().recordUnlock({
    userId,
    sessionId: session.id,
    email: session.customer_details?.email ?? session.customer_email ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
  });
  return true;
}

/**
 * Success-page check (works without webhooks, e.g. locally): looks the session
 * up with Stripe and records it, but only for the user who bought it.
 */
export async function confirmCheckout(sessionId: string, userId: string): Promise<boolean> {
  if (!paymentsConfigured() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const owner = session.metadata?.user_id || session.client_reference_id;
  if (owner !== userId) return false;
  return recordPaidSession(session);
}
