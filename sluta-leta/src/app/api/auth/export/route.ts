import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { NextResponse } from "next/server";

// GDPR-dataexport: allt en användare har skapat, som nedladdningsbar JSON.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const [searches, listings, offers, transactions, reviewsWritten, reviewsReceived, messages] = await Promise.all([
    prisma.search.findMany({ where: { userId: user.id }, include: { images: true } }),
    prisma.listing.findMany({ where: { userId: user.id }, include: { images: true } }),
    prisma.offer.findMany({ where: { sellerId: user.id }, include: { images: true } }),
    prisma.transaction.findMany({ where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] } }),
    prisma.review.findMany({ where: { authorId: user.id } }),
    prisma.review.findMany({ where: { targetId: user.id } }),
    prisma.message.findMany({ where: { senderId: user.id } }),
  ]);

  const exportData = {
    account: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    searches,
    listings,
    offersSent: offers,
    transactions,
    reviewsWritten,
    reviewsReceived,
    messagesSent: messages,
    exportedAt: new Date().toISOString(),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sluta-leta-data-${user.id}.json"`,
    },
  });
}
