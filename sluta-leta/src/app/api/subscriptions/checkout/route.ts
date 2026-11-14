import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isStripeConfigured, getPlusCheckoutUrl } from "@/lib/stripe";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);
  if (!isStripeConfigured()) {
    return jsonError("Plus-prenumeration är inte konfigurerad ännu (Stripe saknas).", 503);
  }

  try {
    const checkoutUrl = getPlusCheckoutUrl({ userId: user.id });
    return jsonOk({ checkoutUrl });
  } catch (err) {
    console.error("[subscriptions/checkout] kunde inte bygga betalningslänk", err);
    return jsonError("Kunde inte starta betalningen just nu. Försök igen om en liten stund.", 502);
  }
}
