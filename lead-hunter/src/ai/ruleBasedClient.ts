import type { AiClient, AiCandidateInput, AiContext } from "./aiClient.js";
import type { AiAnalysisResult } from "../core/types.js";

// Section 5/32: intent-bearing phrases the free fallback looks for. Kept in
// sync (loosely) with the SearchStrategyEngine's query templates.
const INTENT_PHRASES = [
  "behöver", "söker", "letar efter", "någon som kan", "tips på", "tips på firma",
  "rekommendera", "vem kan", "vem rekommenderar", "hjälp med", "offert", "offerter",
  "vill anlita", "vill ha hjälp", "kan någon", "looking for",
];

const URGENCY_ACUTE = ["akut", "asap", "omgående", "nu direkt", "så fort som möjligt"];
const URGENCY_SOON = ["snarast", "snart", "inom kort", "denna vecka"];

// Signals that the text is talking ABOUT someone else's past experience,
// not expressing the author's own current need (section 32: "Min kompis
// renoverade sitt badrum." → IGNORE).
const THIRD_PARTY_PAST_TENSE = [
  /min (kompis|vän|granne|kollega)[^.!?]{0,40}(renoverade|fixade|gjorde|anlitade|byggde|målade)/i,
  /(hans|hennes|deras) [^.!?]{0,40}(renoverade|fixade|gjorde|anlitade|byggde|målade)/i,
];

// Business/advertiser language — the poster is a company promoting itself,
// not a customer with a need (section 4: don't treat ads as leads).
const SPAM_PATTERNS = [
  /vi (erbjuder|utför|hjälper er med|söker nya kunder)/i,
  /kontakta oss (för|idag)/i,
  /boka (nu|idag)/i,
  /\d+\s?%\s?rabatt/i,
  /annons(era)?/i,
];

const PURE_PRICE_QUESTION = /vad kostar|hur mycket kostar/i;

export const ruleBasedClient: AiClient = {
  name: "rule-based-fallback",
  isExternal: false,

  async analyze(candidate: AiCandidateInput, context: AiContext): Promise<AiAnalysisResult> {
    const text = `${candidate.title} ${candidate.snippet}`.toLowerCase();

    const isSpam = SPAM_PATTERNS.some((re) => re.test(text));
    const isThirdParty = THIRD_PARTY_PAST_TENSE.some((re) => re.test(text));
    const intentPhraseHits = INTENT_PHRASES.filter((p) => text.includes(p)).length;
    const hasServiceKeyword = text.includes(candidate.matchedKeyword.toLowerCase());
    const isPureQuestion = PURE_PRICE_QUESTION.test(text) && intentPhraseHits === 0;

    const isUrgentAcute = URGENCY_ACUTE.some((p) => text.includes(p));
    const isUrgentSoon = URGENCY_SOON.some((p) => text.includes(p));
    const urgency: AiAnalysisResult["urgency"] = isUrgentAcute ? "ACUTE" : isUrgentSoon ? "SOON" : "UNKNOWN";

    const hasRealNeed = !isSpam && !isThirdParty && (intentPhraseHits > 0 || isPureQuestion) && hasServiceKeyword;
    const isLead = hasRealNeed;

    let intent: AiAnalysisResult["intent"] = "NONE";
    if (isThirdParty || isSpam) intent = "NONE";
    else if (intentPhraseHits > 0 && hasServiceKeyword) intent = "HIGH";
    else if (isPureQuestion && hasServiceKeyword) intent = "LOW";
    else if (hasServiceKeyword) intent = "MEDIUM";

    const locationMentioned = context.location.type !== "country" && text.includes(context.location.name.toLowerCase());

    let clarity = 0.3;
    if (hasServiceKeyword) clarity += 0.25;
    if (locationMentioned) clarity += 0.2;
    if (candidate.snippet.length > 60) clarity += 0.15;
    if (intentPhraseHits > 1) clarity += 0.1;
    clarity = Math.min(1, clarity);

    const estimatedValue = estimateValue(context.category.id, urgency);

    return {
      is_lead: isLead,
      is_spam: isSpam,
      has_real_need: hasRealNeed,
      is_information_only: isPureQuestion && !hasRealNeed,
      category: context.category.id,
      service: context.category.name,
      location: locationMentioned ? context.location.name : context.location.type === "country" ? null : context.location.name,
      intent,
      summary: (candidate.snippet || candidate.title).slice(0, 240),
      urgency,
      estimated_value: estimatedValue,
      value_reasoning: `Heuristisk uppskattning baserad på kategori "${context.category.name}" och brådska (${urgency}).`,
      confidence: 0.5, // rule-based is inherently less confident than an LLM read
      buyer_type: context.category.buyerTypes[0] || "Okänd",
      potential_categories: context.category.buyerTypes,
      why_this_is_a_lead: isLead
        ? `Texten innehåller köpintention ("${INTENT_PHRASES.find((p) => text.includes(p)) || "fråga"}") kopplat till "${candidate.matchedKeyword}".`
        : "Ingen tydlig köpintention hittades av regelbaserad analys.",
      clarity,
      commercial_value: estimatedValue === "VERY_HIGH" ? 0.9 : estimatedValue === "HIGH" ? 0.7 : estimatedValue === "MEDIUM" ? 0.45 : 0.2,
      geography_confidence: locationMentioned ? 0.9 : context.location.type === "country" ? 0.5 : 0.3,
    };
  },
};

// Conservative, non-monetary value tiers per section 19 — never invents a price.
const HIGH_VALUE_CATEGORIES = new Set(["taklaggning", "bygg", "renovering", "koksrenovering", "fasad", "markarbete"]);
const LOW_VALUE_CATEGORIES = new Set(["fonsterputs", "hemstadning", "dack", "bilvard"]);

function estimateValue(categoryId: string, urgency: AiAnalysisResult["urgency"]): AiAnalysisResult["estimated_value"] {
  if (HIGH_VALUE_CATEGORIES.has(categoryId)) return urgency === "ACUTE" ? "VERY_HIGH" : "HIGH";
  if (LOW_VALUE_CATEGORIES.has(categoryId)) return "LOW";
  return "MEDIUM";
}
