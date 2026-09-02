import type { SourceCandidate, SourceQuality, SourceType } from "../core/types.js";

export interface SourceSearchOptions {
  category: string;
  location: string;
  signal?: AbortSignal;
}

/**
 * A "source adapter" — one pluggable connector to an open web data source.
 * New sources are added by implementing this interface and registering the
 * instance in `sources/registry.ts`; the rest of the pipeline never needs
 * to change (section 4: modular, one adapter per data source).
 */
export interface SourceAdapter {
  id: string;
  name: string;
  type: SourceType;
  defaultQuality: SourceQuality;
  /** Minimum delay (ms) to wait between requests made by this adapter. */
  minDelayMs: number;
  search(query: string, opts: SourceSearchOptions): Promise<Omit<SourceCandidate, "query" | "category" | "location" | "sourceId" | "sourceName" | "sourceType">[]>;
}
