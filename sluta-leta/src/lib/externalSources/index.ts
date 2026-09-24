import { blocketAdapter } from "./adapters/blocket";
import { traderaAdapter } from "./adapters/tradera";
import { facebookMarketplaceAdapter } from "./adapters/facebookMarketplace";
import { vintedAdapter } from "./adapters/vinted";
import { sellpyAdapter } from "./adapters/sellpy";
import { plickAdapter } from "./adapters/plick";
import type { ExternalSearchQuery, NormalizedExternalResult } from "./types";

const ADAPTERS = [blocketAdapter, traderaAdapter, facebookMarketplaceAdapter, vintedAdapter, sellpyAdapter, plickAdapter];

export type ExternalSearchSummary = {
  results: NormalizedExternalResult[];
  sourceStatus: Record<string, { status: "ok" | "unavailable" | "error"; reason?: string; count?: number }>;
};

// Söker alla externa källor parallellt. En källa som misslyckas eller är
// otillgänglig stoppar aldrig de andra — timeout per källa skyddar mot att
// en långsam källa blockerar hela requesten.
export async function searchExternalSources(query: ExternalSearchQuery, timeoutMs = 5000): Promise<ExternalSearchSummary> {
  const sourceStatus: ExternalSearchSummary["sourceStatus"] = {};
  const allResults: NormalizedExternalResult[] = [];

  const withTimeout = <T,>(promise: Promise<T>): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);

  const outcomes = await Promise.allSettled(
    ADAPTERS.map((adapter) => withTimeout(adapter.search(query)).then((result) => ({ adapter, result })))
  );

  outcomes.forEach((outcome, i) => {
    const source = ADAPTERS[i]!.source;
    if (outcome.status === "fulfilled") {
      const { result } = outcome.value;
      if (result.status === "ok") {
        sourceStatus[source] = { status: "ok", count: result.results.length };
        allResults.push(...result.results);
      } else {
        sourceStatus[source] = { status: "unavailable", reason: result.reason };
      }
    } else {
      const reason = outcome.reason as { message?: string } | undefined;
      sourceStatus[source] = { status: "error", reason: String(reason?.message ?? reason) };
    }
  });

  return { results: allResults, sourceStatus };
}
