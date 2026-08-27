import type { ListingSourceParser, ParseResult } from "../types";
import { emptyCarListingInput } from "@/types/car";

export const bytbilParser: ListingSourceParser = {
  source: "bytbil",
  canHandle: (url) => /(^|\.)bytbil\.com/i.test(url),
  async parse(url: string): Promise<ParseResult> {
    try {
      const listing = emptyCarListingInput("bytbil");
      listing.sourceUrl = url;
      return { success: true, listing, error: null };
    } catch {
      return {
        success: false,
        listing: null,
        error: "Vi kunde inte läsa annonsen från Bytbil. Försök igen eller ladda upp screenshots.",
      };
    }
  },
};
