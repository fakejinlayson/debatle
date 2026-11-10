import Stripe from "stripe";
import { recordPaidSession } from "@/lib/unlock";

export const runtime = "nodejs";

/**
 * Stripe's webhook (set it to send checkout.session.completed and
 * checkout.session.async_payment_succeeded). Stripe has no session here, so
 * the signature check against STRIPE_WEBHOOK_SECRET is the only way in.
 * Recording is idempotent, so retries and the success-page check can't
 * double up. Answers 500 on failure so Stripe retries.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook not configured" }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return Response.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await recordPaidSession(event.data.object);
    }
    return Response.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook]", event.type, event.id, err);
    return Response.json({ error: "Could not record the unlock" }, { status: 500 });
  }
}
