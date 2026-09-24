import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Ogiltig token", 400);

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return jsonError("Länken är ogiltig eller har gått ut.", 400);
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);

  return jsonOk({ ok: true });
}
