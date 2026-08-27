import type { CarListingInput } from "@/types/car";
import type { AnalysisResult, RiskCategory } from "@/types/analysis";
import { RISK_LABEL } from "@/types/analysis";
import type { ClaudeAnalysisOutput } from "./schema";

function generateId(): string {
  return `an_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Mappar den validerade Claude-JSON:en + rå annonsdata till appens interna AnalysisResult. */
export function mapClaudeOutputToAnalysis(
  output: ClaudeAnalysisOutput,
  listing: CarListingInput
): AnalysisResult {
  const risks: RiskCategory[] = output.risks.map((r) => ({
    key: r.key,
    label: RISK_LABEL[r.key],
    level: r.level,
    note: r.note,
  }));

  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    listing,
    verdict: output.verdict,
    confidence: output.confidence,
    priceAssessment: {
      listedPrice: output.price_assessment.listed_price,
      estimatedMarketMin: output.price_assessment.estimated_market_min,
      estimatedMarketMax: output.price_assessment.estimated_market_max,
      assessment: output.price_assessment.assessment,
      confidenceNote: output.price_assessment.confidence_note,
    },
    risks,
    missingInformation: output.missing_information,
    recommendedChecks: output.recommended_checks,
    negotiation: {
      recommendedOffer: output.negotiation.recommended_offer,
      targetPriceMin: output.negotiation.target_price_min,
      targetPriceMax: output.negotiation.target_price_max,
      arguments: output.negotiation.arguments,
    },
    summary: output.summary,
  };
}
