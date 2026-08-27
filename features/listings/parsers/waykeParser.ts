import type { ListingSourceParser, ParseResult } from "../types";
import { emptyCarListingInput } from "@/types/car";

export const waykeParser: ListingSourceParser = {
  source: "wayke",
  canHandle: (url) => /(^|\.)wayke\.se/i.test(url),
  async parse(url: string): Promise<ParseResult> {
    try {
      const listing = emptyCarListingInput("wayke");
      listing.sourceUrl = url;
      return { success: true, listing, error: null };
    } catch {
      return {
        success: false,
        listing: null,
        error: "Vi kunde inte läsa annonsen från Wayke. Försök igen eller ladda upp screenshots.",
      };
    }
  },
};
