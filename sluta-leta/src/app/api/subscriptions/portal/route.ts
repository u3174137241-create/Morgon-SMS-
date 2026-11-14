import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isBillingPortalConfigured, createBillingPortalSession } from "@/lib/stripe";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);
  if (!user.stripeCustomerId) {
    return jsonError("Ingen aktiv prenumeration att hantera.", 400);
  }
  if (!isBillingPortalConfigured()) {
    return jsonError("Kundportalen är inte tillgänglig just nu. Kontakta oss för att hantera din prenumeration.", 503);
  }
  const session = await createBillingPortalSession(user.stripeCustomerId);
  return jsonOk({ portalUrl: session.url });
}
