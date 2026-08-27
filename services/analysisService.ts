import type { CarListingInput } from "@/types/car";
import type { AnalysisResult } from "@/types/analysis";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { localAnalysisStore } from "./localAnalysisStore";
import { parseClaudeAnalysis } from "@/features/analysis/schema";
import { mapClaudeOutputToAnalysis } from "@/features/analysis/mapClaudeOutput";
import { runHeuristicAnalysis } from "@/features/analysis/heuristicEngine";

export class AnalysisError extends Error {}

/**
 * Kör en bilanalys. I produktion: anropar Supabase Edge Function `analyze-car`
 * som i sin tur pratar med Claude server-side (se supabase/functions/analyze-car).
 * Utan konfigurerad backend körs en lokal, tydligt taggad demo-analys så att
 * hela flödet fungerar direkt (kap. 24).
 */
export async function runAnalysis(listing: CarListingInput): Promise<AnalysisResult> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 1400));
    const output = runHeuristicAnalysis(listing);
    const analysis = mapClaudeOutputToAnalysis(output, listing);
    analysis.isDemo = true;
    await localAnalysisStore.save(analysis);
    return analysis;
  }

  const { data, error } = await supabase.functions.invoke("analyze-car", {
    body: { listing },
  });

  if (error) {
    throw new AnalysisError("Vi kunde inte analysera bilen just nu. Försök igen om en liten stund.");
  }

  const parsed = parseClaudeAnalysis(data);
  if (!parsed.success) {
    throw new AnalysisError("Analysen gick inte att tolka. Försök igen.");
  }

  const analysis = mapClaudeOutputToAnalysis(parsed.data, listing);
  await localAnalysisStore.save(analysis);
  return analysis;
}

export async function listAnalyses(): Promise<AnalysisResult[]> {
  return localAnalysisStore.list();
}

export async function getAnalysis(id: string): Promise<AnalysisResult | undefined> {
  return localAnalysisStore.get(id);
}

export async function deleteAnalysis(id: string): Promise<void> {
  return localAnalysisStore.remove(id);
}
