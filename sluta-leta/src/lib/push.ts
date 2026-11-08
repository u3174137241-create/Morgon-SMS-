import webpush from "web-push";
import { prisma } from "@/lib/db";

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured() {
  if (configured || !isPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hjalp@slutaleta.se",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

type PushPayload = { title: string; body: string; url: string };

// Skickar en webbpush-notis till alla enheter användaren har registrerat.
// En utgången/ogiltig prenumeration (telefonen avinstallerad, webbläsaren
// återkallad den) tas bort tyst istället för att låta ett fel stoppa resten.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  await Promise.all([sendWebPushToUser(userId, payload), sendExpoPushToUser(userId, payload)]);
}

async function sendWebPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("[push] kunde inte skicka webbpush-notis", err);
        }
      }
    })
  );
}

// Notiser till den native iOS/Android-appen (Expo) — ett separat spår från
// webbpush, eftersom appen inte har en webbläsarprenumeration. Expos push-API
// kräver ingen nyckel, men EXPO_ACCESS_TOKEN kan sättas för bättre leverans.
async function sendExpoPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const tokens = await prisma.expoPushToken.findMany({ where: { userId } });
  if (tokens.length === 0) return;

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify(
        tokens.map((t) => ({ to: t.token, title: payload.title, body: payload.body, data: { url: payload.url } }))
      ),
    });
    const result = await res.json().catch(() => null);
    const tickets: { status: string; details?: { error?: string } }[] = result?.data ?? [];
    await Promise.all(
      tickets.map(async (ticket, i) => {
        const tokenRow = tokens[i];
        if (tokenRow && ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          await prisma.expoPushToken.delete({ where: { id: tokenRow.id } }).catch(() => {});
        }
      })
    );
  } catch (err) {
    console.error("[push] kunde inte skicka Expo-notis", err);
  }
}
