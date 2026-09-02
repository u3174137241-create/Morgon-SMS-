import type { AiClient, AiCandidateInput, AiContext } from "./aiClient.js";
import type { AiAnalysisResult } from "../core/types.js";
import { env } from "../config/env.js";
import { extractJson, normalizeAiAnalysis } from "./jsonValidation.js";

const SYSTEM_PROMPT = `Du är en skeptisk lead-kvalificerare för ett privat lead-hunting-system.
Din uppgift är att avgöra om en text från en öppen webbkälla uttrycker ett FAKTISKT,
AKTUELLT köpbehov hos en privatperson eller ett företag för en specifik tjänst.

Var skeptisk. Fråga dig själv "Har den här personen faktiskt uttryckt ett behov?" —
inte "Kan jag på något sätt tolka detta som ett lead?".

Exempel:
- "Vad kostar en badrumsrenovering?" -> svagt lead (informationssökande, inte nödvändigtvis redo att köpa)
- "Jag behöver renovera mitt badrum och söker en firma i Stockholm." -> starkt lead
- "Min kompis renoverade sitt badrum." -> INTE ett lead (handlar om någon annan, dåtid)
- Ett företags egen annons/marknadsföring ("Vi erbjuder...", "Kontakta oss idag!") -> spam, INTE ett lead

Svara ENDAST med ett giltigt JSON-objekt, utan markdown-formatering, exakt enligt detta schema:
{
  "is_lead": boolean,
  "is_spam": boolean,
  "has_real_need": boolean,
  "is_information_only": boolean,
  "category": string,
  "service": string,
  "location": string | null,
  "intent": "HIGH" | "MEDIUM" | "LOW" | "NONE",
  "summary": string (max 240 tecken, svenska),
  "urgency": "ACUTE" | "SOON" | "NORMAL" | "UNKNOWN",
  "estimated_value": "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
  "value_reasoning": string (kort motivering, hitta ALDRIG på exakta priser),
  "confidence": number (0..1),
  "buyer_type": string (typ av företag som kan köpa detta lead),
  "potential_categories": string[] (typer av företag),
  "why_this_is_a_lead": string (kort motivering),
  "clarity": number (0..1, hur konkret/specifikt behovet är),
  "commercial_value": number (0..1),
  "geography_confidence": number (0..1)
}`;

/**
 * AI qualification backed by the Anthropic Messages API. This is the only
 * external, cost-bearing dependency in the whole system, and it is fully
 * optional — when ANTHROPIC_API_KEY is unset, the pipeline uses
 * `ruleBasedClient` instead (see `ai/index.ts`) and the system keeps working
 * at 0 kr (section 2/36).
 */
export const anthropicClient: AiClient = {
  name: "anthropic",
  isExternal: true,

  async analyze(candidate: AiCandidateInput, context: AiContext): Promise<AiAnalysisResult> {
    const userPrompt = `Kategori: ${context.category.name} (nyckelord: ${candidate.matchedKeyword})
Ort/område som söktes: ${context.location.name}
Källa-URL: ${candidate.url}

Titel: ${candidate.title}
Textutdrag: ${candidate.snippet}

Analysera texten enligt instruktionerna och svara med JSON.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.anthropicModel,
        max_tokens: 700,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content?.find((b) => b.type === "text")?.text ?? "";
    const json = extractJson(text);
    if (!json) throw new Error(`Anthropic response was not valid JSON: ${text.slice(0, 200)}`);
    return normalizeAiAnalysis(json, context);
  },
};
