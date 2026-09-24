import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { findMatchingSearchesForListing } from "@/lib/findBuyers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return jsonError("Hittades inte.", 404);
  if (listing.userId !== user.id) return jsonError("Du äger inte det här föremålet.", 403);

  const matches = await findMatchingSearchesForListing(listing);
  return jsonOk({ matches });
}
