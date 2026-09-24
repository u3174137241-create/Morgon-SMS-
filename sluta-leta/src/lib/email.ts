const RESEND_API_URL = "https://api.resend.com/emails";

function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) {
    // Ingen e-postleverantör konfigurerad — logga länken istället för att låtsas den skickats.
    console.log(`[email:ej konfigurerad] Till: ${to} | Ämne: ${subject}\n${html}`);
    return;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Sluta Leta <no-reply@slutaleta.se>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kunde inte skicka e-post (${res.status}): ${text}`);
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  await sendEmail(
    to,
    "Bekräfta din e-postadress — Sluta Leta",
    `<p>Välkommen till Sluta Leta!</p><p><a href="${verifyUrl}">Klicka här för att bekräfta din e-postadress</a></p><p>Länken är giltig i 24 timmar.</p>`
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail(
    to,
    "Återställ ditt lösenord — Sluta Leta",
    `<p>Vi fick en förfrågan om att återställa ditt lösenord.</p><p><a href="${resetUrl}">Klicka här för att välja ett nytt lösenord</a></p><p>Länken är giltig i 1 timme. Om du inte begärde detta kan du ignorera mejlet.</p>`
  );
}
