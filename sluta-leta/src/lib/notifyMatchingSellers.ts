import { prisma } from "@/lib/db";
import { scoreMatch, type MatchRequirements, type MatchCandidate } from "@/lib/matching";
import type { Search } from "@prisma/client";

const MATCH_NOTIFY_THRESHOLD = 0.55;

// Köpare → säljare, proaktivt: när en ny sökning publiceras, leta bland
// säljarnas befintliga (aktiva) listings — det de redan lagt in via
// "Hitta köpare" eller motsvarande — och notifiera de vars vara/tjänst
// matchar väl. Säljaren behöver alltså inte själv bläddra i flödet för att
// bli medveten om en ny relevant sökning.
export async function notifyMatchingSellersForSearch(search: Search): Promise<number> {
  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE", type: search.type, userId: { not: search.userId } },
    take: 200,
  });

  if (listings.length === 0) return 0;

  const req: MatchRequirements = {
    itemType: search.type,
    budgetMax: search.budgetMax,
    budgetMin: search.budgetMin,
    location: search.location,
    brand: search.brand,
    model: search.model,
    condition: search.condition,
    keywords: Array.isArray((search.requirements as { keywords?: string[] } | null)?.keywords)
      ? ((search.requirements as { keywords?: string[] }).keywords as string[])
      : [],
  };

  const matchedListings = listings.filter((listing) => {
    const candidate: MatchCandidate = {
      itemType: listing.type,
      price: listing.price,
      location: listing.location,
      brand: listing.brand,
      model: listing.model,
      condition: listing.condition,
      text: `${listing.title} ${listing.description}`,
    };
    const result = scoreMatch(req, candidate);
    return result.passesHardRequirements && result.score >= MATCH_NOTIFY_THRESHOLD;
  });

  if (matchedListings.length === 0) return 0;

  await prisma.notification.createMany({
    data: matchedListings.map((listing) => ({
      userId: listing.userId,
      type: "NEW_MATCH",
      payload: { searchId: search.id, listingId: listing.id, title: search.title },
    })),
  });

  return matchedListings.length;
}
