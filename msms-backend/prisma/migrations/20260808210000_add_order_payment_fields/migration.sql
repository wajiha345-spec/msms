-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "accountAmount" DOUBLE PRECISION,
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "cashAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentType" TEXT;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "accountAmount" DOUBLE PRECISION,
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "cashAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentMethod" TEXT;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
