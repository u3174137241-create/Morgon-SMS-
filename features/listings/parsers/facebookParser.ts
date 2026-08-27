import type { ListingSourceParser, ParseResult } from "../types";

/**
 * Facebook Marketplace kräver inloggning för att läsas server-side och stödjer
 * därför inte URL-parsing i första versionen — användaren hänvisas till
 * screenshot-uppladdning istället.
 */
export const facebookParser: ListingSourceParser = {
  source: "facebook",
  canHandle: (url) => /(^|\.)facebook\.com\/marketplace/i.test(url),
  async parse(): Promise<ParseResult> {
    return {
      success: false,
      listing: null,
      error: "Facebook Marketplace-annonser kan inte läsas automatiskt än. Ladda upp screenshots istället.",
    };
  },
};
