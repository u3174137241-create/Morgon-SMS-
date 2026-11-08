// Kontaktavgift som säljaren betalar när en köpare godkänner ett erbjudande,
// om säljaren inte har en aktiv Sluta Leta Plus-prenumeration. Avgiften är
// en fast engångsavgift för att låsa upp just den chatten — inte en
// provision på varans pris.
export const CONTACT_FEE_SEK = 69;

export function calculateContactFee(_offerPriceSek: number): number {
  return CONTACT_FEE_SEK;
}

export const PLUS_MONTHLY_PRICE_SEK = 49;
