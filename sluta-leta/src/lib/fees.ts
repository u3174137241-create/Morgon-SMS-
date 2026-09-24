// Kontaktavgift som säljaren betalar när en köpare godkänner ett erbjudande,
// om säljaren inte har en aktiv Sluta Leta Plus-prenumeration.
export function calculateContactFee(offerPriceSek: number): number {
  if (offerPriceSek <= 200) return 20;
  if (offerPriceSek <= 5000) return 49;
  return 149;
}

export const PLUS_MONTHLY_PRICE_SEK = 99;
