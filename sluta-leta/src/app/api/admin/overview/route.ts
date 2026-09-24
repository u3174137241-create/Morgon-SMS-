import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return jsonError("Kräver adminbehörighet.", 403);

  const [
    userCount,
    activeSearches,
    totalOffers,
    acceptedOffers,
    completedTransactions,
    activePlusCount,
    paidContactFees,
    openReports,
    transactionsByState,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.search.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
    prisma.offer.count(),
    prisma.offer.count({ where: { status: "ACCEPTED" } }),
    prisma.transaction.count({ where: { state: "COMPLETED" } }),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "CANCEL_AT_PERIOD_END"] } } }),
    prisma.contactFee.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.transaction.groupBy({ by: ["state"], _count: true }),
  ]);

  return jsonOk({
    userCount,
    activeSearches,
    totalOffers,
    acceptedOffers,
    completedTransactions,
    activePlusCount,
    contactFeeRevenueSek: paidContactFees._sum.amount ?? 0,
    contactFeePaidCount: paidContactFees._count,
    openReports,
    transactionsByState,
  });
}
