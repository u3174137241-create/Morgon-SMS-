import type { CarListingInput, ListingSource } from "@/types/car";

export interface ParseResult {
  success: boolean;
  listing: CarListingInput | null;
  /** Användarvänligt felmeddelande — aldrig en teknisk stack trace. */
  error: string | null;
}

/** Ett enskilt annons-parser-implementation för en specifik källa. */
export interface ListingSourceParser {
  source: ListingSource;
  /** Avgör om denna parser kan hantera en given URL. */
  canHandle(url: string): boolean;
  /** Hämtar och tolkar annonsen. Kastar aldrig — returnerar alltid ett ParseResult. */
  parse(url: string): Promise<ParseResult>;
}
