import type { ListingSourceParser, ParseResult } from "../types";
import { emptyCarListingInput } from "@/types/car";

/**
 * Blocket-parser. Bygger arkitekturen för ett framtida officiellt samarbete
 * (kap. 15) — men körs idag mot appens backend, som i sin tur försöker läsa
 * annonsens publika sida. Blockets varumärke/grafik används inte i appen.
 */
export const blocketParser: ListingSourceParser = {
  source: "blocket",
  canHandle: (url) => /(^|\.)blocket\.se/i.test(url),
  async parse(url: string): Promise<ParseResult> {
    try {
      // I produktion: anropa Supabase Edge Function `parse-listing` som hämtar
      // och tolkar sidan server-side (för att undvika CORS och skydda ev. nycklar).
      const listing = emptyCarListingInput("blocket");
      listing.sourceUrl = url;
      return { success: true, listing, error: null };
    } catch {
      return {
        success: false,
        listing: null,
        error: "Vi kunde inte läsa annonsen från Blocket. Försök igen eller ladda upp screenshots.",
      };
    }
  },
};
