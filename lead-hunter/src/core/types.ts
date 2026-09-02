// Shared domain types for the AI Lead Hunter system.

export type DateConfidence = "CONFIRMED" | "ESTIMATED" | "UNCERTAIN";

export type LeadClassification = "IGNORE" | "COLD" | "WARM_POTENTIAL" | "WARM" | "HOT";

export type LeadStatus =
  | "NEW"
  | "REVIEWED"
  | "HOT"
  | "WARM"
  | "SOLD"
  | "CONTACTED"
  | "DISCARDED"
  | "DUPLICATE";

export type EstimatedValue = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type Urgency = "ACUTE" | "SOON" | "NORMAL" | "UNKNOWN";

export type Intent = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type SourceQuality = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type SourceType = "web-search" | "public-forums" | "public-pages" | "custom-sources";

export type SearchIntensity = "LOW" | "MEDIUM" | "HIGH";

/** A raw discovery result from a source adapter, before qualification. */
export interface SourceCandidate {
  url: string;
  title: string;
  snippet: string;
  /** Raw text/date hint found near the result (e.g. "2 dagar sedan", "2026-08-30"). */
  publishedHint?: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  query: string;
  category: string;
  location: string;
}

/** Structured AI qualification output for one candidate. */
export interface AiAnalysisResult {
  is_lead: boolean;
  is_spam: boolean;
  has_real_need: boolean;
  is_information_only: boolean;
  category: string;
  service: string;
  location: string | null;
  intent: Intent;
  summary: string;
  urgency: Urgency;
  estimated_value: EstimatedValue;
  value_reasoning: string;
  confidence: number; // 0..1
  buyer_type: string;
  potential_categories: string[];
  why_this_is_a_lead: string;
  clarity: number; // 0..1 — how concrete/specific the need is
  commercial_value: number; // 0..1
  geography_confidence: number; // 0..1
}

export interface FreshnessResult {
  publishedAt: string | null; // ISO date, best guess
  ageDays: number | null;
  dateConfidence: DateConfidence;
}

export interface ScoreBreakdown {
  intentScore: number; // 0-30
  freshnessScore: number; // 0-20
  clarityScore: number; // 0-15
  geographyScore: number; // 0-10
  specificityScore: number; // 0-10
  commercialScore: number; // 0-10
  sourceScore: number; // 0-5
  total: number; // 0-100
  classification: LeadClassification;
}

export interface Category {
  id: string;
  name: string;
  enabled: boolean;
  keywords: string[];
  buyerTypes: string[];
}

export interface LocationConfig {
  id: string;
  name: string;
  type: "country" | "county" | "municipality" | "city" | "district" | "postal";
  enabled: boolean;
}

export interface SourceRecord {
  id: string;
  name: string;
  type: SourceType;
  quality: SourceQuality;
  enabled: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  successCount: number;
  errorCount: number;
}

export interface Lead {
  id: string;
  source: string;
  sourceUrl: string;
  sourceTitle: string;
  contentSummary: string;
  contentHash: string;
  service: string;
  category: string;
  location: string;
  publishedAt: string | null;
  discoveredAt: string;
  ageDays: number | null;
  dateConfidence: DateConfidence;
  intentScore: number;
  freshnessScore: number;
  clarityScore: number;
  geographyScore: number;
  specificityScore: number;
  commercialScore: number;
  sourceScore: number;
  leadScore: number;
  classification: LeadClassification;
  confidence: number;
  estimatedValue: EstimatedValue;
  urgency: Urgency;
  buyerType: string;
  potentialCategories: string[];
  whyThisIsALead: string;
  status: LeadStatus;
  duplicateOf: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  categories: string[];
  locations: string[];
  queriesExecuted: number;
  candidatesFound: number;
  leadsAccepted: number;
  duplicates: number;
  rejected: number;
  errors: number;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  notes: string | null;
}

export interface Settings {
  maxLeadAgeDays: number;
  minScoreNotify: number;
  searchIntervalHours: number;
  searchIntensity: SearchIntensity;
  telegramEnabled: boolean;
  dryRun: boolean;
}
