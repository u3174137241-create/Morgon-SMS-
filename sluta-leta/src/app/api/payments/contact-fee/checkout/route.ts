import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isStripeConfigured, getContactFeeCheckoutUrl } from "@/lib/stripe";
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
  if (!parsed.success) return jsonError("Ogiltig indata.", 400);

  const transaction = await prisma.transaction.findUnique({
    where: { id: parsed.data.transactionId },
    include: { contactFee: true },
  });
  if (!transaction) return jsonError("Transaktionen hittades inte.", 404);
  if (transaction.sellerId !== user.id) return jsonError("Bara säljaren kan betala kontaktavgiften.", 403);
  if (!["CONTACT_FEE_PENDING", "FAILED"].includes(transaction.state) || !transaction.contactFee) {
    return jsonError("Ingen kontaktavgift väntar på betalning för den här transaktionen.", 400);
  }
  if (transaction.contactFee.status === "PAID") return jsonError("Avgiften är redan betald.", 409);

  if (!isStripeConfigured()) {
    return jsonError(
      "Betalningar är inte konfigurerade ännu (STRIPE_SECRET_KEY saknas). Kontakta administratören.",
      503
    );
  }

  try {
    const checkoutUrl = getContactFeeCheckoutUrl({
      transactionId: transaction.id,
      contactFeeId: transaction.contactFee.id,
    });

    // Ett tidigare misslyckat försök måste först tillbaka till CONTACT_FEE_PENDING
    // innan det nya försöket kan gå vidare till PAYMENT_PROCESSING.
    if (transaction.state === "FAILED") {
      await transitionTransaction(prisma, transaction.id, "CONTACT_FEE_PENDING", "Nytt betalningsförsök");
    }
    await transitionTransaction(prisma, transaction.id, "PAYMENT_PROCESSING", "Stripe-betalningslänk skickad");

    return jsonOk({ checkoutUrl });
  } catch (err) {
    console.error("[contact-fee/checkout] kunde inte bygga betalningslänk", err);
    return jsonError("Kunde inte starta betalningen just nu. Försök igen om en liten stund.", 502);
  }
}
