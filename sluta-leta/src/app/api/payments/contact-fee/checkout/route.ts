import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isStripeConfigured, createContactFeeCheckoutSession, getOrCreateStripeCustomerId } from "@/lib/stripe";
import { transitionTransaction } from "@/lib/transactions";
import { z } from "zod";

const schema = z.object({ transactionId: z.string().cuid() });

// Säljaren initierar betalning av kontaktavgiften. Frontend får aldrig
// markera betalningen som klar själv — det görs enbart av webhooken efter
// verifiering mot Stripe.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Ogiltig indata", 400);

  const transaction = await prisma.transaction.findUnique({
    where: { id: parsed.data.transactionId },
    include: { contactFee: true },
  });
  if (!transaction) return jsonError("Transaktionen hittades inte.", 404);
  if (transaction.sellerId !== user.id) return jsonError("Bara säljaren kan betala kontaktavgiften.", 403);
  if (transaction.state !== "CONTACT_FEE_PENDING" || !transaction.contactFee) {
    return jsonError("Ingen kontaktavgift väntar på betalning för den här transaktionen.", 400);
  }
  if (transaction.contactFee.status === "PAID") return jsonError("Avgiften är redan betald.", 409);

  if (!isStripeConfigured()) {
    return jsonError(
      "Betalningar är inte konfigurerade ännu (STRIPE_SECRET_KEY saknas). Kontakta administratören.",
      503
    );
  }

  const customerId = await getOrCreateStripeCustomerId(user);
  const session = await createContactFeeCheckoutSession({
    transactionId: transaction.id,
    contactFeeId: transaction.contactFee.id,
    amountSek: transaction.contactFee.amount,
    sellerId: user.id,
    sellerEmail: user.email,
    sellerStripeCustomerId: customerId,
  });

  await prisma.contactFee.update({
    where: { id: transaction.contactFee.id },
    data: { stripeCheckoutSessionId: session.id },
  });
  await transitionTransaction(prisma, transaction.id, "PAYMENT_PROCESSING", "Stripe checkout skapad");

  return jsonOk({ checkoutUrl: session.url });
}
