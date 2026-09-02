import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "ref", "ref_src", "igshid", "si",
]);

/**
 * Normalizes a URL for exact-duplicate comparison: lowercase host, strips
 * tracking params, trailing slash, and fragment. Two URLs that only differ
 * by campaign params or a trailing slash are treated as the same source.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    const params = new URLSearchParams(u.search);
    for (const key of [...params.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) params.delete(key);
    }
    const sortedParams = new URLSearchParams([...params.entries()].sort(([a], [b]) => a.localeCompare(b)));
    u.search = sortedParams.toString();
    let path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.hostname}${path}${u.search ? "?" + u.search : ""}`.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/** Lowercases, strips punctuation, and collapses whitespace for hashing/comparison. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** SHA-256 hex digest of the normalized text — used to catch exact/syndicated re-posts. */
export function computeContentHash(title: string, snippet: string): string {
  const normalized = normalizeText(`${title} ${snippet}`);
  return createHash("sha256").update(normalized).digest("hex");
}

function shingles(text: string, size = 3): Set<string> {
  const words = normalizeText(text).split(" ").filter(Boolean);
  if (words.length < size) return new Set(words.length ? [words.join(" ")] : []);
  const out = new Set<string>();
  for (let i = 0; i <= words.length - size; i++) {
    out.add(words.slice(i, i + size).join(" "));
  }
  return out;
}

/** Jaccard similarity (0..1) between two texts' word-trigram shingle sets. */
export function textSimilarity(a: string, b: string): number {
  const setA = shingles(a);
  const setB = shingles(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const s of setA) if (setB.has(s)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const NEAR_DUPLICATE_THRESHOLD = 0.82;

export function isNearDuplicate(a: string, b: string, threshold = NEAR_DUPLICATE_THRESHOLD): boolean {
  return textSimilarity(a, b) >= threshold;
}
