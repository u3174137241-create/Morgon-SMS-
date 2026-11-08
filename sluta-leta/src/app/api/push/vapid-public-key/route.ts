import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  if (!process.env.VAPID_PUBLIC_KEY) return jsonError("Push är inte konfigurerat.", 503);
  return jsonOk({ publicKey: process.env.VAPID_PUBLIC_KEY });
}
