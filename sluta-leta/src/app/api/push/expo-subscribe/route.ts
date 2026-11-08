import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { expoPushTokenSchema } from "@/lib/validation";

// Tar emot ett Expo-pushtoken från den native iOS/Android-appen (skickas via
// WebView-bryggan, se mobile/App.tsx). Separat från /api/push/subscribe som
// bara gäller webbläsarens Web Push-prenumerationer.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const body = await req.json().catch(() => null);
  const parsed = expoPushTokenSchema.safeParse(body);
  if (!parsed.success) return jsonError("Ogiltig indata.", 400);

  await prisma.expoPushToken.upsert({
    where: { token: parsed.data.token },
    create: { userId: user.id, token: parsed.data.token },
    update: { userId: user.id },
  });

  return jsonOk({ ok: true }, 201);
}
