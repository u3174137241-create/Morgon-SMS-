import type { FreshnessResult } from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const RELATIVE_SV = [
  { re: /\bidag\b/i, unitMs: 0 },
  { re: /\bigår\b/i, unitMs: DAY_MS },
  { re: /(\d+)\s*timm(e|ar)\s*sedan/i, unitMs: 60 * 60 * 1000, group: 1 },
  { re: /(\d+)\s*dag(ar)?\s*sedan/i, unitMs: DAY_MS, group: 1 },
  { re: /(\d+)\s*veck(a|or)\s*sedan/i, unitMs: 7 * DAY_MS, group: 1 },
  { re: /(\d+)\s*månad(er)?\s*sedan/i, unitMs: 30 * DAY_MS, group: 1 },
];

const URL_DATE_RE = /(20\d{2})[\/\-_](0?[1-9]|1[0-2])[\/\-_](0?[1-9]|[12]\d|3[01])(?:[^\d]|$)/;
const ISO_DATE_RE = /\b(20\d{2}-\d{2}-\d{2})/;

/**
 * Best-effort publication date extraction (section 8). Tries, in order:
 *   1. an explicit machine-readable date hint (e.g. an RSS <updated> value)
 *   2. relative Swedish phrases ("2 dagar sedan", "igår")
 *   3. a yyyy-mm-dd/yyyy/mm/dd pattern embedded in the URL or text
 * Anything that doesn't match is marked UNCERTAIN rather than guessed —
 * per section 8, an uncertain date must never be silently treated as fresh.
 */
export function computeFreshness(
  input: { publishedHint?: string; url: string; title: string; snippet: string },
  discoveredAt: Date = new Date()
): FreshnessResult {
  const hint = (input.publishedHint || "").trim();

  // 1. Machine-readable hint (ISO 8601 from a feed's <updated>/<published>).
  if (hint) {
    const parsed = new Date(hint);
    if (!Number.isNaN(parsed.getTime()) && isPlausibleDate(parsed, discoveredAt)) {
      return finalize(parsed, discoveredAt, "CONFIRMED");
    }
  }

  const haystack = `${hint} ${input.title} ${input.snippet}`;

  // 2. Relative Swedish phrases.
  for (const rule of RELATIVE_SV) {
    const m = haystack.match(rule.re);
    if (m) {
      const count = rule.group ? Number(m[rule.group]) : 1;
      const date = new Date(discoveredAt.getTime() - count * rule.unitMs);
      return finalize(date, discoveredAt, "ESTIMATED");
    }
  }

  // 3. Date embedded in the URL, e.g. /2026/08/30/some-post
  const urlMatch = input.url.match(URL_DATE_RE);
  if (urlMatch) {
    const date = new Date(Number(urlMatch[1]), Number(urlMatch[2]) - 1, Number(urlMatch[3]));
    if (isPlausibleDate(date, discoveredAt)) return finalize(date, discoveredAt, "CONFIRMED");
  }

  // 3b. Explicit yyyy-mm-dd anywhere in the visible text.
  const isoMatch = haystack.match(ISO_DATE_RE);
  if (isoMatch) {
    const date = new Date(isoMatch[1]);
    if (isPlausibleDate(date, discoveredAt)) return finalize(date, discoveredAt, "ESTIMATED");
  }

  // 4. No reliable signal — mark DATE_UNCERTAIN rather than guessing.
  return { publishedAt: null, ageDays: null, dateConfidence: "UNCERTAIN" };
}

function isPlausibleDate(date: Date, discoveredAt: Date): boolean {
  const year = date.getFullYear();
  if (year < 2015 || date.getTime() > discoveredAt.getTime() + DAY_MS) return false;
  return true;
}

function finalize(date: Date, discoveredAt: Date, confidence: FreshnessResult["dateConfidence"]): FreshnessResult {
  const ageDays = Math.max(0, Math.round((discoveredAt.getTime() - date.getTime()) / DAY_MS));
  return { publishedAt: date.toISOString(), ageDays, dateConfidence: confidence };
}
