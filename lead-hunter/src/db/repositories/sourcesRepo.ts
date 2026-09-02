import { getDb } from "../db.js";
import type { SourceRecord, SourceType, SourceQuality } from "../../core/types.js";

interface SourceRow {
  id: string;
  name: string;
  type: SourceType;
  quality: SourceQuality;
  enabled: number;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  success_count: number;
  error_count: number;
}

function toSource(row: SourceRow): SourceRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    quality: row.quality,
    enabled: !!row.enabled,
    lastSuccessAt: row.last_success_at,
    lastErrorAt: row.last_error_at,
    lastError: row.last_error,
    successCount: row.success_count,
    errorCount: row.error_count,
  };
}

export function ensureSource(id: string, name: string, type: SourceType, quality: SourceQuality): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO sources (id, name, type, quality, enabled, created_at) VALUES (@id, @name, @type, @quality, 1, @createdAt)
       ON CONFLICT(id) DO NOTHING`
    )
    .run({ id, name, type, quality, createdAt: now });
}

export function listSources(): SourceRecord[] {
  return (getDb().prepare("SELECT * FROM sources ORDER BY name").all() as SourceRow[]).map(toSource);
}

export function recordSourceSuccess(id: string): void {
  getDb()
    .prepare("UPDATE sources SET success_count = success_count + 1, last_success_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
}

export function recordSourceError(id: string, error: string): void {
  getDb()
    .prepare("UPDATE sources SET error_count = error_count + 1, last_error_at = ?, last_error = ? WHERE id = ?")
    .run(new Date().toISOString(), error.slice(0, 500), id);
}
