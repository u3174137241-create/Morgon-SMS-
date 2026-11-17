import { put } from "@vercel/blob";
import crypto from "crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 3 * 1024 * 1024;
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Laddar upp till Vercel Blob Storage och returnerar den publika URL:en.
// Utan BLOB_READ_WRITE_TOKEN (t.ex. lokalt utan koppling) faller vi tillbaka
// till en data-URL så uppladdning fortfarande fungerar under utveckling —
// men i produktion måste Blob Storage vara konfigurerat, annars skulle stora
// bilder kodade som data-URL:er lätt överskrida gränsen för hur stor en
// serverless-förfrågan får vara och hela annonsen skulle aldrig publiceras.
export async function saveUploadedImage(file: File): Promise<{ url: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Endast JPEG, PNG, WEBP eller GIF-bilder stöds.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Bilden är för stor (max 3 MB).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!isBlobStorageConfigured()) {
    return { url: `data:${file.type};base64,${buffer.toString("base64")}` };
  }

  const extension = EXTENSION_BY_TYPE[file.type] ?? "jpg";
  const filename = `uploads/${crypto.randomUUID()}.${extension}`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: file.type,
  });
  return { url: blob.url };
}
