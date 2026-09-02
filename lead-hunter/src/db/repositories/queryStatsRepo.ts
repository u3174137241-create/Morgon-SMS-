import { getDb } from "../db.js";

/** Weight multiplier applied when ordering templates: 1.0 = neutral. */
export function getTemplateWeight(templateId: string, category: string): number {
  const row = getDb()
    .prepare("SELECT uses, accepted FROM query_template_stats WHERE template_id = ? AND category = ?")
    .get(templateId, category) as { uses: number; accepted: number } | undefined;
  if (!row || row.uses < 3) return 1; // not enough data yet — neutral
  const rate = row.accepted / row.uses;
  // Map acceptance rate [0..1] to a weight in [0.5..1.5] so poor performers
  // are deprioritized but never fully excluded (coverage still matters).
  return 0.5 + rate;
}

export function recordTemplateUse(templateId: string, category: string, accepted: boolean): void {
  getDb()
    .prepare(
      `INSERT INTO query_template_stats (template_id, category, uses, accepted) VALUES (?, ?, 1, ?)
       ON CONFLICT(template_id, category) DO UPDATE SET uses = uses + 1, accepted = accepted + excluded.accepted`
    )
    .run(templateId, category, accepted ? 1 : 0);
}
