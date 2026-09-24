import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export function isImageStorageConfigured(): boolean {
  // S3 stöds via miljövariabler för produktion; utan dem används lokal disk (endast för utveckling).
  return Boolean(process.env.S3_BUCKET);
}

export async function saveUploadedImage(file: File): Promise<{ url: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Endast JPEG, PNG, WEBP eller GIF-bilder stöds.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Bilden är för stor (max 8 MB).");
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return { url: `/uploads/${filename}` };
}
