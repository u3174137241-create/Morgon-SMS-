import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";
import { getLastNotifSeenAt, setLastNotifSeenAt } from "./storage";

/**
 * IMPORTANT — honest limitation, not a bug: these are LOCAL notifications,
 * scheduled on-device from polling the backend's /api/notifications while
 * this app is open (foreground or freshly resumed). They are NOT remote
 * push — the phone will not buzz while the app is fully closed. For a
 * guaranteed alert even when the app isn't running, Telegram (configured
 * on the backend) remains the reliable channel; this in-app layer is a
 * convenience on top of it, not a replacement.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

function shortTitle(message: string): string {
  const firstLine = message.split("\n").find((l) => l.trim().length > 0) || "Nytt lead";
  return firstLine.replace(/^[^\p{L}\p{N}]+/u, "").trim().slice(0, 60);
}

function bodyPreview(message: string): string {
  const lines = message.split("\n").filter((l) => l.trim().length > 0);
  return lines.slice(1, 3).join(" · ").slice(0, 140) || message.slice(0, 140);
}

/**
 * Fetches recent notifications from the backend and locally re-notifies for
 * any successfully-sent one this device hasn't shown yet. Safe to call
 * repeatedly — it's idempotent against `lastNotifSeenAt`.
 */
export async function pollAndNotify(): Promise<number> {
  const notifs = await api.notifications(20);
  if (notifs.length === 0) return 0;

  const lastSeen = await getLastNotifSeenAt();
  const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0;

  const fresh = notifs.filter((n) => n.success && new Date(n.sentAt).getTime() > lastSeenMs).sort((a, b) => a.sentAt.localeCompare(b.sentAt));

  for (const n of fresh) {
    await Notifications.scheduleNotificationAsync({
      content: { title: shortTitle(n.message), body: bodyPreview(n.message), data: { leadId: n.leadId, notifId: n.id } },
      trigger: null, // fire immediately
    });
  }

  const newestMs = notifs.reduce((max, n) => Math.max(max, new Date(n.sentAt).getTime()), lastSeenMs);
  if (newestMs > lastSeenMs) await setLastNotifSeenAt(new Date(newestMs).toISOString());

  return fresh.length;
}

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("hot-leads", {
    name: "Heta & varma leads",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: "#B8924F",
  });
}
