import { randomUUID } from "node:crypto";
import { logger } from "../logging/logger.js";
import { listCategories } from "../db/repositories/categoriesRepo.js";
import { listLocations } from "../db/repositories/locationsRepo.js";
import { getSettings } from "../db/repositories/settingsRepo.js";
import { getMeta, setMeta } from "../db/repositories/metaRepo.js";
import {
  ensureSource,
  listSources,
  recordSourceError,
  recordSourceSuccess,
} from "../db/repositories/sourcesRepo.js";
import {
  findLeadByHash,
  findLeadByUrl,
  insertLead,
  listRecentForDedup,
  touchLeadSeen,
} from "../db/repositories/leadsRepo.js";
import { createSearchRun, finishSearchRun } from "../db/repositories/searchRunsRepo.js";
import { recordTemplateUse } from "../db/repositories/queryStatsRepo.js";
import { generateQueries, type GeneratedQuery } from "./searchStrategyEngine.js";
import { SOURCE_ADAPTERS } from "../sources/registry.js";
import { computeFreshness } from "./freshness.js";
import { computeScore } from "./scoring.js";
import { computeContentHash, normalizeUrl, textSimilarity, isNearDuplicate } from "./dedup.js";
import { analyzeCandidate } from "../ai/index.js";
import { sendTelegramMessage } from "../notify/telegram.js";
import { formatLeadNotification } from "../notify/formatter.js";
import type { Category, Lead, LeadStatus, LocationConfig, SearchIntensity, SourceQuality } from "./types.js";

const GLOBAL_QUERY_CAP: Record<SearchIntensity, number> = { LOW: 15, MEDIUM: 30, HIGH: 60 };
const DEDUP_LOOKBACK_DAYS = 14;

export interface PipelineResult {
  runId: string;
  queriesExecuted: number;
  candidatesFound: number;
  leadsAccepted: number;
  duplicates: number;
  rejected: number;
  errors: number;
}

export async function runSearch(): Promise<PipelineResult> {
  const settings = getSettings();
  const categories = listCategories(true);
  const locations = listLocations(true);

  for (const adapter of SOURCE_ADAPTERS) {
    ensureSource(adapter.id, adapter.name, adapter.type, adapter.defaultQuality);
  }
  const sourceQuality = new Map<string, SourceQuality>(listSources().map((s) => [s.id, s.quality]));

  const runId = `run_${Date.now()}_${randomUUID().slice(0, 8)}`;
  createSearchRun(
    runId,
    categories.map((c) => c.id),
    locations.map((l) => l.id)
  );
  logger.info("SEARCH_STARTED", `Search run ${runId} started`, {
    categories: categories.length,
    locations: locations.length,
    intensity: settings.searchIntensity,
  });

  const stats = { queriesExecuted: 0, candidatesFound: 0, leadsAccepted: 0, duplicates: 0, rejected: 0, errors: 0 };
  const acceptedThisRun: Lead[] = [];

  if (categories.length === 0 || locations.length === 0) {
    finishSearchRun(runId, stats, "COMPLETED", "No enabled categories or locations — nothing to search.");
    logger.warn("SEARCH_FINISHED", "No enabled categories/locations; run skipped");
    return { runId, ...stats };
  }

  const allQueries = generateQueries(categories, locations, settings.searchIntensity);
  const cap = GLOBAL_QUERY_CAP[settings.searchIntensity] ?? GLOBAL_QUERY_CAP.MEDIUM;
  const queries = selectQueriesForRun(allQueries, cap);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const recentLeads = listRecentForDedup(new Date(Date.now() - DEDUP_LOOKBACK_DAYS * 86_400_000).toISOString());

  for (const adapter of SOURCE_ADAPTERS) {
    logger.info("SOURCE_STARTED", `Running ${adapter.name}`, { queries: queries.length });

    for (const gq of queries) {
      const category = categoryById.get(gq.category);
      const location = locationById.get(gq.location);
      if (!category || !location) continue;

      let rawCandidates: Awaited<ReturnType<typeof adapter.search>>;
      try {
        rawCandidates = await adapter.search(gq.query, { category: category.id, location: location.id });
        recordSourceSuccess(adapter.id);
        stats.queriesExecuted++;
        logger.debug("QUERY_EXECUTED", gq.query, { source: adapter.id, results: rawCandidates.length });
      } catch (err) {
        const message = String((err as Error)?.message || err);
        recordSourceError(adapter.id, message);
        stats.errors++;
        logger.warn("SOURCE_ERROR", `${adapter.name} failed for query, skipping to next`, { query: gq.query, error: message });
        continue; // a single source failure must never abort the whole run (section 23)
      }

      for (const raw of rawCandidates) {
        stats.candidatesFound++;
        logger.debug("CANDIDATE_FOUND", raw.title, { url: raw.url, source: adapter.id });

        const outcome = await processCandidate({
          raw,
          adapter,
          category,
          location,
          gq,
          settings,
          sourceQuality: sourceQuality.get(adapter.id) ?? adapter.defaultQuality,
          recentLeads,
        });

        if (outcome.kind === "duplicate") stats.duplicates++;
        else if (outcome.kind === "rejected" || outcome.kind === "stale") stats.rejected++;
        else if (outcome.kind === "accepted") {
          stats.leadsAccepted++;
          recentLeads.unshift(outcome.lead);
          acceptedThisRun.push(outcome.lead);
        }
      }
    }
  }

  // Notify for leads meeting the score threshold (section 10/14) — never
  // for duplicates, stale, spam, or below-threshold candidates.
  if (settings.telegramEnabled) {
    for (const lead of acceptedThisRun) {
      if (lead.leadScore >= settings.minScoreNotify) {
        await sendTelegramMessage(formatLeadNotification(lead), { leadId: lead.id, type: "HOT_LEAD" });
      }
    }
  }

  finishSearchRun(runId, stats, "COMPLETED");
  logger.info("SEARCH_FINISHED", `Search run ${runId} completed`, stats);

  return { runId, ...stats };
}

function selectQueriesForRun(all: GeneratedQuery[], cap: number): GeneratedQuery[] {
  if (all.length <= cap) return all;
  const cursor = getMeta<number>("query_cursor", 0);
  const slice: GeneratedQuery[] = [];
  for (let i = 0; i < cap; i++) slice.push(all[(cursor + i) % all.length]);
  setMeta("query_cursor", (cursor + cap) % all.length);
  return slice;
}

type CandidateOutcome =
  | { kind: "duplicate" }
  | { kind: "stale" }
  | { kind: "rejected" }
  | { kind: "accepted"; lead: Lead };

async function processCandidate(params: {
  raw: { url: string; title: string; snippet: string; publishedHint?: string };
  adapter: (typeof SOURCE_ADAPTERS)[number];
  category: Category;
  location: LocationConfig;
  gq: GeneratedQuery;
  settings: ReturnType<typeof getSettings>;
  sourceQuality: SourceQuality;
  recentLeads: Lead[];
}): Promise<CandidateOutcome> {
  const { raw, adapter, category, location, gq, settings, sourceQuality, recentLeads } = params;
  const url = normalizeUrl(raw.url);
  const now = new Date();

  const existingByUrl = findLeadByUrl(url);
  if (existingByUrl) {
    touchLeadSeen(existingByUrl.id, now.toISOString());
    logger.debug("DUPLICATE", "Same URL already known", { url });
    return { kind: "duplicate" };
  }

  const contentHash = computeContentHash(raw.title, raw.snippet);
  const existingByHash = findLeadByHash(contentHash);
  if (existingByHash) {
    touchLeadSeen(existingByHash.id, now.toISOString());
    logger.debug("DUPLICATE", "Identical content already known", { url });
    return { kind: "duplicate" };
  }

  const candidateText = `${raw.title} ${raw.snippet}`;
  for (const existing of recentLeads) {
    if (existing.category !== category.id) continue;
    if (isNearDuplicate(candidateText, `${existing.sourceTitle} ${existing.contentSummary}`)) {
      touchLeadSeen(existing.id, now.toISOString());
      logger.debug("DUPLICATE", "Near-duplicate text of an existing lead", {
        url,
        similarTo: existing.sourceUrl,
        similarity: textSimilarity(candidateText, `${existing.sourceTitle} ${existing.contentSummary}`),
      });
      return { kind: "duplicate" };
    }
  }

  const freshness = computeFreshness(raw, now);
  if (freshness.ageDays !== null && freshness.ageDays > settings.maxLeadAgeDays) {
    logger.debug("STALE_SKIPPED", `Older than ${settings.maxLeadAgeDays} days`, { url, ageDays: freshness.ageDays });
    return { kind: "stale" };
  }

  let ai;
  try {
    ai = await analyzeCandidate(
      { title: raw.title, snippet: raw.snippet, url: raw.url, matchedKeyword: gq.keyword },
      { category, location, maxLeadAgeDays: settings.maxLeadAgeDays }
    );
    logger.debug("AI_ANALYSIS", `is_lead=${ai.is_lead} intent=${ai.intent}`, { url });
  } catch (err) {
    logger.error("ERROR", "AI qualification failed entirely (fallback also failed)", { url, error: String(err) });
    return { kind: "rejected" };
  }

  const score = computeScore(ai, freshness, settings.maxLeadAgeDays, sourceQuality);
  const accepted = ai.is_lead && !ai.is_spam && score.classification !== "IGNORE";
  recordTemplateUse(gq.templateId, category.id, accepted);

  const status: LeadStatus = accepted ? "NEW" : "DISCARDED";
  const nowIso = now.toISOString();

  const lead: Lead = {
    id: `lead_${Date.now()}_${randomUUID().slice(0, 8)}`,
    source: adapter.id,
    sourceUrl: url,
    sourceTitle: raw.title,
    contentSummary: ai.summary || raw.snippet.slice(0, 400),
    contentHash,
    service: ai.service || category.name,
    category: category.id,
    location: ai.location || location.name,
    publishedAt: freshness.publishedAt,
    discoveredAt: nowIso,
    ageDays: freshness.ageDays,
    dateConfidence: freshness.dateConfidence,
    intentScore: score.intentScore,
    freshnessScore: score.freshnessScore,
    clarityScore: score.clarityScore,
    geographyScore: score.geographyScore,
    specificityScore: score.specificityScore,
    commercialScore: score.commercialScore,
    sourceScore: score.sourceScore,
    leadScore: score.total,
    classification: score.classification,
    confidence: ai.confidence,
    estimatedValue: ai.estimated_value,
    urgency: ai.urgency,
    buyerType: ai.buyer_type,
    potentialCategories: ai.potential_categories,
    whyThisIsALead: ai.why_this_is_a_lead,
    status,
    duplicateOf: null,
    firstSeenAt: nowIso,
    lastSeenAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  insertLead(lead);

  if (accepted) {
    logger.info("LEAD_ACCEPTED", `${lead.service} / ${lead.location} — score ${lead.leadScore}`, { url, classification: lead.classification });
  } else {
    logger.info("LEAD_REJECTED", ai.is_spam ? "Classified as spam/advertising" : "No real buying intent found", { url });
  }

  return accepted ? { kind: "accepted", lead } : { kind: "rejected" };
}
