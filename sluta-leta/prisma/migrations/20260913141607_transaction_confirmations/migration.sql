-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "buyerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "sellerConfirmedAt" TIMESTAMP(3);
