import { prisma } from "@/lib/db";
import { constructWebhookEvent } from "@/lib/stripe";
import { transitionTransaction } from "@/lib/transactions";
import type Stripe from "stripe";

// Vi kör utan Stripe-SDK:t (ingen riktig API-nyckel behövs, se lib/stripe.ts),
// så webhook-händelsens egna objekt är den enda källan till data — aldrig
// ett extra API-anrop tillbaka till Stripe. Typningen är fortfarande
// Stripes officiella typer (bara för IDE-stöd), men vi anropar aldrig SDK:t.

export const runtime = "nodejs";

// Stripe webhooks — enda källan till sanning för om en betalning lyckats.
// Signatur verifieras, events är idempotenta (Payment.stripeObjectId är unikt),
// och frontend har aldrig makt att sätta betalningsstatus själv.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Saknar signatur", { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error("[stripe-webhook] ogiltig signatur", err);
    return new Response("Ogiltig signatur", { status: 400 });
  }

  const alreadyProcessed = await prisma.payment.findUnique({ where: { stripeObjectId: event.id } });
  if (alreadyProcessed) {
    return new Response("ok (redan hanterad)", { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const ref = parseClientReferenceId(session.client_reference_id);
        if (ref?.kind === "contact_fee") {
          await handleContactFeePaid(session, ref);
        } else if (ref?.kind === "plus_subscription") {
          await handlePlusCheckoutCompleted(session, ref);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const ref = parseClientReferenceId(session.client_reference_id);
        if (ref?.kind === "contact_fee") await handleContactFeeExpiredOrFailed(ref);
        break;
      }
      case "charge.refunded": {
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      }
      default:
        break;
    }

    await prisma.payment.create({
      data: {
        userId: extractUserId(event) ?? "unknown",
        type: event.type.startsWith("customer.subscription") || event.type === "invoice.payment_failed" ? "SUBSCRIPTION" : "CONTACT_FEE",
        stripeObjectId: event.id,
        amount: extractAmount(event),
        currency: "SEK",
        status: event.type,
        raw: event as unknown as object,
      },
    });
  } catch (err) {
    console.error(`[stripe-webhook] fel vid hantering av ${event.type}`, err);
    return new Response("Internt fel vid hantering", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

async function handleContactFeePaid(session: Stripe.Checkout.Session, ref: ContactFeeRef) {
  const { transactionId, contactFeeId } = ref;

  await prisma.$transaction(async (tx) => {
    const fee = await tx.contactFee.findUnique({ where: { id: contactFeeId } });
    if (!fee || fee.status === "PAID") return;

    await tx.contactFee.update({
      where: { id: contactFeeId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      },
    });

    await transitionTransaction(tx, transactionId, "PAYMENT_COMPLETED", "Kontaktavgift betald");
    await transitionTransaction(tx, transactionId, "CHAT_UNLOCKED", "Chatt upplåst efter betalning");
    await tx.conversation.upsert({
      where: { transactionId },
      create: { transactionId },
      update: {},
    });

    const transaction = await tx.transaction.findUniqueOrThrow({ where: { id: transactionId } });
    await tx.notification.createMany({
      data: [
        { userId: transaction.buyerId, type: "CHAT_UNLOCKED", payload: { transactionId } },
        { userId: transaction.sellerId, type: "CHAT_UNLOCKED", payload: { transactionId } },
      ],
    });
  });
}

async function handleContactFeeExpiredOrFailed(ref: ContactFeeRef) {
  const { transactionId, contactFeeId } = ref;

  await prisma.$transaction(async (tx) => {
    const fee = await tx.contactFee.findUnique({ where: { id: contactFeeId } });
    if (!fee || fee.status === "PAID") return;
    await tx.contactFee.update({ where: { id: contactFeeId }, data: { status: "FAILED" } });
    await transitionTransaction(tx, transactionId, "FAILED", "Betalningssession gick ut eller misslyckades");
  });
}

// Återbetalningar görs av operatören direkt i Stripes dashboard — vi bygger
// ingen egen adminfunktion för det. Den här hanteraren reagerar bara på
// händelsen så att databasen hamnar i rätt tillstånd när det sker.
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  if (!fullyRefunded) {
    console.warn(`[stripe-webhook] Delvis återbetalning för payment_intent ${paymentIntentId} hanteras inte automatiskt.`);
    return;
  }

  const fee = await prisma.contactFee.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
  if (!fee || fee.status !== "PAID") return;

  await prisma.$transaction(async (tx) => {
    await tx.contactFee.update({ where: { id: fee.id }, data: { status: "REFUNDED" } });
    await tx.refund.upsert({
      where: { contactFeeId: fee.id },
      create: { contactFeeId: fee.id, amount: fee.amount, reason: "Återbetalad via Stripe", status: "REFUNDED", resolvedAt: new Date() },
      update: { status: "REFUNDED", resolvedAt: new Date() },
    });

    const transaction = await tx.transaction.findUnique({ where: { id: fee.transactionId } });
    if (!transaction || transaction.state === "REFUNDED") return;
    if (transaction.state !== "REFUND_PENDING") {
      await transitionTransaction(tx, transaction.id, "REFUND_PENDING", "Återbetalning registrerad från Stripe");
    }
    await transitionTransaction(tx, transaction.id, "REFUNDED", "Kontaktavgift återbetald");

    await tx.notification.createMany({
      data: [
        { userId: transaction.buyerId, type: "TRANSACTION_UPDATED", payload: { transactionId: transaction.id, reason: "refunded" } },
        { userId: transaction.sellerId, type: "TRANSACTION_UPDATED", payload: { transactionId: transaction.id, reason: "refunded" } },
      ],
    });
  });
}

// Period/status sätts preliminärt här utifrån checkout-sessionen direkt —
// inget API-anrop till Stripe behövs. Den strax därpå kommande
// customer.subscription.created/updated-händelsen (redan aktiverad på
// webhooken) bär det fullständiga prenumerationsobjektet och rättar till
// de här fälten exakt, via handleSubscriptionUpdated nedan.
async function handlePlusCheckoutCompleted(session: Stripe.Checkout.Session, ref: PlusRef) {
  const { userId } = ref;
  if (!session.subscription || !session.customer) return;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;

  const provisionalPeriodEnd = new Date();
  provisionalPeriodEnd.setMonth(provisionalPeriodEnd.getMonth() + 1);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      status: "ACTIVE",
      currentPeriodEnd: provisionalPeriodEnd,
      cancelAtPeriodEnd: false,
    },
    update: {
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      status: "ACTIVE",
    },
  });

  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
  if (!existing) return;
  await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: mapStripeSubscriptionStatus(sub),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
  if (!existing) return;
  await prisma.subscription.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;
  const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subId } });
  if (!existing) return;
  await prisma.subscription.update({ where: { id: existing.id }, data: { status: "PAYMENT_FAILED" } });
}

function mapStripeSubscriptionStatus(sub: Stripe.Subscription): "ACTIVE" | "PAYMENT_FAILED" | "PAST_DUE" | "CANCEL_AT_PERIOD_END" | "CANCELLED" {
  if (sub.cancel_at_period_end) return "CANCEL_AT_PERIOD_END";
  switch (sub.status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
      return "CANCELLED";
    default:
      return "PAYMENT_FAILED";
  }
}

type ContactFeeRef = { kind: "contact_fee"; transactionId: string; contactFeeId: string };
type PlusRef = { kind: "plus_subscription"; userId: string };

// Payment Links kan inte sätta dynamisk metadata per köp, så vi kodar
// vilken betalning det gäller (och för vem) i client_reference_id, som
// vi själva satte med på länken (se lib/stripe.ts).
function parseClientReferenceId(value: string | null | undefined): ContactFeeRef | PlusRef | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts[0] === "contact_fee" && parts[1] && parts[2]) {
    return { kind: "contact_fee", transactionId: parts[1], contactFeeId: parts[2] };
  }
  if (parts[0] === "plus" && parts[1]) {
    return { kind: "plus_subscription", userId: parts[1] };
  }
  return null;
}

function extractUserId(event: Stripe.Event): string | null {
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const ref = parseClientReferenceId(session.client_reference_id);
    if (ref?.kind === "plus_subscription") return ref.userId;
    return null;
  }
  return null;
}

function extractAmount(event: Stripe.Event): number {
  const obj = event.data.object as { amount_total?: number; amount?: number };
  return Math.round((obj.amount_total ?? obj.amount ?? 0) / 100);
}
