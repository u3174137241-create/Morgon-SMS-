import { getDb } from "../db.js";

export interface NotificationRecord {
  id: string;
  leadId: string | null;
  type: "HOT_LEAD" | "DIGEST";
  sentAt: string;
  success: boolean;
  error: string | null;
  message: string;
}

export function recordNotification(rec: Omit<NotificationRecord, "id" | "sentAt"> & { id?: string }): void {
  const id = rec.id ?? `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  getDb()
    .prepare(
      `INSERT INTO notifications (id, lead_id, type, sent_at, success, error, message) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, rec.leadId, rec.type, new Date().toISOString(), rec.success ? 1 : 0, rec.error, rec.message);
}

export function countNotificationsToday(): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS n FROM notifications WHERE sent_at >= ? AND success = 1")
      .get(todayStart.toISOString()) as { n: number }
  ).n;
}

interface NotificationRow {
  id: string;
  lead_id: string | null;
  type: NotificationRecord["type"];
  sent_at: string;
  success: number;
  error: string | null;
  message: string;
}

/** Recent notifications (real Telegram sends and DRY_RUN/unconfigured ones alike) for the dashboard feed. */
export function listNotifications(limit = 50): NotificationRecord[] {
  const rows = getDb()
    .prepare("SELECT * FROM notifications ORDER BY sent_at DESC LIMIT ?")
    .all(limit) as NotificationRow[];
  return rows.map((r) => ({
    id: r.id,
    leadId: r.lead_id,
    type: r.type,
    sentAt: r.sent_at,
    success: !!r.success,
    error: r.error,
    message: r.message,
  }));
}
