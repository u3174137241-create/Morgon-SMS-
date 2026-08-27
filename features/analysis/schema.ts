import { z } from "zod";

/**
 * Schema för den strukturerade JSON Claude måste returnera (kap. 13/23).
 * All AI-output valideras mot detta innan den visas i appen — ogiltig
 * eller ofullständig output ska aldrig nå UI:t som om den vore fakta.
 */

const riskLevel = z.enum(["low", "medium", "high", "unknown"]);

const riskCategorySchema = z.object({
  key: z.enum(["service_history", "mileage", "price", "owner_history", "listing_information"]),
  level: riskLevel,
  note: z.string().nullable(),
});

const priceAssessmentSchema = z.object({
  listed_price: z.number().nullable(),
  estimated_market_min: z.number().nullable(),
  estimated_market_max: z.number().nullable(),
  assessment: z.enum(["cheap", "fair", "expensive", "uncertain"]),
  confidence_note: z.string().nullable(),
});

const negotiationSchema = z.object({
  recommended_offer: z.number().nullable(),
  target_price_min: z.number().nullable(),
  target_price_max: z.number().nullable(),
  arguments: z.array(z.string()).max(6),
});

export const claudeAnalysisSchema = z.object({
  verdict: z.enum(["good_buy", "caution", "avoid"]),
  confidence: z.number().min(0).max(1),
  price_assessment: priceAssessmentSchema,
  risks: z.array(riskCategorySchema),
  missing_information: z.array(z.string()),
  recommended_checks: z.array(z.string()).max(8),
  negotiation: negotiationSchema,
  summary: z.string().max(600),
});

export type ClaudeAnalysisOutput = z.infer<typeof claudeAnalysisSchema>;

export function parseClaudeAnalysis(raw: unknown):
  | { success: true; data: ClaudeAnalysisOutput }
  | { success: false; error: string } {
  const result = claudeAnalysisSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => i.message).join("; ") };
  }
  return { success: true, data: result.data };
}
