import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isStripeConfigured, createBillingPortalSession } from "@/lib/stripe";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);
  if (!isStripeConfigured() || !user.stripeCustomerId) {
    return jsonError("Ingen aktiv prenumeration att hantera.", 400);
  }
  const session = await createBillingPortalSession(user.stripeCustomerId);
  return jsonOk({ portalUrl: session.url });
}
