import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

// "Spara" ett erbjudande — bara köparen (sökningens ägare) kan spara/avmarkera.
async function assertOwnedOffer(id: string, userId: string) {
  const offer = await prisma.offer.findUnique({ where: { id }, include: { search: true } });
  if (!offer) return { error: jsonError("Erbjudandet hittades inte.", 404) } as const;
  if (!offer.search || offer.search.userId !== userId) {
    return { error: jsonError("Du kan inte ändra det här erbjudandet.", 403) } as const;
  }
  return { offer } as const;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const result = await assertOwnedOffer(id, user.id);
  if ("error" in result) return result.error;

  const updated = await prisma.offer.update({ where: { id }, data: { savedByBuyerAt: new Date() } });
  return jsonOk({ offer: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const result = await assertOwnedOffer(id, user.id);
  if ("error" in result) return result.error;

  const updated = await prisma.offer.update({ where: { id }, data: { savedByBuyerAt: null } });
  return jsonOk({ offer: updated });
}
