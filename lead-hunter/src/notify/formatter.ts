import type { Lead } from "../core/types.js";

const CLASSIFICATION_EMOJI: Record<Lead["classification"], string> = {
  HOT: "🔥",
  WARM: "🟠",
  WARM_POTENTIAL: "🟡",
  COLD: "🔵",
  IGNORE: "⚪",
};

function agePhrase(ageDays: number | null): string {
  if (ageDays === null) return "okänt datum (osäkert)";
  if (ageDays === 0) return "idag";
  if (ageDays === 1) return "igår";
  return `${ageDays} dagar sedan`;
}

const URGENCY_SV: Record<Lead["urgency"], string> = {
  ACUTE: "Akut",
  SOON: "Snart",
  NORMAL: "Normal",
  UNKNOWN: "Okänd",
};

const VALUE_SV: Record<Lead["estimatedValue"], string> = {
  VERY_HIGH: "Mycket högt",
  HIGH: "Högt",
  MEDIUM: "Medel",
  LOW: "Lågt",
};

/** Formats one lead as a short Telegram notification (section 14). */
export function formatLeadNotification(lead: Lead): string {
  const emoji = CLASSIFICATION_EMOJI[lead.classification];
  const label = lead.classification === "HOT" ? "NYTT HETT LEAD" : "NYTT VARMT LEAD";
  const lines = [
    `${emoji} ${label}`,
    "",
    lead.service || lead.category,
    lead.location ? `📍 ${lead.location}` : "📍 Okänd ort",
    `⭐ Score: ${lead.leadScore}/100`,
    `📅 Publicerad: ${agePhrase(lead.ageDays)}${lead.dateConfidence === "UNCERTAIN" ? " (datum osäkert)" : ""}`,
    `🔥 Köpintention: ${lead.intentScore >= 24 ? "Hög" : lead.intentScore >= 12 ? "Medel" : "Låg"}`,
    `⏱ Brådska: ${URGENCY_SV[lead.urgency]}`,
    `💰 Kommersiellt värde: ${VALUE_SV[lead.estimatedValue]}`,
    "",
    lead.whyThisIsALead ? `AI-bedömning:\n"${lead.whyThisIsALead}"` : "",
    "",
    `🔗 ${lead.sourceUrl}`,
  ].filter((l) => l !== "");
  return lines.join("\n");
}

/** Formats an end-of-run digest (section 14: "🔥 3 varma leads hittade idag"). */
export function formatDigest(hotCount: number, warmCount: number, totalToday: number): string {
  if (hotCount === 0 && warmCount === 0) {
    return `📊 Sökning klar — 0 nya kvalificerade leads.`;
  }
  const parts: string[] = [];
  if (hotCount > 0) parts.push(`${hotCount} heta`);
  if (warmCount > 0) parts.push(`${warmCount} varma`);
  return `🔥 ${parts.join(" och ")} leads hittade idag (totalt ${totalToday} idag).`;
}
