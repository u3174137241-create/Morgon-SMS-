-- AI Lead Hunter — SQLite schema

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  keywords TEXT NOT NULL DEFAULT '[]',
  buyer_types TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'city',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'UNKNOWN',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_success_at TEXT,
  last_error_at TEXT,
  last_error TEXT,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  categories TEXT NOT NULL DEFAULT '[]',
  locations TEXT NOT NULL DEFAULT '[]',
  queries_executed INTEGER NOT NULL DEFAULT 0,
  candidates_found INTEGER NOT NULL DEFAULT 0,
  leads_accepted INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  rejected INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_title TEXT,
  content_summary TEXT,
  content_hash TEXT NOT NULL,
  service TEXT,
  category TEXT,
  location TEXT,
  published_at TEXT,
  discovered_at TEXT NOT NULL,
  age_days INTEGER,
  date_confidence TEXT NOT NULL DEFAULT 'UNCERTAIN',
  intent_score INTEGER NOT NULL DEFAULT 0,
  freshness_score INTEGER NOT NULL DEFAULT 0,
  clarity_score INTEGER NOT NULL DEFAULT 0,
  geography_score INTEGER NOT NULL DEFAULT 0,
  specificity_score INTEGER NOT NULL DEFAULT 0,
  commercial_score INTEGER NOT NULL DEFAULT 0,
  source_score INTEGER NOT NULL DEFAULT 0,
  lead_score INTEGER NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT 'IGNORE',
  confidence REAL NOT NULL DEFAULT 0,
  estimated_value TEXT NOT NULL DEFAULT 'LOW',
  urgency TEXT NOT NULL DEFAULT 'UNKNOWN',
  buyer_type TEXT,
  potential_categories TEXT NOT NULL DEFAULT '[]',
  why_this_is_a_lead TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  duplicate_of TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_url ON leads(source_url);
CREATE INDEX IF NOT EXISTS idx_leads_hash ON leads(content_hash);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  type TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_lead ON notifications(lead_id);

-- Tracks how well each query template performs per category, so the
-- SearchStrategyEngine can favor templates that historically produce
-- accepted leads (section 5: "AI:n ska kontinuerligt kunna generera nya
-- sökfrågor baserat på vad som fungerar").
CREATE TABLE IF NOT EXISTS query_template_stats (
  template_id TEXT NOT NULL,
  category TEXT NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  accepted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (template_id, category)
);
