import type { ListingSourceParser, ParseResult } from "./types";
import { blocketParser } from "./parsers/blocketParser";
import { waykeParser } from "./parsers/waykeParser";
import { bytbilParser } from "./parsers/bytbilParser";
import { facebookParser } from "./parsers/facebookParser";

/**
 * Modul-registret av annonskällor. Nya källor läggs till genom att
 * implementera `ListingSourceParser` och registrera den här — resten
 * av appen behöver aldrig veta vilken källa som användes.
 */
const parsers: ListingSourceParser[] = [blocketParser, waykeParser, bytbilParser, facebookParser];

export const ListingParser = {
  /** Hittar rätt parser för en URL, eller null om ingen stödjer den. */
  resolve(url: string): ListingSourceParser | null {
    return parsers.find((p) => p.canHandle(url)) ?? null;
  },

  async parseUrl(url: string): Promise<ParseResult> {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      return {
        success: false,
        listing: null,
        error: "Det där ser inte ut som en giltig länk. Klistra in hela annonsadressen.",
      };
    }
    const parser = this.resolve(trimmed);
    if (!parser) {
      return {
        success: false,
        listing: null,
        error: "Vi känner inte igen den här annonssidan än. Ladda upp screenshots eller fyll i manuellt.",
      };
    }
    return parser.parse(trimmed);
  },
};
