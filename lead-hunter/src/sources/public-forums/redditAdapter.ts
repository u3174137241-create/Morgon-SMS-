import type { SourceAdapter, SourceSearchOptions } from "../types.js";
import { fetchText, rateLimiter } from "../../core/http.js";
import { logger } from "../../logging/logger.js";

const HOST = "www.reddit.com";

/**
 * Public forum discussions via Reddit's public search RSS/Atom feed — no
 * login, no API key, no rate-limit circumvention, just the syndication
 * feed Reddit publishes for anyone to read (section 4: "public forums").
 * Useful for Swedish-adjacent and English-language discussions where
 * someone states a concrete need.
 */
export const redditAdapter: SourceAdapter = {
  id: "reddit-public-search",
  name: "Reddit (public search feed)",
  type: "public-forums",
  defaultQuality: "MEDIUM",
  minDelayMs: 4000,

  async search(query: string, _opts: SourceSearchOptions) {
    await rateLimiter.wait(HOST, this.minDelayMs);

    const url = `https://${HOST}/search.rss?q=${encodeURIComponent(query)}&sort=new&limit=15`;
    const xml = await fetchText(url, { timeoutMs: 12_000 });
    const entries = parseAtomEntries(xml);
    logger.debug("QUERY_EXECUTED", `Reddit returned ${entries.length} results`, { query });
    return entries;
  },
};

interface AtomEntry {
  url: string;
  title: string;
  snippet: string;
  publishedHint?: string;
}

/** Minimal, dependency-free Atom feed parser tailored to Reddit's RSS output. */
function parseAtomEntries(xml: string): AtomEntry[] {
  const entries: AtomEntry[] = [];
  const entryBlocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

  for (const block of entryBlocks) {
    const title = decodeXml(extractTag(block, "title"));
    const link = extractAttr(block, "link", "href");
    const updated = extractTag(block, "updated") || extractTag(block, "published");
    const content = decodeXml(stripHtml(extractTag(block, "content")));
    if (!link || !title) continue;
    entries.push({ url: link, title, snippet: content.slice(0, 500), publishedHint: updated || undefined });
  }
  return entries;
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : "";
}

function extractAttr(block: string, tag: string, attr: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*/?>`));
  return m ? m[1].trim() : "";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
