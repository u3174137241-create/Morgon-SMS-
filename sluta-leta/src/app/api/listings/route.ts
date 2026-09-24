import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createListingSchema } from "@/lib/validation";
import { parseSearchText } from "@/lib/nlpParse";
import { findMatchingSearchesForListing } from "@/lib/findBuyers";

// POST /api/listings — säljaren beskriver ett föremål/tjänst för "Hitta köpare".
// Detta skapar INTE en offentlig annons — det används för att matcha mot befintliga
// köparefterlysningar internt i Sluta Leta.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);
  if (!user.emailVerifiedAt) return jsonError("Bekräfta din e-postadress först.", 403);

  const body = await req.json().catch(() => null);
  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata", 400);
  const { title, description, price, location, images } = parsed.data;

  const parsedText = parseSearchText(`${title} ${description}`);

  const listing = await prisma.listing.create({
    data: {
      userId: user.id,
      title,
      description,
      type: parsedText.itemType,
      condition: parsedText.condition,
      price,
      location,
      images: { create: images.map((url, order) => ({ url, order })) },
    },
  });

  const matches = await findMatchingSearchesForListing(listing);

  return jsonOk({ listing, matches }, 201);
}
