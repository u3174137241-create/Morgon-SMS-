import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

// Säljaren ångrar/återkallar ett eget erbjudande innan köparen har tagit ställning.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const offer = await prisma.offer.findUnique({ where: { id } });
  if (!offer) return jsonError("Erbjudandet hittades inte.", 404);
  if (offer.sellerId !== user.id) return jsonError("Du kan inte ändra det här erbjudandet.", 403);
  if (!["SENT", "VIEWED"].includes(offer.status)) return jsonError("Erbjudandet kan inte återkallas längre.", 400);

  const updated = await prisma.offer.update({ where: { id }, data: { status: "WITHDRAWN" } });
  return jsonOk({ offer: updated });
}
