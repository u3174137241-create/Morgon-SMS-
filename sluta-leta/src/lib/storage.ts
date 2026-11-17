import { put } from "@vercel/blob";
import crypto from "crypto";
import convertHeic from "heic-convert";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);
const MAX_BYTES = 3 * 1024 * 1024;
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// iPhones sparar foton som HEIC/HEIF som standard. De flesta webbläsare (och
// <img>/next/image) kan inte visa HEIC alls, så en sådan bild "laddas upp"
// utan fel men syns sedan aldrig i annonsen. iOS-webbläsaren konverterar
// oftast HEIC till JPEG automatiskt vid filval, men appens inbäddade WebView
// (se mobile/App.tsx) skickar ofta filen rakt av — då saknas även en korrekt
// MIME-typ, så filändelsen kollas som sista utväg.
function isHeicFile(file: File): boolean {
  if (HEIC_TYPES.has(file.type)) return true;
  return /\.hei[cf]$/i.test(file.name);
}

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
  if (file.size > MAX_BYTES) {
    throw new Error("Bilden är för stor (max 3 MB).");
  }

  let buffer = Buffer.from(await file.arrayBuffer());
  let contentType = file.type;

  if (isHeicFile(file)) {
    try {
      buffer = Buffer.from(await convertHeic({ buffer, format: "JPEG", quality: 0.85 }));
    } catch {
      throw new Error("Kunde inte läsa HEIC-bilden. Prova att ta om bilden eller välj en annan.");
    }
    contentType = "image/jpeg";
  } else if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Endast JPEG, PNG, WEBP, GIF eller HEIC-bilder stöds.");
  }

  if (!isBlobStorageConfigured()) {
    return { url: `data:${contentType};base64,${buffer.toString("base64")}` };
  }

  const extension = EXTENSION_BY_TYPE[contentType] ?? "jpg";
  const filename = `uploads/${crypto.randomUUID()}.${extension}`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType,
  });
  return { url: blob.url };
}
