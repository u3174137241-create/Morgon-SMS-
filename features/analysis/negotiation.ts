import type { AnalysisResult } from "@/types/analysis";
import { formatSEK } from "@/utils/currency";

/** Genererar ett färdigt, kopierbart meddelande till säljaren utifrån analysen. */
export function buildNegotiationMessage(analysis: AnalysisResult): string {
  const { listing, negotiation } = analysis;
  const carName = [listing.make, listing.model].filter(Boolean).join(" ") || "bilen";
  const offer = negotiation.recommendedOffer;

  const reasonParts: string[] = [];
  if (negotiation.arguments.length > 0) {
    reasonParts.push(negotiation.arguments.slice(0, 2).join(" ").toLowerCase());
  }

  const reasonSentence = reasonParts.length
    ? `Med tanke på ${reasonParts.join(" ")} `
    : "";

  const offerSentence =
    offer != null
      ? `skulle jag kunna erbjuda ${formatSEK(offer)} kontant, betalning direkt vid avtal.`
      : "är jag nyfiken på om priset går att förhandla.";

  return [
    `Hej!`,
    ``,
    `Jag är intresserad av ${carName}. ${reasonSentence}${offerSentence}`,
    ``,
    `Går det bra att jag kommer och tittar/provkör bilen? Hör gärna av dig så bokar vi en tid.`,
    ``,
    `Mvh`,
  ].join("\n");
}
