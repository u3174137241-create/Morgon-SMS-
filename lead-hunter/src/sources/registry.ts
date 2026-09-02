import type { SourceAdapter } from "./types.js";
import { duckDuckGoAdapter } from "./web-search/duckduckgoAdapter.js";
import { redditAdapter } from "./public-forums/redditAdapter.js";

/**
 * All active source adapters. To add a new open data source: implement
 * `SourceAdapter` in `sources/<category>/yourAdapter.ts` and add it to this
 * list — nothing else in the pipeline needs to change (section 4).
 *
 * public-pages/ and custom-sources/ are reserved directories for adapters
 * you add later (e.g. a specific municipality bulletin board, a company
 * directory); none are wired in yet so the MVP doesn't ship unused code.
 */
export const SOURCE_ADAPTERS: SourceAdapter[] = [duckDuckGoAdapter, redditAdapter];
