export const metadata = { title: "Integritetspolicy — Sluta Leta" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 text-sm text-gray-700">
      <h1 className="text-2xl font-bold text-kungsbla-700">Integritetspolicy</h1>
      <p className="text-xs text-gray-400">Senast uppdaterad: 2026</p>

      <p>
        Den här sidan förklarar vilka personuppgifter Sluta Leta samlar in, varför, och vilka
        rättigheter du har enligt GDPR.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">1. Vilka uppgifter vi samlar in</h2>
      <ul className="list-inside list-disc space-y-1">
        <li>Kontouppgifter: namn, e-postadress, lösenord (lagras krypterat, aldrig i klartext).</li>
        <li>Innehåll du skapar: sökningar, erbjudanden, meddelanden, bilder, recensioner.</li>
        <li>Betalinformation: hanteras av Stripe — vi lagrar aldrig hela kortnummer själva.</li>
        <li>Teknisk data: inloggningssessioner och grundläggande loggar för säkerhet och felsökning.</li>
      </ul>

      <h2 className="mt-2 font-bold text-kungsbla-700">2. Varför vi behandlar uppgifterna</h2>
      <p>
        För att skapa ditt konto och driva tjänsten, matcha köpare och säljare, hantera betalningar,
        skicka viktiga mejl (t.ex. bekräftelse och kvitton), förhindra missbruk och bedrägeri, samt
        uppfylla bokförings- och lagkrav.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">3. Vem vi delar uppgifter med</h2>
      <p>
        Vi delar uppgifter med underleverantörer som behövs för att driva tjänsten: Stripe
        (betalningar), Resend (e-post) och vår serverdriftleverantör. Vi säljer aldrig dina uppgifter
        till tredje part. Andra användare ser bara det du själv väljer att visa (namn, profilbild,
        dina publika sökningar/erbjudanden).
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">4. Hur länge vi sparar uppgifter</h2>
      <p>
        Så länge du har ett konto. Bokföringsunderlag för betalningar sparas den tid svensk lag kräver
        (normalt 7 år) även efter att kontot raderats. Sökningar som inte förnyas tas automatiskt bort
        30 dagar efter att de skapades.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">5. Dina rättigheter</h2>
      <p>
        Du har rätt att få ut en kopia av dina uppgifter och att radera ditt konto direkt under{" "}
        <span className="font-medium">Profil → Integritet & säkerhet</span>. Du kan även begära
        rättelse av felaktiga uppgifter eller invända mot viss behandling genom att kontakta oss.
      </p>

      <h2 className="mt-2 font-bold text-kungsbla-700">6. Kontakt och tillsyn</h2>
      <p>
        Frågor om integritet skickas till{" "}
        <a href="mailto:hjalp@slutaleta.se" className="font-medium text-kungsbla-600 underline">
          hjalp@slutaleta.se
        </a>
        . Du har alltid rätt att klaga till Integritetsskyddsmyndigheten (IMY) om du anser att vi
        behandlar dina uppgifter felaktigt.
      </p>
    </div>
  );
}
