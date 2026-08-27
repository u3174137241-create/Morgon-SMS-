// Supabase Edge Function: analyze-car
//
// Enda platsen i systemet som pratar med Claude. Nyckeln (ANTHROPIC_API_KEY)
// lever bara som ett Edge Function secret — den når aldrig klienten.
//
// Deploy:  supabase functions deploy analyze-car
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-... SUPABASE_SERVICE_ROLE_KEY=...
//
// Klienten anropar denna funktion via supabase.functions.invoke("analyze-car",
// { body: { listing } }) — se services/analysisService.ts.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";

const FREE_MONTHLY_LIMIT = 3;
const DAILY_REQUEST_CAP = 20; // abuse-skydd, oberoende av abonnemang

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Samma form som features/analysis/schema.ts på klienten — hålls i synk manuellt
// eftersom Edge Functions körs som en fristående Deno-deploy.
// ---------------------------------------------------------------------------
const riskCategorySchema = z.object({
  key: z.enum(["service_history", "mileage", "price", "owner_history", "listing_information"]),
  level: z.enum(["low", "medium", "high", "unknown"]),
  note: z.string().nullable(),
});

const claudeAnalysisSchema = z.object({
  verdict: z.enum(["good_buy", "caution", "avoid"]),
  confidence: z.number().min(0).max(1),
  price_assessment: z.object({
    listed_price: z.number().nullable(),
    estimated_market_min: z.number().nullable(),
    estimated_market_max: z.number().nullable(),
    assessment: z.enum(["cheap", "fair", "expensive", "uncertain"]),
    confidence_note: z.string().nullable(),
  }),
  risks: z.array(riskCategorySchema).length(5),
  missing_information: z.array(z.string()),
  recommended_checks: z.array(z.string()).max(8),
  negotiation: z.object({
    recommended_offer: z.number().nullable(),
    target_price_min: z.number().nullable(),
    target_price_max: z.number().nullable(),
    arguments: z.array(z.string()).max(6),
  }),
  summary: z.string().max(600),
});

const ANALYSIS_TOOL = {
  name: "return_car_analysis",
  description: "Returnerar en strukturerad bedömning av en bilannons.",
  input_schema: {
    type: "object",
    properties: {
      verdict: { type: "string", enum: ["good_buy", "caution", "avoid"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      price_assessment: {
        type: "object",
        properties: {
          listed_price: { type: ["number", "null"] },
          estimated_market_min: { type: ["number", "null"] },
          estimated_market_max: { type: ["number", "null"] },
          assessment: { type: "string", enum: ["cheap", "fair", "expensive", "uncertain"] },
          confidence_note: { type: ["string", "null"] },
        },
        required: ["listed_price", "estimated_market_min", "estimated_market_max", "assessment", "confidence_note"],
      },
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string", enum: ["service_history", "mileage", "price", "owner_history", "listing_information"] },
            level: { type: "string", enum: ["low", "medium", "high", "unknown"] },
            note: { type: ["string", "null"] },
          },
          required: ["key", "level", "note"],
        },
      },
      missing_information: { type: "array", items: { type: "string" } },
      recommended_checks: { type: "array", items: { type: "string" } },
      negotiation: {
        type: "object",
        properties: {
          recommended_offer: { type: ["number", "null"] },
          target_price_min: { type: ["number", "null"] },
          target_price_max: { type: ["number", "null"] },
          arguments: { type: "array", items: { type: "string" } },
        },
        required: ["recommended_offer", "target_price_min", "target_price_max", "arguments"],
      },
      summary: { type: "string" },
    },
    required: ["verdict", "confidence", "price_assessment", "risks", "missing_information", "recommended_checks", "negotiation", "summary"],
  },
};

const SYSTEM_PROMPT = `Du är Bilkolls analysmotor för begagnade bilar på den svenska marknaden.

Du får strukturerad information om en bilannons (märke, modell, år, miltal, pris, m.m.)
och ska bedöma om bilen är rimligt prissatt och vilka risker som finns.

MYCKET VIKTIGT — hitta ALDRIG på information:
- Fordonsdata, servicehistorik, olyckor, ägarhistorik eller marknadspriser du inte
  faktiskt fått i annonsdatan får aldrig framställas som fakta.
- Om ett fält saknas i indatan: lägg till det i "missing_information" och sätt
  relaterade fält till null/"unknown" istället för att gissa.
- Om du saknar tillräckligt underlag för en tillförlitlig marknadsprisbedömning,
  sätt "assessment": "uncertain" och förklara det kort i "confidence_note".
  Sätt aldrig ihop ett marknadsintervall du inte har rimligt stöd för.

Svara ENDAST genom att anropa verktyget "return_car_analysis" med korrekt ifylld JSON.
"risks" måste innehålla exakt dessa fem kategorier, i valfri ordning: service_history,
mileage, price, owner_history, listing_information.
Håll "summary" kort (2–3 meningar), konkret och på svenska.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Du måste vara inloggad för att analysera en bil." }, 401);
    }

    // Klient scopad till den anropande användaren — respekterar RLS.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Din session har gått ut. Logga in igen." }, 401);
    }

    // Service-klient för rate limiting och kvotkontroll (kringgår RLS avsiktligt).
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount } = await serviceClient
      .from("analysis_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since24h);

    if ((dailyCount ?? 0) >= DAILY_REQUEST_CAP) {
      return jsonResponse({ error: "Du har nått gränsen för antal analyser idag. Försök igen imorgon." }, 429);
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.subscription_tier === "premium";

    if (!isPremium) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthlyCount } = await serviceClient
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      if ((monthlyCount ?? 0) >= FREE_MONTHLY_LIMIT) {
        return jsonResponse(
          { error: "Du har använt dina gratis analyser för den här månaden. Uppgradera till Premium för fler." },
          403
        );
      }
    }

    const { listing } = await req.json();
    if (!listing || typeof listing !== "object") {
      return jsonResponse({ error: "Ogiltig förfrågan." }, 400);
    }

    await serviceClient.from("analysis_requests").insert({ user_id: user.id });

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "Analysmotorn är inte konfigurerad. Kontakta support." }, 500);
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: "return_car_analysis" },
        messages: [
          {
            role: "user",
            content: `Analysera följande bilannons och returnera resultatet via verktyget.\n\n${JSON.stringify(listing, null, 2)}`,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error", anthropicResponse.status, errText);
      return jsonResponse({ error: "Vi kunde inte analysera bilen just nu. Försök igen om en liten stund." }, 502);
    }

    const anthropicData = await anthropicResponse.json();
    const toolUse = (anthropicData.content as any[])?.find((block) => block.type === "tool_use");

    if (!toolUse) {
      return jsonResponse({ error: "Analysen gick inte att tolka. Försök igen." }, 502);
    }

    const parsed = claudeAnalysisSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      console.error("Schema validation failed", parsed.error.issues);
      return jsonResponse({ error: "Analysen gick inte att tolka. Försök igen." }, 502);
    }

    const result = parsed.data;

    await userClient.from("analyses").insert({
      user_id: user.id,
      listing,
      result,
      verdict: result.verdict,
    });

    return jsonResponse(result, 200);
  } catch (error) {
    console.error("analyze-car unhandled error", error);
    return jsonResponse({ error: "Något gick fel. Försök igen." }, 500);
  }
});
