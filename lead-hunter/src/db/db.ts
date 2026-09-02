import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { DEFAULT_SETTINGS } from "../config/env.js";
import { DEFAULT_CATEGORIES } from "../config/categories.js";
import { DEFAULT_LOCATIONS } from "../config/locations.js";
import { logger } from "../logging/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(env.dbPath);
  fs.mkdirSync(dir, { recursive: true });

  db = new Database(env.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);

  seedDefaults(db);
  return db;
}

function seedDefaults(database: Database.Database) {
  const now = new Date().toISOString();

  const categoryCount = (database.prepare("SELECT COUNT(*) AS n FROM categories").get() as { n: number }).n;
  if (categoryCount === 0) {
    const insert = database.prepare(
      "INSERT INTO categories (id, name, enabled, keywords, buyer_types, created_at) VALUES (@id, @name, 1, @keywords, @buyerTypes, @createdAt)"
    );
    const tx = database.transaction((rows: typeof DEFAULT_CATEGORIES) => {
      for (const c of rows) {
        insert.run({
          id: c.id,
          name: c.name,
          keywords: JSON.stringify(c.keywords),
          buyerTypes: JSON.stringify(c.buyerTypes),
          createdAt: now,
        });
      }
    });
    tx(DEFAULT_CATEGORIES);
    logger.info("SEARCH_STARTED", `Seeded ${DEFAULT_CATEGORIES.length} default categories`);
  }

  const locationCount = (database.prepare("SELECT COUNT(*) AS n FROM locations").get() as { n: number }).n;
  if (locationCount === 0) {
    const insert = database.prepare(
      "INSERT INTO locations (id, name, type, enabled, created_at) VALUES (@id, @name, @type, 1, @createdAt)"
    );
    const tx = database.transaction((rows: typeof DEFAULT_LOCATIONS) => {
      for (const l of rows) insert.run({ id: l.id, name: l.name, type: l.type, createdAt: now });
    });
    tx(DEFAULT_LOCATIONS);
    logger.info("SEARCH_STARTED", `Seeded ${DEFAULT_LOCATIONS.length} default locations`);
  }

  const settingsCount = (database.prepare("SELECT COUNT(*) AS n FROM settings").get() as { n: number }).n;
  if (settingsCount === 0) {
    const insert = database.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)");
    const tx = database.transaction(() => {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        insert.run(key, JSON.stringify(value), now);
      }
    });
    tx();
    logger.info("SEARCH_STARTED", "Seeded default settings");
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
