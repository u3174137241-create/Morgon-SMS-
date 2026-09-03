// Mirrors the JSON shapes returned by the AI Lead Hunter REST API
// (../../src/core/types.ts and ../../src/server/httpServer.ts on the backend).

export type DateConfidence = "CONFIRMED" | "ESTIMATED" | "UNCERTAIN";
export type LeadClassification = "IGNORE" | "COLD" | "WARM_POTENTIAL" | "WARM" | "HOT";
export type LeadStatus = "NEW" | "REVIEWED" | "HOT" | "WARM" | "SOLD" | "CONTACTED" | "DISCARDED" | "DUPLICATE";
export type EstimatedValue = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
export type Urgency = "ACUTE" | "SOON" | "NORMAL" | "UNKNOWN";
export type SearchIntensity = "LOW" | "MEDIUM" | "HIGH";

export interface Lead {
  id: string;
  source: string;
  sourceUrl: string;
  sourceTitle: string;
  contentSummary: string;
  service: string;
  category: string;
  location: string;
  publishedAt: string | null;
  discoveredAt: string;
  ageDays: number | null;
  dateConfidence: DateConfidence;
  intentScore: number;
  leadScore: number;
  classification: LeadClassification;
  estimatedValue: EstimatedValue;
  urgency: Urgency;
  buyerType: string;
  whyThisIsALead: string;
  status: LeadStatus;
}

export interface SearchRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  queriesExecuted: number;
  candidatesFound: number;
  leadsAccepted: number;
  duplicates: number;
  rejected: number;
  errors: number;
  status: "RUNNING" | "COMPLETED" | "FAILED";
}

export interface SourceRecord {
  id: string;
  name: string;
  type: string;
  quality: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  successCount: number;
  errorCount: number;
}

export interface NotificationRecord {
  id: string;
  leadId: string | null;
  type: "HOT_LEAD" | "DIGEST";
  sentAt: string;
  success: boolean;
  error: string | null;
  message: string;
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

export interface Settings {
  maxLeadAgeDays: number;
  minScoreNotify: number;
  searchIntervalHours: number;
  searchIntensity: SearchIntensity;
  telegramEnabled: boolean;
  dryRun: boolean;
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
  type: string;
  enabled: boolean;
}

export interface HealthStatus {
  ok: boolean;
  aiClient: string;
  telegramConfigured: boolean;
  dryRun: boolean;
  searching: boolean;
  protected: boolean;
}

export const LEAD_STATUSES: LeadStatus[] = ["NEW", "REVIEWED", "HOT", "WARM", "SOLD", "CONTACTED", "DISCARDED", "DUPLICATE"];
