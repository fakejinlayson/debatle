import { currentUser } from "@/lib/auth";
import { archiveAccess } from "@/lib/game";
import { readPlayerId } from "@/lib/player";
import { createUnlockCheckout, paymentsConfigured } from "@/lib/unlock";
import { errorResponse } from "../../_respond";

// Starts the $5 one-time unlock. Signing in with Google comes first, so the
// purchase is tied to an account and can be restored on any device.
export async function POST(req: Request) {
  try {
    if (!paymentsConfigured()) return Response.json({ error: "Payments aren't set up yet" }, { status: 503 });
    const user = await currentUser();
    if (!user) return Response.json({ error: "Sign in with Google first", signIn: true }, { status: 401 });

    const playerId = await readPlayerId();
    if ((await archiveAccess(playerId, user.id)).unlocked) return Response.json({ unlocked: true });

    const url = await createUnlockCheckout({ userId: user.id, email: user.email, playerId, origin: new URL(req.url).origin });
    return Response.json({ url });
  } catch (err) {
    return errorResponse(err);
  }
}
