import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
  return jsonOk({ subscription, stripeConfigured: isStripeConfigured() });
}
