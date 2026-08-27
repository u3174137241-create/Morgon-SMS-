import type { AnalysisResult } from "@/types/analysis";

/**
 * Enkel, lokal jämförelsepoäng (0–10) för att rangordna flera analyserade
 * bilar sinsemellan i Jämför-vyn. Detta är en app-intern sammanvägning för
 * jämförelse — inte ett påstående om verifierade fordonsdata.
 */
export function computeValueScore(analysis: AnalysisResult): number {
  const { priceAssessment, risks } = analysis;
  let score = 6;

  if (priceAssessment.listedPrice != null && priceAssessment.estimatedMarketMin != null && priceAssessment.estimatedMarketMax != null) {
    const center = (priceAssessment.estimatedMarketMin + priceAssessment.estimatedMarketMax) / 2;
    const diffRatio = (center - priceAssessment.listedPrice) / Math.max(1, center);
    score += diffRatio * 12;
  }

  const riskPenalty = risks.reduce((sum, r) => {
    if (r.level === "high") return sum + 1.2;
    if (r.level === "medium") return sum + 0.5;
    if (r.level === "unknown") return sum + 0.3;
    return sum;
  }, 0);
  score -= riskPenalty;

  if (analysis.verdict === "good_buy") score += 1;
  if (analysis.verdict === "avoid") score -= 1.5;

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

export function riskSummaryLabel(analysis: AnalysisResult): string {
  const levels = analysis.risks.map((r) => r.level);
  if (levels.some((l) => l === "high")) return "Hög";
  if (levels.some((l) => l === "medium" || l === "unknown")) return "Medel";
  return "Låg";
}
