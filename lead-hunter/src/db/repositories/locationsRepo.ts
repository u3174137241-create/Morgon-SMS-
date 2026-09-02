import { getDb } from "../db.js";
import type { LocationConfig } from "../../core/types.js";

interface LocationRow {
  id: string;
  name: string;
  type: LocationConfig["type"];
  enabled: number;
}

function toLocation(row: LocationRow): LocationConfig {
  return { id: row.id, name: row.name, type: row.type, enabled: !!row.enabled };
}

export function listLocations(onlyEnabled = false): LocationConfig[] {
  const sql = `SELECT * FROM locations${onlyEnabled ? " WHERE enabled = 1" : ""} ORDER BY name`;
  const rows = getDb().prepare(sql).all() as LocationRow[];
  return rows.map(toLocation);
}

export function setLocationEnabled(id: string, enabled: boolean): void {
  getDb().prepare("UPDATE locations SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
}

export function addLocation(loc: LocationConfig): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO locations (id, name, type, enabled, created_at) VALUES (@id, @name, @type, @enabled, @createdAt)
       ON CONFLICT(id) DO UPDATE SET name = @name, type = @type, enabled = @enabled`
    )
    .run({ id: loc.id, name: loc.name, type: loc.type, enabled: loc.enabled ? 1 : 0, createdAt: now });
}

export function deleteLocation(id: string): void {
  getDb().prepare("DELETE FROM locations WHERE id = ?").run(id);
}
