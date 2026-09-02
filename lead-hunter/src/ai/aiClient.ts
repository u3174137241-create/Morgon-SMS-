import type { AiAnalysisResult, Category, LocationConfig } from "../core/types.js";

export interface AiCandidateInput {
  title: string;
  snippet: string;
  url: string;
  matchedKeyword: string;
}

export interface AiContext {
  category: Category;
  location: LocationConfig;
  maxLeadAgeDays: number;
}

export interface AiClient {
  name: string;
  /** True when this client is backed by a real cost/quota-bearing service. */
  isExternal: boolean;
  analyze(candidate: AiCandidateInput, context: AiContext): Promise<AiAnalysisResult>;
}
