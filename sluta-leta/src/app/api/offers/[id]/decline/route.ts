import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

// "Ej aktuellt" — markerar erbjudandet, raderar inget.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const offer = await prisma.offer.findUnique({ where: { id }, include: { search: true } });
  if (!offer) return jsonError("Erbjudandet hittades inte.", 404);
  if (!offer.search || offer.search.userId !== user.id) {
    return jsonError("Du kan inte ändra det här erbjudandet.", 403);
  }
  if (offer.status !== "SENT") return jsonError("Erbjudandet är redan hanterat.", 400);

  const updated = await prisma.offer.update({ where: { id }, data: { status: "DECLINED" } });
  return jsonOk({ offer: updated });
}
