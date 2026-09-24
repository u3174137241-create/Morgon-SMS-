import { prisma } from "@/lib/db";
import { scoreMatch, type MatchRequirements, type MatchCandidate } from "@/lib/matching";
import type { Listing } from "@prisma/client";

// Säljare → köpare: hittar aktiva efterlysningar som matchar ett listing (Hitta köpare).
export async function findMatchingSearchesForListing(listing: Listing, limit = 20) {
  const candidateSearches = await prisma.search.findMany({
    where: { status: "ACTIVE", expiresAt: { gt: new Date() }, type: listing.type },
    include: { user: { select: { id: true, name: true, avatarUrl: true, emailVerifiedAt: true } } },
    take: 200,
  });

  const listingCandidate: MatchCandidate = {
    itemType: listing.type,
    price: listing.price,
    location: listing.location,
    brand: listing.brand,
    model: listing.model,
    condition: listing.condition,
    text: `${listing.title} ${listing.description}`,
  };

  const results = candidateSearches
    .map((search) => {
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
      return { search, result: scoreMatch(req, listingCandidate) };
    })
    .filter((r) => r.result.passesHardRequirements)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, limit);

  return results.map(({ search, result }) => ({
    search: {
      id: search.id,
      title: search.title,
      description: search.description,
      budgetMax: search.budgetMax,
      location: search.location,
      user: search.user,
    },
    score: result.score,
  }));
}
