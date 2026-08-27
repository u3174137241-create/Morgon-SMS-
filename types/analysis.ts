import type { CarListingInput } from "./car";

export type Verdict = "good_buy" | "caution" | "avoid";

export type PriceAssessment = "cheap" | "fair" | "expensive" | "uncertain";

export type RiskLevel = "low" | "medium" | "high" | "unknown";

export interface RiskCategory {
  key: "service_history" | "mileage" | "price" | "owner_history" | "listing_information";
  label: string;
  level: RiskLevel;
  note: string | null;
}

export interface PriceAssessmentResult {
  listedPrice: number | null;
  estimatedMarketMin: number | null;
  estimatedMarketMax: number | null;
  assessment: PriceAssessment;
  confidenceNote: string | null;
}

export interface NegotiationResult {
  recommendedOffer: number | null;
  targetPriceMin: number | null;
  targetPriceMax: number | null;
  arguments: string[];
}

/**
 * Strukturerad, validerad utdata från AI-analysmotorn.
 * Motsvarar exakt schemat som skickas till/valideras från Claude — se features/analysis/schema.ts.
 */
export interface AnalysisResult {
  id: string;
  createdAt: string;
  listing: CarListingInput;

  verdict: Verdict;
  confidence: number;

  priceAssessment: PriceAssessmentResult;
  risks: RiskCategory[];
  missingInformation: string[];
  recommendedChecks: string[];
  negotiation: NegotiationResult;
  summary: string;

  isDemo?: boolean;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  good_buy: "Bra köp",
  caution: "Var försiktig",
  avoid: "Avstå",
};

export const RISK_LABEL: Record<RiskCategory["key"], string> = {
  service_history: "Servicehistorik",
  mileage: "Miltal",
  price: "Pris",
  owner_history: "Ägarhistorik",
  listing_information: "Annonsinformation",
};
