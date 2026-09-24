import { prisma } from "@/lib/db";
import { constructWebhookEvent, getStripeClient } from "@/lib/stripe";
import { transitionTransaction } from "@/lib/transactions";
import type Stripe from "stripe";

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
        if (session.metadata?.kind === "contact_fee") {
          await handleContactFeePaid(session);
        } else if (session.metadata?.kind === "plus_subscription") {
          await handlePlusCheckoutCompleted(session);
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
        if (session.metadata?.kind === "contact_fee") await handleContactFeeExpiredOrFailed(session);
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

async function handleContactFeePaid(session: Stripe.Checkout.Session) {
  const transactionId = session.metadata?.transactionId;
  const contactFeeId = session.metadata?.contactFeeId;
  if (!transactionId || !contactFeeId) return;

  await prisma.$transaction(async (tx) => {
    const fee = await tx.contactFee.findUnique({ where: { id: contactFeeId } });
    if (!fee || fee.status === "PAID") return;

    await tx.contactFee.update({
      where: { id: contactFeeId },
      data: {
        status: "PAID",
        paidAt: new Date(),
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

async function handleContactFeeExpiredOrFailed(session: Stripe.Checkout.Session) {
  const transactionId = session.metadata?.transactionId;
  const contactFeeId = session.metadata?.contactFeeId;
  if (!transactionId || !contactFeeId) return;

  await prisma.$transaction(async (tx) => {
    const fee = await tx.contactFee.findUnique({ where: { id: contactFeeId } });
    if (!fee || fee.status === "PAID") return;
    await tx.contactFee.update({ where: { id: contactFeeId }, data: { status: "FAILED" } });
    await transitionTransaction(tx, transactionId, "FAILED", "Betalningssession gick ut eller misslyckades");
  });
}

async function handlePlusCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId || !session.subscription) return;
  const stripe = getStripeClient();
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      status: mapStripeSubscriptionStatus(sub),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: sub.id,
      status: mapStripeSubscriptionStatus(sub),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
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

function extractUserId(event: Stripe.Event): string | null {
  const obj = event.data.object as { metadata?: Record<string, string> };
  return obj.metadata?.userId ?? null;
}

function extractAmount(event: Stripe.Event): number {
  const obj = event.data.object as { amount_total?: number; amount?: number };
  return Math.round((obj.amount_total ?? obj.amount ?? 0) / 100);
}
