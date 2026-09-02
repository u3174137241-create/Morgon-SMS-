import { getDb } from "../db.js";
import type { Lead, LeadStatus } from "../../core/types.js";

interface LeadRow {
  id: string;
  source: string;
  source_url: string;
  source_title: string | null;
  content_summary: string | null;
  content_hash: string;
  service: string | null;
  category: string | null;
  location: string | null;
  published_at: string | null;
  discovered_at: string;
  age_days: number | null;
  date_confidence: Lead["dateConfidence"];
  intent_score: number;
  freshness_score: number;
  clarity_score: number;
  geography_score: number;
  specificity_score: number;
  commercial_score: number;
  source_score: number;
  lead_score: number;
  classification: Lead["classification"];
  confidence: number;
  estimated_value: Lead["estimatedValue"];
  urgency: Lead["urgency"];
  buyer_type: string | null;
  potential_categories: string;
  why_this_is_a_lead: string | null;
  status: LeadStatus;
  duplicate_of: string | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    source: row.source,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title || "",
    contentSummary: row.content_summary || "",
    contentHash: row.content_hash,
    service: row.service || "",
    category: row.category || "",
    location: row.location || "",
    publishedAt: row.published_at,
    discoveredAt: row.discovered_at,
    ageDays: row.age_days,
    dateConfidence: row.date_confidence,
    intentScore: row.intent_score,
    freshnessScore: row.freshness_score,
    clarityScore: row.clarity_score,
    geographyScore: row.geography_score,
    specificityScore: row.specificity_score,
    commercialScore: row.commercial_score,
    sourceScore: row.source_score,
    leadScore: row.lead_score,
    classification: row.classification,
    confidence: row.confidence,
    estimatedValue: row.estimated_value,
    urgency: row.urgency,
    buyerType: row.buyer_type || "",
    potentialCategories: JSON.parse(row.potential_categories || "[]"),
    whyThisIsALead: row.why_this_is_a_lead || "",
    status: row.status,
    duplicateOf: row.duplicate_of,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findLeadByUrl(sourceUrl: string): Lead | null {
  const row = getDb().prepare("SELECT * FROM leads WHERE source_url = ?").get(sourceUrl) as LeadRow | undefined;
  return row ? toLead(row) : null;
}

export function findLeadByHash(contentHash: string): Lead | null {
  const row = getDb().prepare("SELECT * FROM leads WHERE content_hash = ? ORDER BY created_at DESC LIMIT 1").get(contentHash) as
    | LeadRow
    | undefined;
  return row ? toLead(row) : null;
}

/** Recent non-duplicate leads used for near-duplicate similarity comparison. */
export function listRecentForDedup(sinceIso: string, limit = 300): Lead[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM leads WHERE created_at >= ? AND status != 'DUPLICATE' ORDER BY created_at DESC LIMIT ?`
    )
    .all(sinceIso, limit) as LeadRow[];
  return rows.map(toLead);
}

export function touchLeadSeen(id: string, lastSeenAtIso: string): void {
  getDb().prepare("UPDATE leads SET last_seen_at = ?, updated_at = ? WHERE id = ?").run(lastSeenAtIso, lastSeenAtIso, id);
}

export function insertLead(lead: Lead): void {
  getDb()
    .prepare(
      `INSERT INTO leads (
        id, source, source_url, source_title, content_summary, content_hash, service, category, location,
        published_at, discovered_at, age_days, date_confidence, intent_score, freshness_score, clarity_score,
        geography_score, specificity_score, commercial_score, source_score, lead_score, classification,
        confidence, estimated_value, urgency, buyer_type, potential_categories, why_this_is_a_lead, status,
        duplicate_of, first_seen_at, last_seen_at, created_at, updated_at
      ) VALUES (
        @id, @source, @sourceUrl, @sourceTitle, @contentSummary, @contentHash, @service, @category, @location,
        @publishedAt, @discoveredAt, @ageDays, @dateConfidence, @intentScore, @freshnessScore, @clarityScore,
        @geographyScore, @specificityScore, @commercialScore, @sourceScore, @leadScore, @classification,
        @confidence, @estimatedValue, @urgency, @buyerType, @potentialCategories, @whyThisIsALead, @status,
        @duplicateOf, @firstSeenAt, @lastSeenAt, @createdAt, @updatedAt
      )`
    )
    .run({
      ...lead,
      potentialCategories: JSON.stringify(lead.potentialCategories),
    });
}

export function updateLeadStatus(id: string, status: LeadStatus): Lead | null {
  getDb().prepare("UPDATE leads SET status = ?, updated_at = ? WHERE id = ?").run(status, new Date().toISOString(), id);
  const row = getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id) as LeadRow | undefined;
  return row ? toLead(row) : null;
}

export function getLeadById(id: string): Lead | null {
  const row = getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id) as LeadRow | undefined;
  return row ? toLead(row) : null;
}

export interface LeadListFilter {
  status?: LeadStatus;
  category?: string;
  location?: string;
  minScore?: number;
  limit?: number;
  offset?: number;
}

export function listLeads(filter: LeadListFilter = {}): Lead[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (filter.status) {
    clauses.push("status = @status");
    params.status = filter.status;
  }
  if (filter.category) {
    clauses.push("category = @category");
    params.category = filter.category;
  }
  if (filter.location) {
    clauses.push("location = @location");
    params.location = filter.location;
  }
  if (filter.minScore !== undefined) {
    clauses.push("lead_score >= @minScore");
    params.minScore = filter.minScore;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;
  const rows = getDb()
    .prepare(`SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset }) as LeadRow[];
  return rows.map(toLead);
}

export interface LeadStats {
  hotLeads: number;
  warmLeads: number;
  leadsToday: number;
  leadsThisWeek: number;
  rejected: number;
  duplicates: number;
  totalLeads: number;
}

export function getLeadStats(): LeadStats {
  const db = getDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const count = (sql: string, params: unknown[] = []) => (db.prepare(sql).get(...params) as { n: number }).n;

  return {
    hotLeads: count("SELECT COUNT(*) AS n FROM leads WHERE classification = 'HOT'"),
    warmLeads: count("SELECT COUNT(*) AS n FROM leads WHERE classification IN ('WARM','WARM_POTENTIAL')"),
    leadsToday: count("SELECT COUNT(*) AS n FROM leads WHERE created_at >= ? AND status NOT IN ('DUPLICATE','DISCARDED')", [
      todayStart.toISOString(),
    ]),
    leadsThisWeek: count("SELECT COUNT(*) AS n FROM leads WHERE created_at >= ? AND status NOT IN ('DUPLICATE','DISCARDED')", [
      weekStart.toISOString(),
    ]),
    rejected: count("SELECT COUNT(*) AS n FROM leads WHERE status = 'DISCARDED'"),
    duplicates: count("SELECT COUNT(*) AS n FROM leads WHERE status = 'DUPLICATE'"),
    totalLeads: count("SELECT COUNT(*) AS n FROM leads"),
  };
}
