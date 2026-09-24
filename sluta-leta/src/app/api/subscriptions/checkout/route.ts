import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isStripeConfigured, createPlusCheckoutSession, getOrCreateStripeCustomerId } from "@/lib/stripe";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);
  if (!isStripeConfigured()) {
    return jsonError("Plus-prenumeration är inte konfigurerad ännu (Stripe saknas).", 503);
  }

  const customerId = await getOrCreateStripeCustomerId(user);
  const session = await createPlusCheckoutSession({
    userId: user.id,
    userEmail: user.email,
    stripeCustomerId: customerId,
  });

  return jsonOk({ checkoutUrl: session.url });
}
