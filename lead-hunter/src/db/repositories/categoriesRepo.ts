import { getDb } from "../db.js";
import type { Category } from "../../core/types.js";

interface CategoryRow {
  id: string;
  name: string;
  enabled: number;
  keywords: string;
  buyer_types: string;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    enabled: !!row.enabled,
    keywords: JSON.parse(row.keywords),
    buyerTypes: JSON.parse(row.buyer_types),
  };
}

export function listCategories(onlyEnabled = false): Category[] {
  const sql = `SELECT * FROM categories${onlyEnabled ? " WHERE enabled = 1" : ""} ORDER BY name`;
  const rows = getDb().prepare(sql).all() as CategoryRow[];
  return rows.map(toCategory);
}

export function getCategory(id: string): Category | null {
  const row = getDb().prepare("SELECT * FROM categories WHERE id = ?").get(id) as CategoryRow | undefined;
  return row ? toCategory(row) : null;
}

export function setCategoryEnabled(id: string, enabled: boolean): void {
  getDb().prepare("UPDATE categories SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
}

export function upsertCategory(cat: Category): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO categories (id, name, enabled, keywords, buyer_types, created_at)
       VALUES (@id, @name, @enabled, @keywords, @buyerTypes, @createdAt)
       ON CONFLICT(id) DO UPDATE SET name = @name, enabled = @enabled, keywords = @keywords, buyer_types = @buyerTypes`
    )
    .run({
      id: cat.id,
      name: cat.name,
      enabled: cat.enabled ? 1 : 0,
      keywords: JSON.stringify(cat.keywords),
      buyerTypes: JSON.stringify(cat.buyerTypes),
      createdAt: now,
    });
}

export function deleteCategory(id: string): void {
  getDb().prepare("DELETE FROM categories WHERE id = ?").run(id);
}
