import "server-only";
import { currentUser } from "./auth";
import { store } from "./store";

// Ads are shown to everyone except players who bought the one-time unlock
// (which removes ads site-wide, like Krillion). The unlock is tied to the
// Google account, so it applies wherever the player is signed in.
export async function adsEnabled(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return true;
  return !(await store().hasUnlock(user.id));
}
