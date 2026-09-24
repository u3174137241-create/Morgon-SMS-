import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { searchExternalSources } from "@/lib/externalSources";

const CACHE_TTL_MS = 15 * 60 * 1000;

// Söker externa källor (Blocket, Tradera, m.fl.) parallellt. Källor utan
// konfigurerat API-avtal rapporteras som "unavailable" — ingen scraping.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const search = await prisma.search.findUnique({ where: { id } });
  if (!search) return jsonError("Sökningen hittades inte.", 404);

  const cached = await prisma.externalResult.findMany({
    where: { searchId: id, retrievedAt: { gt: new Date(Date.now() - CACHE_TTL_MS) } },
  });
  if (cached.length > 0) {
    return jsonOk({ results: cached, sourceStatus: null, cached: true });
  }

  const keywords = Array.isArray((search.requirements as { keywords?: string[] } | null)?.keywords)
    ? ((search.requirements as { keywords?: string[] }).keywords as string[])
    : [];

  const { results, sourceStatus } = await searchExternalSources({
    keywords,
    budgetMax: search.budgetMax,
    location: search.location,
    itemType: search.type,
  });

  if (results.length > 0) {
    await prisma.externalResult.deleteMany({ where: { searchId: id } });
    await prisma.externalResult.createMany({
      data: results.map((r) => ({ ...r, searchId: id })),
      skipDuplicates: true,
    });
  }

  return jsonOk({ results, sourceStatus, cached: false });
}
