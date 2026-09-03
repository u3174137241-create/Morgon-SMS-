# AI Lead Hunter

Ett lokalt, privat AI-baserat lead hunting-system för personligt bruk. Systemet
letar automatiskt efter färska, öppna webbtexter där någon uttrycker ett
faktiskt köpbehov ("behöver hjälp med badrumsrenovering i Stockholm"),
kvalificerar och poängsätter dem med AI, filtrerar bort dubbletter/gammalt/spam,
sparar resultatet i en lokal SQLite-databas och notifierar dig via Telegram.

**Systemet kontaktar aldrig någon åt dig.** Det upptäcker, analyserar, poängsätter,
sparar och notifierar — du sköter själv kontakten med leadet.

## Varför är detta inte en SaaS?

Det här är ett verktyg för en (1) användare, byggt för att köras på din egen
dator med så nära 0 kr driftskostnad som möjligt. Inga konton, ingen
fakturering, inget multi-tenant-stöd — se `BUILD_SPEC` i uppgiftsbeskrivningen
för fullständiga begränsningar.

## Snabbstart

```bash
cd lead-hunter
npm install
cp .env.example .env   # fyll i det du har (allt är valfritt, se nedan)
npm run doctor          # kontrollerar att allt är korrekt konfigurerat
npm run dev              # startar schemaläggare + dashboard på http://localhost:3100
```

Öppna `http://localhost:3100` i webbläsaren för dashboarden.

Kör en enskild sökning direkt från terminalen (utan att starta hela servern):

```bash
npm run search:now
```

## Använda den på telefonen

Backend-servern (databas, sökningar, AI, schemaläggare) måste alltid köra
någonstans kontinuerligt — den kan inte köras på telefonen själv. Två
lägen, beroende på om du har en dator som kan stå påslagen eller ej:

### A) Du har bara telefonen (inget datorterminal)

Distribuera servern till en gratis molntjänst — allt nedan görs genom att
trycka dig igenom en webbsida i telefonens webbläsare, ingen kod, ingen
terminal.

**1. Skapa konto på [render.com](https://render.com)** — gratis, inget
kort krävs. Logga in med GitHub om du kan, det sparar ett steg.

**2. Anslut det här repot** — tryck **New +** → **Web Service** (eller
**Blueprint** om Render hittar `render.yaml` automatiskt och fyller i allt
åt dig) → välj GitHub-repot `Morgon-SMS-`.

**3. Om du fick den manuella formuläret (inte Blueprint), fyll i:**

| Fält | Värde |
|---|---|
| Root Directory | `lead-hunter` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** |

**4. Lägg till miljövariabler** (under "Environment" i samma formulär):

| Namn | Värde | Krävs? |
|---|---|---|
| `APP_PASSWORD` | ett eget lösenord | **Ja** — annars är dashboarden öppen för hela internet |
| `DRY_RUN` | `false` | Ja |
| `ANTHROPIC_API_KEY` | din nyckel | Nej — utan den används gratis AI-fallback |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | se avsnittet nedan | Nej |

**5. Tryck Deploy.** Första bygget tar några minuter. När det är klart får
du en adress som `https://ai-lead-hunter-xxxx.onrender.com`.

**6. Öppna adressen i telefonens webbläsare** → logga in med lösenordet du
satte → **Lägg till på hemskärmen** (Safari: dela-ikonen; Chrome: menyn ⋮).
Nu har du en app-ikon som pratar med din alltid-igång-server.

**Att tänka på med gratisnivån:** tjänsten "somnar" efter en stunds
inaktivitet och tar 30–60 sekunder att vakna igen vid nästa besök — det
betyder att den automatiska schemaläggaren (var 6:e timme) inte nödvändigtvis
hinner köra medan den sover. Enklast fix: öppna appen då och då själv (det
väcker den och kör igång), eller sätt upp en gratis "ping"-tjänst som
[cron-job.org](https://cron-job.org) att anropa `https://din-adress/api/health`
var 10:e minut — går också att ställa in helt från telefonen. Data i
databasen överlever att tjänsten somnar/vaknar, men kan nollställas om du
gör om deployen (pushar ny kod) — helt okej för ett gratis personligt
verktyg, men bra att veta.

### B) Du har en dator som kan stå på

Kör servern lokalt (`npm run dev` enligt Snabbstart ovan) och öppna den
från telefonen:

**Som webbapp** — dashboarden är en installningsbar PWA. Öppna
`http://DATORNS-IP:3100` i telefonens webbläsare (samma WiFi som datorn)
och välj "Lägg till på hemskärmen" (iOS Safari) eller installationsikonen
i adressfältet (Android Chrome).

**Som riktig Expo-app** — en separat React Native-app i samma
beige/vit/guld-stil, med lokala notiser på telefonen. Se
[`mobile/README.md`](mobile/README.md) för fullständiga instruktioner
(körs via Expo Go, ingen app store krävs för eget bruk):

```bash
cd mobile
npm install
npx expo start
```

Skanna QR-koden med Expo Go-appen, ange sedan datorns IP-adress och port
(eller din publika Render-adress om du valde alternativ A) på
anslutningsskärmen.

## Vad krävs egentligen?

**Ingenting är obligatoriskt.** Systemet fungerar helt gratis direkt efter
`npm install` med en inbyggd regelbaserad AI-kvalificerare — men du kan
förbättra precisionen och få notiser genom att lägga till:

| Variabel | Krävs? | Vad den ger |
|---|---|---|
| `ANTHROPIC_API_KEY` | Nej | Bättre AI-kvalificering via Claude. Utan den används en gratis, lokal regelbaserad analys (fungerar, men mindre träffsäker). |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Nej | Notiser när ett hett/varmt lead hittas. Utan dem loggas notiser bara till konsolen. |
| `APP_PASSWORD` | Nej | Lösenordsskyddar dashboarden/API:t (rekommenderas om servern är nåbar från andra enheter). |

## Telegram-notiser — steg för steg

1. Öppna Telegram, sök upp **@BotFather** och skicka `/newbot`. Följ
   instruktionerna — du får tillbaka en **bot-token**.
2. Skicka ett valfritt meddelande till din nya bot (annars kan den inte
   skicka meddelanden tillbaka till dig).
3. Hämta ditt **chat id** genom att öppna:
   `https://api.telegram.org/bot<DIN_TOKEN>/getUpdates`
   och leta upp `"chat":{"id": ...}` i svaret.
4. Lägg in `TELEGRAM_BOT_TOKEN` och `TELEGRAM_CHAT_ID` i `.env`.
5. Testa: sätt `DRY_RUN=false` och kör `npm run search:now`, eller vänta på
   att schemaläggaren hittar ett kvalificerande lead.

Sätt `DRY_RUN=true` i `.env` när du vill testa systemet utan att skicka
riktiga meddelanden — notiser loggas då bara till konsolen istället.

## Så fungerar det (pipeline)

```
SearchStrategyEngine          källadaptrar (DuckDuckGo, Reddit, …)
  genererar sökfrågor    →    hämtar öppna sökresultat/inlägg
        │                              │
        ▼                              ▼
                    kandidat (url, titel, textutdrag)
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
            dubblettkoll  färskhetskoll  AI-kvalificering
           (URL/hash/text)  (max ålder)  (Anthropic eller
                 │            │           regelbaserad fallback)
                 └────────────┴────────────┘
                              ▼
                     poängsättning 0–100
                  (köpintention, färskhet, tydlighet,
                   geografi, specificitet, kommersiellt
                   värde, källkvalitet)
                              ▼
                    sparas i SQLite (leads-tabellen)
                              ▼
              Telegram-notis om score ≥ tröskelvärde
```

Varje steg loggas till konsolen (SEARCH_STARTED, CANDIDATE_FOUND,
AI_ANALYSIS, LEAD_ACCEPTED/REJECTED, DUPLICATE, NOTIFICATION_SENT, …) så du
kan se exakt vad systemet gör.

## Konfiguration

Allt nedan kan ändras live från dashboardens Inställningar-flik (sparas i
SQLite) — inget kräver kodändring eller omstart.

- **Kategorier** — aktivera/inaktivera, eller lägg till egna via
  `POST /api/categories` (`id`, `name`, `keywords`, `buyerTypes`).
  Standardkategorier: se `src/config/categories.ts`.
- **Platser** — hela Sverige som default, plus Stockholm, Haninge, Huddinge,
  Södertälje, Uppsala, Göteborg, Malmö. Lägg till egna via
  `POST /api/locations` (`id`, `name`, `type`: country/county/municipality/
  city/district/postal).
- **Max lead-ålder** — default 7 dagar. Leads äldre än så filtreras bort
  innan de ens AI-analyseras.
- **Minsta score för notis** — default 75/100.
- **Sökintervall** — default var 6:e timme.
- **Sökintensitet** — LOW/MEDIUM/HIGH styr hur många sökfrågor som körs per
  omgång (15/30/60 st, roterande genom hela frågelistan över flera
  körningar så att inga externa tjänster överbelastas).

## Lägga till en ny källa

Varje datakälla är en fristående "source adapter" i `src/sources/`:

```ts
// src/sources/public-pages/minKälla.ts
import type { SourceAdapter } from "../types.js";

export const minKälla: SourceAdapter = {
  id: "min-kalla",
  name: "Min Källa",
  type: "public-pages",
  defaultQuality: "MEDIUM",
  minDelayMs: 3000,
  async search(query, opts) {
    // hämta/parsa öppen, publik data — ingen inloggning, ingen CAPTCHA-
    // kringgång, respektera robots.txt och rate limits.
    return [{ url, title, snippet, publishedHint }];
  },
};
```

Lägg sedan till den i `src/sources/registry.ts`. Resten av pipelinen
(dedup, färskhet, AI, scoring, notiser) fungerar automatiskt utan ändringar.

**Regler för nya källor** (gäller alla, inbyggda som egna): ingen
CAPTCHA-kringgång, ingen inloggning, inga paywalls, inga stulna databaser,
respektera rate limits och robots.txt, ingen aggressiv scraping, och skicka
aldrig automatiska meddelanden till personer.

## Dashboard

- **Dashboard-fliken**: hot/warm-leads, leads idag/denna vecka, avvisade,
  dubbletter, sökhistorik, källstatus, och en knapp för att köra en sökning
  direkt.
- **Leads-fliken**: filtrerbar lista (status/kategori/plats/min-score).
  Klicka på ett lead för fullständig info, öppna originalkällan, eller
  markera som Sold/Contacted/Reviewed/Discarded.
- **Notiser-fliken**: historik över alla notiser (skickade, DRY_RUN-loggade
  och misslyckade), med en klocka i headern för snabb överblick.
- **Inställningar-fliken**: allt under "Konfiguration" ovan, plus
  kategori-/platstoggling.

Dashboarden är även en installningsbar PWA (manifest + service worker) —
se ["Använda den på telefonen"](#använda-den-på-telefonen) ovan.

## Självdiagnostik

```bash
npm run doctor
```

Kontrollerar Node-version, installerade beroenden, databas-skrivbarhet,
miljövariabler, Telegram-konfiguration, filsystemsbehörigheter och att
källadaptrarna är registrerade — med tydliga ✅/⚠️/❌-meddelanden.

## Tester

```bash
npm test
```

Täcker: lead-scoring, färskhetsberäkning, dubblettdetektering,
kategoriklassificering, platsextraktion, sökfrågegenerering,
JSON-validering av AI-svar, och notisformattering.

## Felsökning

- **"0 new qualified leads"** — helt normalt och förväntat. Systemet hittar
  aldrig på falska leads för att dashboarden ska se aktiv ut (se
  `IMPORTANT: DO NOT FAKE DATA` i kravspecen). Färre men bättre leads är
  målet, inte volym.
- **DuckDuckGo/Reddit ger `HTTP 403` på alla queries** — det händer oftast
  när anropen görs från en datacenter-/molnserver-IP (t.ex. en CI-runner
  eller en delad sandbox) som är flaggad som bot-trafik; kör systemet från
  din vanliga hemdator/internetuppkoppling istället. Om båda källorna
  konsekvent misslyckas ser du det direkt i dashboardens Källor-panel
  (`errorCount` hög, `successCount` 0) och i loggen som `SOURCE_ERROR` —
  systemet kraschar aldrig av detta, det fortsätter bara med 0 kandidater
  och rapporterar ärligt "0 new qualified leads" istället för att hitta på
  data. Om HTML-strukturen hos någon av källorna ändras över tid kan
  samma symptom uppstå — justera parsningen i `src/sources/*/*.ts` vid
  behov.
- **Inga Telegram-notiser** — kontrollera `npm run doctor`, att
  `DRY_RUN=false`, och att du skickat minst ett meddelande till din bot
  innan `getUpdates` returnerar ett chat-id.
- **Databasfel** — databasen ligger i `data/leads.sqlite` (styrs av
  `DB_PATH`). Radera filen för att börja om helt (du förlorar all
  lead-historik).
- **Windows** — `npm test` sätter miljövariabler med Unix-syntax
  (`DB_PATH=... command`). Kör via WSL eller Git Bash, eller sätt
  variablerna manuellt i din terminal innan du kör testkommandot.
- **Telefonen/Expo-appen kan inte nå servern** — kontrollera att telefonen
  är på samma WiFi-nätverk som datorn, att du använder datorns lokala
  IP-adress (inte `localhost`), och att ingen brandvägg blockerar porten
  (`3100` som default). Testa genom att öppna samma adress i telefonens
  webbläsare först. API:t skickar redan med CORS-headers så webbläsare och
  Expo-appen kan nå det från en annan origin/enhet.

## Arkitektur & designval

- **TypeScript + Node.js`, körs direkt med `tsx`** — ingen extra
  byggpipeline behövs under utveckling (`npm run build` finns för en riktig
  `dist/`-build).
- **SQLite via `better-sqlite3`** — en enda lokal fil, inga externa
  databastjänster.
- **Ingen extern sökmotor-API** — DuckDuckGos publika HTML-resultatsida och
  Reddits publika RSS-sökflöde används istället, båda utan API-nyckel.
- **AI är utbytbar** — `src/ai/aiClient.ts` definierar interfacet;
  `anthropicClient.ts` och `ruleBasedClient.ts` är två utbytbara
  implementationer valda i `src/ai/index.ts` beroende på om
  `ANTHROPIC_API_KEY` finns.
- **Inget skickas ut som inte behövs** — ingen data lämnar din dator utom
  (a) sökfrågor till DuckDuckGo/Reddit, (b) kandidattext till Anthropic om
  du konfigurerat en API-nyckel, och (c) lead-notiser till din egen
  Telegram-bot.
