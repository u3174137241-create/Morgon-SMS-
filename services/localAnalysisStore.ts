import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnalysisResult } from "@/types/analysis";
import { demoAnalyses } from "@/lib/demoData";

const KEY = "bilkoll.analyses.v1";

/**
 * Lokal offline-first lagring för demo-läge (utan Supabase) och som
 * enkel cache. Seedas med realistisk demo-data första gången.
 */
async function readAll(): Promise<AnalysisResult[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    await AsyncStorage.setItem(KEY, JSON.stringify(demoAnalyses));
    return demoAnalyses;
  }
  try {
    return JSON.parse(raw) as AnalysisResult[];
  } catch {
    return demoAnalyses;
  }
}

async function writeAll(analyses: AnalysisResult[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(analyses));
}

export const localAnalysisStore = {
  async list(): Promise<AnalysisResult[]> {
    const all = await readAll();
    return [...all].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async get(id: string): Promise<AnalysisResult | undefined> {
    const all = await readAll();
    return all.find((a) => a.id === id);
  },

  async save(analysis: AnalysisResult): Promise<void> {
    const all = await readAll();
    await writeAll([analysis, ...all.filter((a) => a.id !== analysis.id)]);
  },

  async remove(id: string): Promise<void> {
    const all = await readAll();
    await writeAll(all.filter((a) => a.id !== id));
  },

  async clearToSeed(): Promise<void> {
    await writeAll(demoAnalyses);
  },
};
