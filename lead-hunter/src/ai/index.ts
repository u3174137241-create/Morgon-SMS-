import type { AiClient, AiCandidateInput, AiContext } from "./aiClient.js";
import type { AiAnalysisResult } from "../core/types.js";
import { anthropicClient } from "./anthropicClient.js";
import { ruleBasedClient } from "./ruleBasedClient.js";
import { env } from "../config/env.js";
import { logger } from "../logging/logger.js";

const primary: AiClient | null = env.anthropicApiKey ? anthropicClient : null;

export function activeAiClientName(): string {
  return primary ? `${primary.name} (fallback: ${ruleBasedClient.name})` : ruleBasedClient.name;
}

/**
 * Qualifies one candidate. Prefers the Anthropic client when an API key is
 * configured; on ANY failure (network, bad JSON, rate limit) it falls back
 * to the free rule-based client rather than dropping the candidate — a
 * single external service outage must never take down the whole pipeline
 * (section 23).
 */
export async function analyzeCandidate(candidate: AiCandidateInput, context: AiContext): Promise<AiAnalysisResult> {
  if (primary) {
    try {
      return await primary.analyze(candidate, context);
    } catch (err) {
      logger.warn("AI_ANALYSIS", "Anthropic qualification failed, falling back to rule-based", {
        error: String((err as Error)?.message || err),
        url: candidate.url,
      });
    }
  }
  return ruleBasedClient.analyze(candidate, context);
}
