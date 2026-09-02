import { getDb } from "../db.js";

/**
 * Small internal key/value store (reuses the `settings` table) for
 * bookkeeping that isn't part of the user-facing Settings object — e.g.
 * the query-rotation cursor. Kept separate from settingsRepo so the
 * user-facing settings type stays clean.
 */
export function getMeta<T>(key: string, fallback: T): T {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(`meta_${key}`) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setMeta<T>(key: string, value: T): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (@key, @value, @updatedAt)
       ON CONFLICT(key) DO UPDATE SET value = @value, updated_at = @updatedAt`
    )
    .run({ key: `meta_${key}`, value: JSON.stringify(value), updatedAt: new Date().toISOString() });
}
