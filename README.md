# Bilkoll

**Är den här bilen värd pengarna?**

Bilkoll är en iOS-app (Expo + React Native + TypeScript) som analyserar
begagnade bilannonser och ger ett tydligt, transparent beslutsunderlag:
prisbedömning, riskprofil, förhandlingsläge och en konkret checklista —
innan du lägger ett bud.

Byggd för den svenska marknaden, med en premium, minimalistisk design i
linje med etablerade svenska fintech-/bilplattformar snarare än en
generisk "AI-app".

## Snabbstart

```bash
npm install
npm run start   # öppnar Expo Dev Tools — skanna QR-koden med Expo Go, eller tryck i / a
```

Appen fungerar direkt utan någon backend-konfiguration: utan Supabase
kör den i **demo-läge** — en lokal, regelbaserad analysmotor
(`features/analysis/heuristicEngine.ts`) simulerar Claude-svaret så att
hela flödet (onboarding → analys → resultat → förhandling → jämförelse
→ historik) går att testa end-to-end direkt, seedat med fyra realistiska
demo-analyser (Volvo V60, BMW 320d, Audi A4, Toyota RAV4).

## Koppla på riktig backend

1. **Supabase**
   - Skapa ett projekt, kör migrationerna i `supabase/migrations/`.
   - Lägg `EXPO_PUBLIC_SUPABASE_URL` och `EXPO_PUBLIC_SUPABASE_ANON_KEY`
     i `app.json` → `expo.extra` (eller som EAS-miljövariabler).
2. **Claude (Anthropic)**
   - Deploya Edge Function: `supabase functions deploy analyze-car`
   - Sätt secrets (aldrig i klienten):
     ```bash
     supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
     supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
     ```
   - Så fort `isSupabaseConfigured` är sant (`services/supabaseClient.ts`)
     byter appen automatiskt från demo-läge till att anropa
     `analyze-car` via `supabase.functions.invoke`.
3. **Betalning (App Store / Stripe)**
   - `app/paywall.tsx` och `services/usageService.ts` är förberedda för
     att kopplas till `react-native-purchases` (RevenueCat) eller
     App Store-kvittovalidering server-side. I nuläget simuleras köpet
     lokalt så att paywall-flödet går att testa.

## Arkitektur

```
app/                 Expo Router-skärmar (fil = route)
  onboarding.tsx
  (tabs)/             Hem · Analysera · Jämför · Historik · Profil
  result/[id].tsx      Appens viktigaste skärm
  paywall.tsx
  legal/

components/
  ui/                 Generella designsystem-komponenter (Button, Card, Text, …)
  analysis/           Analys-specifika komponenter (VerdictBanner, RiskRow, …)
  forms/              Formulärkomponenter

features/
  analysis/           Zod-schema för Claude-utdata, mappning, förhandlingstext,
                       lokal heuristik-motor (demo-läge), jämförelsepoäng
  listings/            ListingParser — modulärt annonskällregister
                       (Blocket/Wayke/Bytbil/Facebook/manuell)

services/             Supabase-klient, analys-/auth-/lagrings-/usage-tjänster
hooks/                React-hooks som binder services till UI
lib/                  Designsystem-konstanter, demo-data, checklistor
types/                Delade TypeScript-typer
utils/                Formatering (SEK, datum, m.m.)

supabase/
  migrations/         Schema + Row Level Security
  functions/analyze-car/   Edge Function — enda platsen som pratar med Claude
```

### Varför en `ListingParser`-modul?

`features/listings/ListingParser.ts` är byggd för att enkelt kunna växa
till fler källor (kap. 15) — varje källa (Blocket, Wayke, Bytbil, …)
implementerar samma `ListingSourceParser`-gränssnitt. Appen använder
inte Blockets varumärke eller grafiska identitet.

### Datakvalitet och tillförlitlighet

Resultatskärmen separerar tydligt:

- **Från annonsen** — verifierad data användaren angett
- **AI-bedömning** — Claudes tolkning/bedömning
- **Saknas** — vad som inte gick att avgöra

Claude instrueras uttryckligen (se system-prompten i
`supabase/functions/analyze-car/index.ts`) att aldrig hitta på
fordonsdata, historik eller marknadspriser — saknad information
returneras som `null`/tom lista och visas som "saknas" i appen. All
AI-utdata valideras mot ett strikt Zod-schema
(`features/analysis/schema.ts`) innan den visas.

## Designprinciper

Neutral, sofistikerad palett (svart/vitt/grått) — grönt/gult/rött
används uteslutande för verdict/risk-semantik. 8px spacing-system,
tydliga typografiska nivåer, subtila borders istället för skuggor,
native iOS-navigation (Expo Router + bottom tabs), stöd för Dynamic
Type och mörkt läge. Se `lib/constants/`.

## App Store-förberedelse

- `app.json` har bundle identifier, splash, ikon-referenser och
  behörighetstexter (kamera/bibliotek) på svenska.
- Platshållar-ikoner/splash i `assets/` — ersätt med riktig grafik
  innan release.
- `app/legal/privacy.tsx` och `app/legal/terms.tsx` innehåller
  platshållartext som måste ersättas med juridiskt granskad text.

## Kommandon

```bash
npm run ios        # Öppna i iOS-simulator
npm run typecheck  # tsc --noEmit
```
