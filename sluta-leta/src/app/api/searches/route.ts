import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createSearchSchema } from "@/lib/validation";
import { parseSearchText } from "@/lib/nlpParse";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";
import { notifyMatchingSellersForSearch } from "@/lib/notifyMatchingSellers";
import type { Prisma } from "@prisma/client";

const SEARCH_TTL_DAYS = 30;

// GET /api/searches — "Sökes just nu", köpare betalar aldrig för detta.
// Stöder enkla filter: typ, maxbudget och plats — hålls medvetet enkelt.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const budgetMax = Number(url.searchParams.get("budgetMax"));
  const location = url.searchParams.get("location")?.trim();
  const limit = Math.min(50, Number(url.searchParams.get("limit")) || 20);

  const where: Prisma.SearchWhereInput = {
    status: "ACTIVE",
    expiresAt: { gt: new Date() },
    ...(type === "PRODUCT" || type === "SERVICE" ? { type } : {}),
    ...(Number.isFinite(budgetMax) && budgetMax > 0 ? { budgetMax: { lte: budgetMax } } : {}),
    ...(location ? { location: { contains: location, mode: "insensitive" } } : {}),
  };

  const searches = await prisma.search.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      images: { orderBy: { order: "asc" }, take: 1 },
      user: { select: { id: true, name: true, avatarUrl: true, emailVerifiedAt: true } },
      _count: { select: { offers: true } },
    },
  });

  return jsonOk({
    searches: searches.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      type: s.type,
      budgetMax: s.budgetMax,
      location: s.location,
      image: s.images[0]?.url ?? null,
      offerCount: s._count.offers,
      createdAt: s.createdAt,
      user: {
        id: s.user.id,
        name: s.user.name,
        avatarUrl: s.user.avatarUrl,
        verified: Boolean(s.user.emailVerifiedAt),
      },
    })),
  });
}

// POST /api/searches — köparen beskriver vad den söker, gratis, ingen roll att välja.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);
  if (!user.emailVerifiedAt) return jsonError("Bekräfta din e-postadress innan du kan skapa en sökning.", 403);

  const { allowed } = rateLimit(clientKeyFromRequest(req, `create-search:${user.id}`), 20, 60 * 60 * 1000);
  if (!allowed) return jsonError("För många sökningar skapade. Försök igen senare.", 429);

  const body = await req.json().catch(() => null);
  const parsed = createSearchSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata", 400);
  const { text, images } = parsed.data;

  const req_ = parseSearchText(text);

  const search = await prisma.search.create({
    data: {
      userId: user.id,
      title: text.slice(0, 120),
      description: text,
      type: req_.itemType,
      brand: null,
      model: null,
      condition: req_.condition,
      budgetMin: req_.budgetMin,
      budgetMax: req_.budgetMax,
      location: req_.location ?? "Okänd plats",
      requirements: req_,
      expiresAt: new Date(Date.now() + SEARCH_TTL_DAYS * 24 * 60 * 60 * 1000),
      images: { create: images.map((url, order) => ({ url, order })) },
    },
    include: { images: true },
  });

  // Proaktiv matchning: notifiera säljare som redan har något som matchar,
  // så de inte behöver hitta sökningen själva genom att bläddra.
  const notifiedSellers = await notifyMatchingSellersForSearch(search);

  return jsonOk({ search, notifiedSellers }, 201);
}
