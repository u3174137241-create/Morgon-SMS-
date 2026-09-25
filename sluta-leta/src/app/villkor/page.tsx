export const metadata = { title: "Användarvillkor — Sluta Leta" };

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 text-sm text-gray-700">
      <h1 className="text-2xl font-bold text-kungsbla-700">Användarvillkor</h1>
      <p className="text-xs text-gray-400">Senast uppdaterad: 2026</p>

      <p>
        Sluta Leta är en tjänst där köpare beskriver vad de letar efter och säljare hör av sig med
        erbjudanden. Genom att skapa ett konto godkänner du dessa villkor.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">1. Tjänsten</h2>
      <p>
        Sluta Leta förmedlar kontakt mellan köpare och säljare. Vi är inte part i affärer som görs
        mellan användare och ansvarar inte för varornas skick, äkthet eller för att en affär
        fullföljs. Köp och betalning mellan köpare och säljare sker på eget ansvar utanför plattformen,
        med undantag för den kontaktavgift som betalas via Sluta Leta enligt punkt 3.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">2. Konto</h2>
      <p>
        Du måste vara minst 18 år för att skapa konto. Du ansvarar för att uppgifterna du lämnar är
        korrekta och för allt som sker via ditt konto. Ett konto får inte överlåtas till någon annan.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">3. Kontaktavgift och Plus</h2>
      <p>
        När en säljare får ett erbjudande accepterat kan en kontaktavgift tas ut innan chatten låses
        upp, enligt de priser som visas i appen vid tillfället. Sluta Leta Plus är en valfri
        prenumeration som tar bort kontaktavgiften. Betalningar hanteras av vår betaltjänstleverantör
        Stripe. Prenumerationen kan avslutas när som helst och gäller till periodens slut.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">4. Regler för innehåll</h2>
      <p>
        Du får inte publicera olagligt, kränkande, vilseledande eller stötande innehåll, inte utge dig
        för att vara någon annan, och inte använda tjänsten för bedrägeri eller trakasserier. Vi kan
        ta bort innehåll och stänga av konton som bryter mot detta, med eller utan förvarning.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">5. Rapportering och moderering</h2>
      <p>
        Användare kan rapportera annat innehåll eller andra användare. Vi granskar rapporter men kan
        inte garantera en viss handläggningstid.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">6. Ansvarsbegränsning</h2>
      <p>
        Tjänsten tillhandahålls i befintligt skick. Vi ansvarar inte för indirekta skador, förlorade
        affärer eller tvister mellan användare. Vårt ansvar är i alla lägen begränsat till vad som
        följer av tvingande svensk lag.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">7. Ändringar</h2>
      <p>
        Vi kan ändra dessa villkor. Väsentliga ändringar meddelas via appen eller e-post. Fortsatt
        användning efter en ändring innebär att du godkänner de nya villkoren.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">8. Kontakt</h2>
      <p>
        Frågor om villkoren skickas till{" "}
        <a href="mailto:hjalp@slutaleta.se" className="font-medium text-kungsbla-600 underline">
          hjalp@slutaleta.se
        </a>
        .
      </p>
    </div>
  );
}
