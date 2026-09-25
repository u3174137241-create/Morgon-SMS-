const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 3 * 1024 * 1024;

// Utan Vercel Blob Storage kodas bilden som en data-URL och sparas direkt i
// databasen. Det fungerar överallt utan extra konto, men är en tillfällig
// lösning tills Blob Storage är aktiverat i Vercel-projektet — då bör den
// här funktionen laddas om för att ladda upp till Blob istället och
// returnera den publika URL:en därifrån.
export async function saveUploadedImage(file: File): Promise<{ url: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Endast JPEG, PNG, WEBP eller GIF-bilder stöds.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Bilden är för stor (max 3 MB).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return { url: `data:${file.type};base64,${buffer.toString("base64")}` };
}
