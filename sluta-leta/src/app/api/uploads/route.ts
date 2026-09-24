import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { saveUploadedImage } from "@/lib/storage";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const { allowed } = rateLimit(clientKeyFromRequest(req, `upload:${user.id}`), 40, 60 * 60 * 1000);
  if (!allowed) return jsonError("För många uppladdningar. Försök igen senare.", 429);

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return jsonError("Ingen fil bifogad.", 400);

  try {
    const { url } = await saveUploadedImage(file);
    return jsonOk({ url });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Kunde inte spara bilden.", 400);
  }
}
