import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createOfferSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

// POST /api/offers — "Lämna erbjudande". Görs av säljaren, mot en efterlysning
// (Search) eller ett fynd hittat via Hitta köpare (listing/search-kombination).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);
  if (!user.emailVerifiedAt) return jsonError("Bekräfta din e-postadress innan du kan lämna erbjudanden.", 403);

  const { allowed } = rateLimit(clientKeyFromRequest(req, `create-offer:${user.id}`), 30, 60 * 60 * 1000);
  if (!allowed) return jsonError("För många erbjudanden skickade. Försök igen senare.", 429);

  const body = await req.json().catch(() => null);
  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata", 400);
  const { searchId, listingId, price, message, images } = parsed.data;

  if (!searchId && !listingId) return jsonError("Erbjudandet måste kopplas till en sökning.", 400);

  if (searchId) {
    const search = await prisma.search.findUnique({ where: { id: searchId } });
    if (!search) return jsonError("Sökningen hittades inte.", 404);
    if (search.status !== "ACTIVE" || search.expiresAt < new Date()) {
      return jsonError("Sökningen är inte längre aktiv.", 400);
    }
    if (search.userId === user.id) return jsonError("Du kan inte lämna ett erbjudande på din egen sökning.", 400);
  }

  const offer = await prisma.offer.create({
    data: {
      searchId,
      listingId,
      sellerId: user.id,
      price,
      message,
      images: { create: images.map((url, order) => ({ url, order })) },
    },
    include: { images: true },
  });

  if (searchId) {
    const search = await prisma.search.findUniqueOrThrow({ where: { id: searchId } });
    await prisma.notification.create({
      data: {
        userId: search.userId,
        type: "NEW_OFFER",
        payload: { offerId: offer.id, searchId, price },
      },
    });
  }

  return jsonOk({ offer }, 201);
}
