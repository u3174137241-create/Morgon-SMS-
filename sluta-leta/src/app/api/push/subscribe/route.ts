import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const body = await req.json().catch(() => null);
  const parsed = pushSubscribeSchema.safeParse(body);
  if (!parsed.success) return jsonError("Ogiltig indata.", 400);
  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });

  return jsonOk({ ok: true }, 201);
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const body = await req.json().catch(() => null);
  const parsed = pushUnsubscribeSchema.safeParse(body);
  if (!parsed.success) return jsonError("Ogiltig indata.", 400);

  await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId: user.id } });
  return jsonOk({ ok: true });
}
