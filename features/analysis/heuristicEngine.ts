import type { CarListingInput } from "@/types/car";
import type { ClaudeAnalysisOutput } from "./schema";

/**
 * Lokal, regelbaserad analysmotor som används ENDAST i demo-läge (när ingen
 * Supabase/Claude-backend är konfigurerad, se services/analysisService.ts).
 * Den ersätter inte Claude — den simulerar samma utdataform så att hela
 * appflödet går att testa end-to-end, och är tydligt transparent om att den
 * uppskattar snarare än vet.
 */

const BASE_VALUE_BY_MAKE: Record<string, number> = {
  volvo: 260000,
  bmw: 280000,
  audi: 270000,
  toyota: 250000,
  volkswagen: 230000,
  mercedes: 300000,
  skoda: 200000,
  kia: 190000,
  hyundai: 190000,
};

function estimateMarketValue(listing: CarListingInput): { min: number; max: number } | null {
  if (!listing.make || !listing.modelYear) return null;
  const base = BASE_VALUE_BY_MAKE[listing.make.toLowerCase().trim()] ?? 220000;
  const age = Math.max(0, new Date().getFullYear() - listing.modelYear);
  const ageDepreciation = Math.pow(0.88, age);
  const mileage = listing.mileageKm ?? age * 15000;
  const mileagePenalty = Math.max(0.55, 1 - mileage / 400000);
  const center = base * ageDepreciation * mileagePenalty;
  return { min: Math.round((center * 0.92) / 1000) * 1000, max: Math.round((center * 1.08) / 1000) * 1000 };
}

export function runHeuristicAnalysis(listing: CarListingInput): ClaudeAnalysisOutput {
  const missing: string[] = [];
  if (!listing.make || !listing.model) missing.push("Märke/modell");
  if (!listing.modelYear) missing.push("Årsmodell");
  if (!listing.mileageKm) missing.push("Miltal");
  if (!listing.price) missing.push("Pris");
  if (!listing.ownerCount) missing.push("Antal tidigare ägare");
  if (!listing.serviceHistoryNotes) missing.push("Servicehistorik");

  const market = estimateMarketValue(listing);
  const hasEnoughForPricing = market != null && listing.price != null;

  let assessment: ClaudeAnalysisOutput["price_assessment"]["assessment"] = "uncertain";
  if (hasEnoughForPricing && market && listing.price != null) {
    if (listing.price < market.min) assessment = "cheap";
    else if (listing.price > market.max) assessment = "expensive";
    else assessment = "fair";
  }

  const risks: ClaudeAnalysisOutput["risks"] = [
    {
      key: "service_history",
      level: listing.serviceHistoryNotes ? "low" : "unknown",
      note: listing.serviceHistoryNotes ? "Servicehistorik angiven i annonsen." : "Ingen servicehistorik angiven.",
    },
    {
      key: "mileage",
      level: listing.mileageKm && listing.modelYear && listing.mileageKm / Math.max(1, new Date().getFullYear() - listing.modelYear) > 25000 ? "medium" : "low",
      note: listing.mileageKm ? null : "Miltal saknas.",
    },
    {
      key: "price",
      level: assessment === "expensive" ? "high" : assessment === "uncertain" ? "unknown" : "low",
      note: null,
    },
    {
      key: "owner_history",
      level: listing.ownerCount ? (listing.ownerCount > 3 ? "medium" : "low") : "unknown",
      note: listing.ownerCount ? null : "Antal ägare saknas.",
    },
    {
      key: "listing_information",
      level: (listing.description?.length ?? 0) > 60 ? "low" : "medium",
      note: (listing.description?.length ?? 0) > 60 ? null : "Kort eller sparsam annonsbeskrivning.",
    },
  ];

  const highRiskCount = risks.filter((r) => r.level === "high").length;
  const mediumOrUnknownCount = risks.filter((r) => r.level === "medium" || r.level === "unknown").length;

  let verdict: ClaudeAnalysisOutput["verdict"] = "caution";
  if (assessment === "expensive" || highRiskCount >= 1) verdict = highRiskCount >= 2 || assessment === "expensive" ? "avoid" : "caution";
  else if ((assessment === "fair" || assessment === "cheap") && mediumOrUnknownCount <= 1) verdict = "good_buy";

  const confidence = Math.max(0.35, 0.9 - missing.length * 0.09);

  const recommendedChecks = [
    "Be om dokumentation för senaste service.",
    "Kontrollera besiktningshistorik och eventuella anmärkningar.",
    "Provkör bilen och lyssna efter avvikande ljud.",
  ];
  if (!listing.ownerCount) recommendedChecks.push("Fråga säljaren om antal tidigare ägare.");

  const offerBase = listing.price ?? market?.max ?? null;
  const recommendedOffer = offerBase != null ? Math.round((offerBase * 0.93) / 1000) * 1000 : null;

  return {
    verdict,
    confidence: Math.round(confidence * 100) / 100,
    price_assessment: {
      listed_price: listing.price,
      estimated_market_min: market?.min ?? null,
      estimated_market_max: market?.max ?? null,
      assessment: hasEnoughForPricing ? assessment : "uncertain",
      confidence_note: hasEnoughForPricing
        ? null
        : "Prisbedömningen är osäker eftersom vi saknar tillräckligt med jämförelsedata.",
    },
    risks,
    missing_information: missing,
    recommended_checks: recommendedChecks,
    negotiation: {
      recommended_offer: recommendedOffer,
      target_price_min: recommendedOffer,
      target_price_max: offerBase != null ? Math.round((offerBase * 0.97) / 1000) * 1000 : null,
      arguments: [
        !listing.serviceHistoryNotes ? "Servicehistoriken är inte dokumenterad." : null,
        !listing.ownerCount ? "Antal tidigare ägare framgår inte av annonsen." : null,
        assessment === "expensive" ? "Priset ligger över uppskattat marknadsvärde." : null,
      ].filter((x): x is string => x != null),
    },
    summary:
      missing.length > 2
        ? "Annonsen saknar flera viktiga uppgifter, vilket gör bedömningen mer osäker. Komplettera informationen för ett säkrare underlag."
        : hasEnoughForPricing
          ? `Priset bedöms som ${assessment === "fair" ? "rimligt" : assessment === "cheap" ? "förmånligt" : "högt"} givet tillgänglig information.`
          : "Vi saknar tillräckligt med jämförelsedata för en säker prisbedömning.",
  };
}
