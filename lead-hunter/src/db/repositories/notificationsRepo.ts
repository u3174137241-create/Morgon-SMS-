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
