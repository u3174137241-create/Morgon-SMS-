import type { AiAnalysisResult, Category, LocationConfig } from "../core/types.js";

const INTENTS = ["HIGH", "MEDIUM", "LOW", "NONE"] as const;
const URGENCIES = ["ACUTE", "SOON", "NORMAL", "UNKNOWN"] as const;
const VALUES = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH"] as const;

/**
 * Extracts a JSON object from a raw LLM text response, tolerating markdown
 * code fences and leading/trailing prose. Returns null if nothing parseable
 * is found — callers must treat that as a qualification failure, never
 * guess at a result.
 */
export function extractJson(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Validates and coerces an arbitrary parsed JSON value into a well-formed
 * AiAnalysisResult, substituting safe fallbacks (never throwing) for any
 * field that is missing or out of range — an LLM's structured output can't
 * be trusted blindly.
 */
export function normalizeAiAnalysis(
  raw: unknown,
  context: { category: Category; location: LocationConfig }
): AiAnalysisResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<AiAnalysisResult>;
  return {
    is_lead: Boolean(r.is_lead),
    is_spam: Boolean(r.is_spam),
    has_real_need: Boolean(r.has_real_need),
    is_information_only: Boolean(r.is_information_only),
    category: typeof r.category === "string" && r.category ? r.category : context.category.id,
    service: typeof r.service === "string" && r.service ? r.service : context.category.name,
    location: typeof r.location === "string" ? r.location : null,
    intent: (INTENTS as readonly string[]).includes(r.intent as string) ? (r.intent as AiAnalysisResult["intent"]) : "NONE",
    summary: String(r.summary || "").slice(0, 400),
    urgency: (URGENCIES as readonly string[]).includes(r.urgency as string) ? (r.urgency as AiAnalysisResult["urgency"]) : "UNKNOWN",
    estimated_value: (VALUES as readonly string[]).includes(r.estimated_value as string)
      ? (r.estimated_value as AiAnalysisResult["estimated_value"])
      : "MEDIUM",
    value_reasoning: String(r.value_reasoning || ""),
    confidence: clamp01(Number(r.confidence ?? 0.5)),
    buyer_type: typeof r.buyer_type === "string" && r.buyer_type ? r.buyer_type : context.category.buyerTypes[0] || "Okänd",
    potential_categories: Array.isArray(r.potential_categories) ? (r.potential_categories as string[]) : context.category.buyerTypes,
    why_this_is_a_lead: String(r.why_this_is_a_lead || ""),
    clarity: clamp01(Number(r.clarity ?? 0.5)),
    commercial_value: clamp01(Number(r.commercial_value ?? 0.5)),
    geography_confidence: clamp01(Number(r.geography_confidence ?? 0.5)),
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}
