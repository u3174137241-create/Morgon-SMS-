export type NormalizedExternalResult = {
  source: string;
  sourceItemId: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  itemUrl: string;
  brand: string | null;
  model: string | null;
  condition: string | null;
  location: string | null;
  productType: "PRODUCT" | "SERVICE" | null;
  matchScore: number | null;
  availabilityStatus: "AVAILABLE" | "SOLD" | "UNKNOWN";
};

export type ExternalSearchQuery = {
  keywords: string[];
  budgetMax: number | null;
  location: string | null;
  itemType: "PRODUCT" | "SERVICE";
};

export type ExternalSourceAdapterResult =
  | { status: "ok"; results: NormalizedExternalResult[] }
  | { status: "unavailable"; reason: string };

// Alla externa källor implementerar samma gränssnitt. En adapter som saknar
// officiell API-åtkomst ska returnera { status: "unavailable" } — aldrig
// försöka kringgå CAPTCHA, bot-skydd eller inloggningsspärrar.
export interface ExternalSourceAdapter {
  readonly source: string;
  search(query: ExternalSearchQuery): Promise<ExternalSourceAdapterResult>;
}
