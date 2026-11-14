import crypto from "crypto";

// Vi använder statiska Stripe Payment Links istället för att skapa
// Checkout Sessions dynamiskt via API — båda våra priser (kontaktavgift
// och Plus) är fasta belopp, så vi behöver aldrig anropa Stripes API för
// att ta betalt. Det enda vi behöver är de två länkarna och webhook-
// signeringsnyckeln (för att verifiera att betalningen faktiskt skedde).
const CONTACT_FEE_PAYMENT_LINK = process.env.STRIPE_CONTACT_FEE_PAYMENT_LINK;
const PLUS_PAYMENT_LINK = process.env.STRIPE_PLUS_PAYMENT_LINK;

export function isStripeConfigured(): boolean {
  return Boolean(CONTACT_FEE_PAYMENT_LINK && PLUS_PAYMENT_LINK && process.env.STRIPE_WEBHOOK_SECRET);
}

// Kundportalen (för att hantera/avsluta en prenumeration) kräver ett
// riktigt API-anrop till Stripe och är därför en separat, valfri
// funktion — allt annat (betalningar, webhooks) funkar utan den.
export function isBillingPortalConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getContactFeeCheckoutUrl(params: { transactionId: string; contactFeeId: string }): string {
  if (!CONTACT_FEE_PAYMENT_LINK) {
    throw new Error("STRIPE_CONTACT_FEE_PAYMENT_LINK saknas i miljövariablerna.");
  }
  const ref = `contact_fee:${params.transactionId}:${params.contactFeeId}`;
  return `${CONTACT_FEE_PAYMENT_LINK}?client_reference_id=${encodeURIComponent(ref)}`;
}

export function getPlusCheckoutUrl(params: { userId: string }): string {
  if (!PLUS_PAYMENT_LINK) {
    throw new Error("STRIPE_PLUS_PAYMENT_LINK saknas i miljövariablerna.");
  }
  const ref = `plus:${params.userId}`;
  return `${PLUS_PAYMENT_LINK}?client_reference_id=${encodeURIComponent(ref)}`;
}

export async function createBillingPortalSession(stripeCustomerId: string): Promise<{ url: string }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe är inte konfigurerat för kundportalen (STRIPE_SECRET_KEY saknas).");
  }
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/plus`,
  });
  return { url: session.url };
}

// Verifierar Stripes webhook-signatur manuellt (HMAC-SHA256) utan att
// behöva en riktig Stripe API-nyckel eller SDK-klient — vi tar aldrig
// betalt via API, så det enda vi behöver verifiera är att den inkommande
// webhook-förfrågan faktiskt kommer från Stripe, med webhook-hemligheten.
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export function constructWebhookEvent(rawBody: string, signatureHeader: string): any {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET saknas i miljövariablerna.");

  const parts: Record<string, string> = {};
  for (const pair of signatureHeader.split(",")) {
    const [key, value] = pair.split("=");
    if (key && value) parts[key] = value;
  }
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error("Ogiltigt signaturformat.");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SECONDS) {
    throw new Error("Webhook-tidsstämpeln är för gammal eller ogiltig.");
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    throw new Error("Webhook-signaturen matchar inte.");
  }

  return JSON.parse(rawBody);
}
