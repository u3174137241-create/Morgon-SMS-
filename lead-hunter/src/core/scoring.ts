import type { AiAnalysisResult, FreshnessResult, LeadClassification, ScoreBreakdown, SourceQuality } from "./types.js";

const INTENT_BASE: Record<AiAnalysisResult["intent"], number> = { HIGH: 30, MEDIUM: 18, LOW: 9, NONE: 0 };
const VALUE_BASE: Record<AiAnalysisResult["estimated_value"], number> = { VERY_HIGH: 10, HIGH: 7.5, MEDIUM: 5, LOW: 2.5 };
const SOURCE_BASE: Record<SourceQuality, number> = { HIGH: 5, MEDIUM: 3, LOW: 1, UNKNOWN: 2 };

const CONFIDENCE_MULTIPLIER: Record<FreshnessResult["dateConfidence"], number> = {
  CONFIRMED: 1,
  ESTIMATED: 0.85,
  UNCERTAIN: 0.5,
};

/**
 * Section 10: composes the 0-100 lead score from independently-testable
 * sub-scores. Spam / no-real-need candidates are expected to be filtered
 * out by the pipeline before this runs, but the formula degrades safely
 * (near-zero) even if called on one, since intent/commercial contributions
 * collapse to their NONE/LOW bases.
 */
export function computeScore(
  ai: AiAnalysisResult,
  freshness: FreshnessResult,
  maxLeadAgeDays: number,
  sourceQuality: SourceQuality
): ScoreBreakdown {
  const intentScore = Math.round(INTENT_BASE[ai.intent] * (ai.is_spam ? 0 : 1) * (ai.has_real_need ? 1 : 0.4));

  const freshnessScore = Math.round(freshnessSubScore(freshness, maxLeadAgeDays));

  const clarityScore = Math.round(clamp01(ai.clarity) * 15);

  const geographyScore = Math.round(clamp01(ai.geography_confidence) * 10);

  const specificityScore = Math.round(clamp01(ai.clarity * 0.5 + ai.confidence * 0.5) * 10);

  const commercialScore = Math.round(VALUE_BASE[ai.estimated_value] * 0.6 + clamp01(ai.commercial_value) * 10 * 0.4);

  const sourceScore = SOURCE_BASE[sourceQuality];

  const total = Math.max(
    0,
    Math.min(100, intentScore + freshnessScore + clarityScore + geographyScore + specificityScore + commercialScore + sourceScore)
  );

  return {
    intentScore,
    freshnessScore,
    clarityScore,
    geographyScore,
    specificityScore,
    commercialScore,
    sourceScore,
    total,
    classification: classify(total),
  };
}

function freshnessSubScore(freshness: FreshnessResult, maxLeadAgeDays: number): number {
  if (freshness.ageDays === null) {
    // No reliable date signal at all (DATE_UNCERTAIN, no age known) — give
    // a modest, capped score rather than assuming freshness.
    return 20 * 0.4 * CONFIDENCE_MULTIPLIER.UNCERTAIN;
  }
  if (freshness.ageDays > maxLeadAgeDays) return 0;
  const raw = 20 * (1 - freshness.ageDays / (maxLeadAgeDays + 1));
  return Math.max(0, raw) * CONFIDENCE_MULTIPLIER[freshness.dateConfidence];
}

export function classify(total: number): LeadClassification {
  if (total >= 90) return "HOT";
  if (total >= 75) return "WARM";
  if (total >= 60) return "WARM_POTENTIAL";
  if (total >= 40) return "COLD";
  return "IGNORE";
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
