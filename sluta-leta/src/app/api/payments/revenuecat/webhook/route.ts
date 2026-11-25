import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// RevenueCat-webhooken är sanningskällan för Plus-köp gjorda via Apples (eller
// Googles) in-app-köp i den native appen — precis som Stripes webhook är det
// för webbköp. Autentisering sker med en delad hemlighet i Authorization-
// headern (konfigureras i RevenueCats dashboard), inte en signatur som Stripe.
//
// app_user_id sätts alltid till vårt eget User.id (mobile/App.tsx anropar
// Purchases.logIn(userId) innan något köp kan ske), så eventet mappar direkt
// mot en användare utan någon separat mappningstabell.
export async function POST(req: Request) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;
  if (!expected) return new Response("Inte konfigurerad", { status: 503 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return new Response("Obehörig", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const event = body?.event as RevenueCatEvent | undefined;
  if (!event || typeof event.app_user_id !== "string") {
    return new Response("Ogiltig data", { status: 400 });
  }

  const userId = event.app_user_id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new Response("ok (okänd användare)", { status: 200 });

  const currentPeriodEnd = typeof event.expiration_at_ms === "number" ? new Date(event.expiration_at_ms) : null;

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE": {
      await prisma.subscription.upsert({
        where: { userId },
        create: { userId, source: "APPLE", status: "ACTIVE", currentPeriodEnd, cancelAtPeriodEnd: false },
        update: { source: "APPLE", status: "ACTIVE", currentPeriodEnd, cancelAtPeriodEnd: false },
      });
      break;
    }
    case "CANCELLATION": {
      await prisma.subscription.updateMany({
        where: { userId, source: "APPLE" },
        data: { cancelAtPeriodEnd: true },
      });
      break;
    }
    case "EXPIRATION": {
      await prisma.subscription.updateMany({
        where: { userId, source: "APPLE" },
        data: { status: "CANCELLED" },
      });
      break;
    }
    case "BILLING_ISSUE": {
      await prisma.subscription.updateMany({
        where: { userId, source: "APPLE" },
        data: { status: "PAYMENT_FAILED" },
      });
      break;
    }
    default:
      break;
  }

  return new Response("ok", { status: 200 });
}

type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  expiration_at_ms?: number;
};
