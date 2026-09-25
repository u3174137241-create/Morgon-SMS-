// Regelbaserad tolkning av fri text på svenska till strukturerade sökkrav.
// Detta är medvetet enkelt (ingen extern NLU-tjänst är konfigurerad) men täcker
// de vanligaste mönstren: pris/budget, plats och skick. Fälten här är bara en
// utgångspunkt — köparen kan alltid välja skick, budget och plats explicit i
// formuläret, och de valen vinner alltid över vad som tolkas ur fritexten.

export type ParsedRequirements = {
  itemType: "PRODUCT";
  budgetMax: number | null;
  budgetMin: number | null;
  location: string | null;
  condition: string | null;
  keywords: string[];
};

const SWEDISH_CITIES = [
  "stockholm", "göteborg", "malmö", "uppsala", "västerås", "örebro", "linköping",
  "helsingborg", "jönköping", "norrköping", "lund", "umeå", "gävle", "borås",
  "södertälje", "eskilstuna", "halmstad", "växjö", "karlstad", "sundsvall",
  "haninge", "täby", "kungsbacka", "solna", "huddinge", "nacka",
];

const STOPWORDS = new Set([
  "jag", "söker", "letar", "efter", "en", "ett", "till", "för", "på", "i",
  "max", "kr", "kronor", "sek", "helst", "gärna", "behöver", "vill", "ha",
  "någon", "som", "kan", "min", "mitt", "och", "eller", "är", "det", "den",
]);

function parsePriceSek(text: string): number | null {
  const cleaned = text.replace(/\s/g, "");
  const match = cleaned.match(/(\d{2,7})\s*(?:kr|:-|sek)?/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function parseSearchText(rawText: string): ParsedRequirements {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  let budgetMax: number | null = null;
  const maxMatch = lower.match(/max(?:imalt)?\s*[:\-]?\s*([\d\s]{2,10})\s*(?:kr|:-|sek)?/i);
  if (maxMatch?.[1]) budgetMax = parsePriceSek(maxMatch[1]);
  if (budgetMax === null) {
    const genericPriceMatch = lower.match(/([\d\s]{2,10})\s*(?:kr|:-|sek)/i);
    if (genericPriceMatch?.[1]) budgetMax = parsePriceSek(genericPriceMatch[1]);
  }

  let budgetMin: number | null = null;
  const minMatch = lower.match(/min(?:imum)?\s*[:\-]?\s*([\d\s]{2,10})\s*(?:kr|:-|sek)?/i);
  if (minMatch?.[1]) budgetMin = parsePriceSek(minMatch[1]);

  let location: string | null = null;
  for (const city of SWEDISH_CITIES) {
    if (lower.includes(city)) {
      location = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  let condition: string | null = null;
  if (/\bny\b|\boanvänd/i.test(lower)) condition = "Ny";
  else if (/begagnad|beg\.?\b|second\s?hand/i.test(lower)) condition = "Begagnad";
  else if (/renoveringsobjekt|defekt|trasig/i.test(lower)) condition = "Renoveringsobjekt";

  const keywords = Array.from(
    new Set(
      lower
        .replace(/[.,!?()]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !SWEDISH_CITIES.includes(w) && Number.isNaN(Number(w)))
    )
  ).slice(0, 15);

  return {
    itemType: "PRODUCT",
    budgetMax,
    budgetMin,
    location,
    condition,
    keywords,
  };
}
