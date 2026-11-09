import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isStripeConfigured } from "@/lib/stripe";
import { getFreeTrialChatsRemaining } from "@/lib/plus";
import { FREE_TRIAL_CHAT_LIMIT } from "@/lib/fees";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const [subscription, freeTrialChatsRemaining] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: user.id } }),
    getFreeTrialChatsRemaining(user.id),
  ]);

  return jsonOk({
    subscription,
    stripeConfigured: isStripeConfigured(),
    freeTrialChatsRemaining,
    freeTrialChatsLimit: FREE_TRIAL_CHAT_LIMIT,
  });
}
