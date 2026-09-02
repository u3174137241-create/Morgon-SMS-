import * as cheerio from "cheerio";
import type { SourceAdapter, SourceSearchOptions } from "../types.js";
import { fetchText, rateLimiter } from "../../core/http.js";
import { logger } from "../../logging/logger.js";

const HOST = "html.duckduckgo.com";

/**
 * General web search via DuckDuckGo's HTML endpoint (no API key, no login,
 * no CAPTCHA in the normal flow). This is the "web-search" source category
 * from section 4 — it surfaces whatever open pages/forums/marketplaces
 * DuckDuckGo indexes for a given query; we only read public search result
 * listings and never touch DuckDuckGo's own content.
 */
export const duckDuckGoAdapter: SourceAdapter = {
  id: "duckduckgo-web-search",
  name: "DuckDuckGo Web Search",
  type: "web-search",
  defaultQuality: "MEDIUM",
  minDelayMs: 3000,

  async search(query: string, opts: SourceSearchOptions) {
    await rateLimiter.wait(HOST, this.minDelayMs);

    const url = `https://${HOST}/html/?q=${encodeURIComponent(query)}&kl=se-sv`;
    const html = await fetchText(url, { timeoutMs: 12_000 });
    const $ = cheerio.load(html);

    const out: { url: string; title: string; snippet: string; publishedHint?: string }[] = [];

    $(".result").each((_, el) => {
      const anchor = $(el).find("a.result__a").first();
      const rawHref = anchor.attr("href") || "";
      const title = anchor.text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();
      const resolvedUrl = resolveDdgRedirect(rawHref);
      if (!resolvedUrl || !title) return;
      out.push({ url: resolvedUrl, title, snippet });
    });

    logger.debug("QUERY_EXECUTED", `DuckDuckGo returned ${out.length} results`, { query });
    return out;
  },
};

/** DuckDuckGo HTML results link through //duckduckgo.com/l/?uddg=<encoded>. */
function resolveDdgRedirect(href: string): string | null {
  if (!href) return null;
  try {
    const full = href.startsWith("//") ? `https:${href}` : href;
    const u = new URL(full, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    if (/^https?:\/\//.test(full)) return full;
    return null;
  } catch {
    return null;
  }
}
