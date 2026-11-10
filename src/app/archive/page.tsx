import ArchiveScreen from "@/components/ArchiveScreen";
import { archiveList } from "@/lib/archive";
import { currentUser } from "@/lib/auth";
import { confirmCheckout } from "@/lib/unlock";

type Search = { unlock?: string; session_id?: string; auth?: string; locked?: string };

export default async function ArchivePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;

  // Back from Stripe: record the purchase straight away (the webhook also does,
  // idempotently), so the unlock shows even before the webhook arrives.
  let confirmed = false;
  if (sp.unlock === "success" && sp.session_id) {
    const user = await currentUser();
    if (user) confirmed = await confirmCheckout(sp.session_id, user.id).catch(() => false);
  }

  const view = await archiveList();
  const notice =
    sp.unlock === "success" && (confirmed || view.access.unlocked)
      ? "unlocked"
      : sp.unlock === "success"
        ? "pending"
        : sp.unlock === "cancelled"
          ? "cancelled"
          : sp.auth === "error"
            ? "auth-error"
            : sp.auth === "unavailable"
              ? "auth-unavailable"
              : sp.auth === "signed-in"
                ? view.access.unlocked
                  ? "restored"
                  : "signed-in"
                : sp.locked
                  ? "locked"
                  : null;

  return <ArchiveScreen view={view} notice={notice} />;
}
