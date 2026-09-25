// Hybrid matchning mellan en efterlysning (köparens krav) och en kandidat
// (en säljares listing, eller tvärtom). Hårda krav filtrerar bort kandidater
// helt; mjuka preferenser påverkar bara poängen.

export type MatchRequirements = {
  itemType: "PRODUCT";
  budgetMax: number | null;
  budgetMin: number | null;
  location: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  keywords: string[];
};

export type MatchCandidate = {
  itemType: "PRODUCT";
  price: number | null;
  location: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  text: string; // titel + beskrivning, för nyckelordsjämförelse
};

export type MatchResult = {
  passesHardRequirements: boolean;
  score: number; // 0..1, endast meningsfullt om passesHardRequirements är true
  reasons: string[];
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function scoreMatch(req: MatchRequirements, candidate: MatchCandidate): MatchResult {
  const reasons: string[] = [];

  // Hårt krav: samma typ (produkt/tjänst).
  if (req.itemType !== candidate.itemType) {
    return { passesHardRequirements: false, score: 0, reasons: ["fel_typ"] };
  }

  // Hårt krav: pris får inte överstiga köparens maxbudget.
  if (req.budgetMax !== null && candidate.price !== null && candidate.price > req.budgetMax) {
    return { passesHardRequirements: false, score: 0, reasons: ["over_budget"] };
  }

  let score = 0.5; // baspoäng för att typen matchar och budgeten inte överskrids
  const candidateText = normalize(candidate.text);

  // Mjuk preferens: plats.
  if (req.location && candidate.location) {
    if (normalize(candidate.location) === normalize(req.location)) {
      score += 0.15;
      reasons.push("plats_match");
    }
  }

  // Mjuk preferens: brand/model.
  if (req.brand && normalize(candidate.brand).includes(normalize(req.brand))) {
    score += 0.1;
    reasons.push("brand_match");
  }
  if (req.model && (normalize(candidate.model).includes(normalize(req.model)) || candidateText.includes(normalize(req.model)))) {
    score += 0.1;
    reasons.push("model_match");
  }

  // Mjuk preferens: skick.
  if (req.condition && normalize(candidate.condition) === normalize(req.condition)) {
    score += 0.05;
    reasons.push("condition_match");
  }

  // Mjuk preferens: nyckelordsöverlapp i fritext.
  if (req.keywords.length > 0) {
    const hits = req.keywords.filter((kw) => candidateText.includes(kw));
    if (hits.length > 0) {
      score += Math.min(0.15, hits.length * 0.03);
      reasons.push(`keywords:${hits.length}`);
    }
  }

  // Bonus: närmare budgeten (dyrare men fortfarande inom budget) väger inte in;
  // ett billigare alternativ inom budget är ofta mer attraktivt för köparen.
  if (req.budgetMax !== null && candidate.price !== null) {
    const ratio = candidate.price / req.budgetMax;
    if (ratio <= 1) score += (1 - ratio) * 0.1;
  }

  return { passesHardRequirements: true, score: Math.min(1, Math.round(score * 1000) / 1000), reasons };
}

export function rankCandidates<T>(
  req: MatchRequirements,
  candidates: Array<{ item: T; candidate: MatchCandidate }>
): Array<{ item: T; result: MatchResult }> {
  return candidates
    .map(({ item, candidate }) => ({ item, result: scoreMatch(req, candidate) }))
    .filter((c) => c.result.passesHardRequirements)
    .sort((a, b) => b.result.score - a.result.score);
}
