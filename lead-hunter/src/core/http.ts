import { logger } from "../logging/logger.js";

const USER_AGENT = "AILeadHunter/1.0 (+personal, non-commercial lead discovery tool; respects robots.txt)";

export interface FetchTextOptions {
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

/**
 * Fetches a URL as text with a timeout, retries with exponential backoff on
 * network errors or 5xx/429 responses, and a descriptive, honest User-Agent.
 * Never used to bypass CAPTCHAs, logins, paywalls, or rate limits — a
 * failure here is meant to be treated as "this source is unavailable right
 * now", not something to route around (section 4/23).
 */
export async function fetchText(url: string, opts: FetchTextOptions = {}): Promise<string> {
  const { timeoutMs = 10_000, maxRetries = 2, headers = {} } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml,application/rss+xml,*/*", ...headers },
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status} from ${url}`);
      }
      if (!res.ok) {
        // Client errors (4xx besides 429) are not retried — likely permanent.
        throw Object.assign(new Error(`HTTP ${res.status} from ${url}`), { nonRetryable: true });
      }
      return await res.text();
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      const nonRetryable = (err as { nonRetryable?: boolean })?.nonRetryable;
      if (nonRetryable || attempt === maxRetries) break;
      const backoffMs = 500 * 2 ** attempt + Math.random() * 250;
      logger.debug("SOURCE_ERROR", `Retrying ${url} after error (attempt ${attempt + 1}/${maxRetries})`, {
        error: String((err as Error)?.message || err),
      });
      await sleep(backoffMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simple per-host rate limiter shared by all source adapters. */
class RateLimiter {
  private lastRequestAt = new Map<string, number>();

  async wait(host: string, minDelayMs: number): Promise<void> {
    const last = this.lastRequestAt.get(host) ?? 0;
    const elapsed = Date.now() - last;
    if (elapsed < minDelayMs) {
      await sleep(minDelayMs - elapsed);
    }
    this.lastRequestAt.set(host, Date.now());
  }
}

export const rateLimiter = new RateLimiter();
