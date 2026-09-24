import Stripe from "stripe";

let cachedClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe är inte konfigurerat. Sätt STRIPE_SECRET_KEY (och STRIPE_WEBHOOK_SECRET) i miljövariablerna för att aktivera riktiga betalningar."
    );
  }
  if (!cachedClient) {
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return cachedClient;
}

function baseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

export async function createContactFeeCheckoutSession(params: {
  transactionId: string;
  contactFeeId: string;
  amountSek: number;
  sellerId: string;
  sellerEmail: string;
  sellerStripeCustomerId: string | null;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: params.sellerStripeCustomerId ?? undefined,
    customer_email: params.sellerStripeCustomerId ? undefined : params.sellerEmail,
    line_items: [
      {
        price_data: {
          currency: "sek",
          unit_amount: params.amountSek * 100,
          product_data: { name: "Sluta Leta — kontaktavgift" },
        },
        quantity: 1,
      },
    ],
    metadata: {
      transactionId: params.transactionId,
      contactFeeId: params.contactFeeId,
      userId: params.sellerId,
      kind: "contact_fee",
    },
    success_url: `${baseUrl()}/meddelanden/${params.transactionId}?betalning=klar`,
    cancel_url: `${baseUrl()}/meddelanden/${params.transactionId}?betalning=avbruten`,
  });
}

export async function createPlusCheckoutSession(params: {
  userId: string;
  userEmail: string;
  stripeCustomerId: string | null;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  const priceId = process.env.STRIPE_PLUS_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PLUS_PRICE_ID saknas i miljövariablerna.");

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.stripeCustomerId ?? undefined,
    customer_email: params.stripeCustomerId ? undefined : params.userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId: params.userId, kind: "plus_subscription" },
    success_url: `${baseUrl()}/plus?status=klar`,
    cancel_url: `${baseUrl()}/plus?status=avbruten`,
  });
}

export async function createBillingPortalSession(stripeCustomerId: string): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${baseUrl()}/plus`,
  });
}

export async function getOrCreateStripeCustomerId(user: { id: string; email: string; stripeCustomerId: string | null }): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
  const { prisma } = await import("@/lib/db");
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET saknas i miljövariablerna.");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
