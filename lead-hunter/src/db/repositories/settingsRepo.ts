import { getDb } from "../db.js";
import type { Settings } from "../../core/types.js";
import { DEFAULT_SETTINGS } from "../../config/env.js";

export function getSettings(): Settings {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const map: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    try {
      map[row.key] = JSON.parse(row.value);
    } catch {
      // ignore malformed row, keep default
    }
  }
  return map as unknown as Settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const now = new Date().toISOString();
  const upsert = getDb().prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (@key, @value, @updatedAt) " +
      "ON CONFLICT(key) DO UPDATE SET value = @value, updated_at = @updatedAt"
  );
  const tx = getDb().transaction((entries: [string, unknown][]) => {
    for (const [key, value] of entries) {
      upsert.run({ key, value: JSON.stringify(value), updatedAt: now });
    }
  });
  tx(Object.entries(patch));
  return getSettings();
}
