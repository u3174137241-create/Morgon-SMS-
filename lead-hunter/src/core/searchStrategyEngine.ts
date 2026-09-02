import type { Category, LocationConfig, SearchIntensity } from "./types.js";
import { getTemplateWeight } from "../db/repositories/queryStatsRepo.js";

/**
 * A query template. `{keyword}` is replaced with a category keyword,
 * `{location}` with a location name (or dropped for nationwide queries).
 */
interface QueryTemplate {
  id: string;
  pattern: string;
}

// Section 5 & 16: intent-bearing phrase patterns in natural Swedish (with a
// couple of English/international variants), covering "behöver", "söker",
// "letar efter", "någon som kan", "tips på", "rekommendera", "vem kan",
// "hjälp med", "offerter", "pris", "akut", "snarast", "ASAP".
const TEMPLATES: QueryTemplate[] = [
  { id: "behover", pattern: "behöver {keyword}" },
  { id: "behover_hjalp", pattern: "behöver hjälp med {keyword}" },
  { id: "soker", pattern: "söker {keyword}" },
  { id: "letar_efter", pattern: "letar efter {keyword}" },
  { id: "nagon_som_kan", pattern: "någon som kan {keyword}" },
  { id: "tips_pa", pattern: "tips på {keyword}" },
  { id: "rekommendera", pattern: "rekommendera {keyword}" },
  { id: "vem_kan", pattern: "vem kan {keyword}" },
  { id: "hjalp_med", pattern: "hjälp med {keyword}" },
  { id: "offert", pattern: "{keyword} offert" },
  { id: "pris", pattern: "{keyword} pris" },
  { id: "akut", pattern: "akut {keyword}" },
  { id: "snarast", pattern: "{keyword} snarast" },
  { id: "asap", pattern: "{keyword} ASAP" },
  { id: "vem_rekommenderar", pattern: "vem rekommenderar {keyword}" },
  { id: "seeking_en", pattern: "looking for {keyword}" },
];

// Max templates used per category×location combo, by search intensity.
const INTENSITY_LIMITS: Record<SearchIntensity, number> = { LOW: 3, MEDIUM: 6, HIGH: 12 };

export interface GeneratedQuery {
  query: string;
  templateId: string;
  category: string;
  location: string;
  keyword: string;
}

export function generateQueries(
  categories: Category[],
  locations: LocationConfig[],
  intensity: SearchIntensity
): GeneratedQuery[] {
  const limit = INTENSITY_LIMITS[intensity] ?? INTENSITY_LIMITS.MEDIUM;
  const seen = new Set<string>();
  const queries: GeneratedQuery[] = [];

  for (const category of categories) {
    if (!category.enabled || category.keywords.length === 0) continue;

    // Rank templates by historical acceptance rate for this category so
    // that queries which tend to surface real leads are tried first.
    const ranked = [...TEMPLATES].sort(
      (a, b) => getTemplateWeight(b.id, category.id) - getTemplateWeight(a.id, category.id)
    );

    for (const location of locations) {
      if (!location.enabled) continue;
      const isNationwide = location.type === "country";
      let usedForCombo = 0;

      for (const template of ranked) {
        if (usedForCombo >= limit) break;
        // Cycle through keywords so multiple templates don't all pick keyword[0].
        const keyword = category.keywords[usedForCombo % category.keywords.length];
        const query = buildQuery(template.pattern, keyword, isNationwide ? "" : location.name);
        const dedupeKey = query.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        queries.push({ query, templateId: template.id, category: category.id, location: location.id, keyword });
        usedForCombo++;
      }
    }
  }

  return queries;
}

function buildQuery(pattern: string, keyword: string, locationName: string): string {
  let q = pattern.replace("{keyword}", keyword);
  if (locationName) q = `${q} ${locationName}`;
  return q.trim().replace(/\s+/g, " ");
}
