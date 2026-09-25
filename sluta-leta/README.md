# Sluta Leta

Omvänd marknadsplats: köpare beskriver vad de söker (gratis), säljare lämnar
erbjudanden och betalar en kontaktavgift (eller inget med Plus) när köparen
godkänner. Next.js 16 (App Router) + PostgreSQL (Prisma) + Stripe.

## Kom igång lokalt

```bash
cd sluta-leta
npm install
cp .env.example .env.local   # fyll i DATABASE_URL, SESSION_SECRET minst
cp .env.local .env           # Prisma CLI läser .env, inte .env.local
npx prisma migrate deploy
npm run dev
```

Kräver en PostgreSQL-databas. `DATABASE_URL` i `.env.example` pekar mot en
lokal instans (`postgresql://postgres:devpassword@localhost:5432/slutaleta`).

## Produktionsdrift

Live-preview: **https://sluta-leta.vercel.app** (Vercel + Supabase Postgres).

Demokonto (redan e-postverifierat, inget att vänta på):
- E-post: `demo@slutaleta.se`
- Lösenord: `SlutaLeta2026!`

Två produktionsspecifika buggar hittades och fixades under driftsättningen
(ingen av dem syntes lokalt eftersom `node_modules` redan fanns och Next
inte körde en helt färsk installation):
- **CVE-2025-66478**: Next 16.3.5 blockerades av Vercels säkerhetsgrind vid
  varje deploy. Löst genom uppgradering till 16.3.6 (patchversionen).
- **`prisma generate` kördes inte pålitligt** som postinstall-hook i Vercels
  byggmiljö, vilket fick `next build` att misslyckas så fort någon route
  importerade `@prisma/client`. Löst genom att köra det explicit:
  `"build": "prisma generate && next build"`.

Miljövariabler satta i Vercel-projektet: `DATABASE_URL` (Supabase
transaction pooler, port 6543, dedikerad roll `slutaleta_app` — inte
standardrollen `postgres`), `SESSION_SECRET`, `APP_BASE_URL`.

## Vad är riktigt implementerat

- **Auth**: e-post + lösenord, bcrypt-hash, signerade sessionscookies,
  e-postverifiering, lösenordsåterställning, rate limiting på känsliga endpoints.
- **Sökningar (efterlysningar)**: skapas gratis av köpare, regelbaserad
  tolkning av fri text (budget/plats/skick/produkt vs tjänst), 30 dagars TTL.
- **Erbjudanden & matchning**: säljare lämnar erbjudanden, flera erbjudanden
  kan finnas samtidigt (raderas aldrig, bara markeras), hybrid matchning
  (hårda krav filtrerar, mjuka preferenser poängsätter) används både i
  sökdetaljer och i "Hitta köpare".
- **Transaktions-/betalningsstatemaskin**: exakt de tillstånd och övergångar
  som är definierade i produktspecen, backend-styrd (frontend kan aldrig
  sätta status själv).
- **Kontaktavgift**: 20/49/149 kr beroende på erbjudandets pris, 0 kr med
  aktiv Plus — beräkningen är enhetstestad.
- **Stripe**: riktig Checkout- och webhook-integration (signaturverifiering,
  idempotens via unikt `Payment.stripeObjectId`) för både kontaktavgift och
  Plus-prenumeration. **Utan `STRIPE_SECRET_KEY` svarar API:t ärligt 503
  "inte konfigurerat" — det finns ingen fejkad betalningsframgång någonstans.**
- **Chat**: låst tills en `Conversation` finns (skapas bara av backend efter
  godkänd betalning eller Plus-waiver).
- **Recensioner**: kräver en `COMPLETED`-transaktion, en recension per part
  och affär, blockerar självrecensioner.
- **Admin-översikt**: nyckeltal (användare, aktiva sökningar, intäkter,
  Plus-medlemmar, transaktioner per status) bakom `isAdmin`-kontroll.

## Vad är medvetet stubbat

- **E-post**: utan `RESEND_API_KEY` loggas verifierings-/återställningslänkar
  till servern istället för att skickas.
- **Bilduppladdning**: utan S3-variabler sparas bilder lokalt på disk
  (`public/uploads`) — fungerar för utveckling, inte för produktion i skala.

## Vad som medvetet INTE är byggt än

- GDPR-dataexport/kontoradering, push-notiser, röstmeddelande-inspelning i
  UI (endast datamodell/uppspelning), rapportering/moderering-UI (datamodell
  finns), fullständig ESLint-konfiguration (känd `@eslint/eslintrc`/
  flat-config-krock med denna Next/React-kombination — `tsc --noEmit` +
  `vitest` + `next build` används som kvalitetsgrindar tills detta löses).

## Testat manuellt end-to-end

Registrering → e-postverifiering → inloggning → skapa sökning → erbjudande →
godkännande → kontaktavgift (149 kr-nivå) → chatt låst till betalning →
Plus-waiver (0 kr, chatt upplåst direkt) → chattmeddelanden → ömsesidig
bekräftelse → recension → "Hitta köpare"-matchning → admin-översikt. En
bugg (ogiltig statusövergång vid `DEAL_IN_PROGRESS -> COMPLETED`) hittades
och fixades under detta testpass.

## Kommandon

```bash
npm run dev          # utvecklingsserver
npm run build         # produktionsbygge
npm test              # vitest (fees, matching, NLP-parsning)
npm run typecheck     # tsc --noEmit
npx prisma studio     # bläddra i databasen
```
