-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "accountAmount" DOUBLE PRECISION,
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "cashAmount" DOUBLE PRECISION,
ADD COLUMN     "journalEntryId" TEXT,
ADD COLUMN     "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "accountAmount" DOUBLE PRECISION,
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "cashAmount" DOUBLE PRECISION,
ADD COLUMN     "journalEntryId" TEXT,
ADD COLUMN     "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "SecondhandRecord" ADD COLUMN     "accountAmount" DOUBLE PRECISION,
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "cashAmount" DOUBLE PRECISION,
ADD COLUMN     "journalEntryId" TEXT,
ADD COLUMN     "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "SupplierPayment" ADD COLUMN     "accountAmount" DOUBLE PRECISION,
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "cashAmount" DOUBLE PRECISION,
ADD COLUMN     "journalEntryId" TEXT;

-- CreateTable
CREATE TABLE "SaleInstallment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "cashAmount" DOUBLE PRECISION,
    "accountId" TEXT,
    "accountAmount" DOUBLE PRECISION,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleInstallment_journalEntryId_key" ON "SaleInstallment"("journalEntryId");

-- CreateIndex
CREATE INDEX "SaleInstallment_saleId_idx" ON "SaleInstallment"("saleId");

-- CreateIndex
CREATE INDEX "SaleInstallment_status_dueDate_idx" ON "SaleInstallment"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_journalEntryId_key" ON "Purchase"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_journalEntryId_key" ON "Sale"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "SecondhandRecord_journalEntryId_key" ON "SecondhandRecord"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_journalEntryId_key" ON "SupplierPayment"("journalEntryId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInstallment" ADD CONSTRAINT "SaleInstallment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInstallment" ADD CONSTRAINT "SaleInstallment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInstallment" ADD CONSTRAINT "SaleInstallment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecondhandRecord" ADD CONSTRAINT "SecondhandRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecondhandRecord" ADD CONSTRAINT "SecondhandRecord_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: give every existing unpaid installment sale a single
-- SaleInstallment row (#1 of 1, full amount, existing due date) so old and
-- new installment sales are queried identically going forward. Already-paid
-- sales are left alone — nothing is due, so there's nothing to backfill.
INSERT INTO "SaleInstallment" ("id", "saleId", "installmentNumber", "amount", "dueDate", "status", "createdAt")
SELECT gen_random_uuid()::text, "id", 1, "totalAmount", "installmentDueDate", 'PENDING', now()
FROM "Sale"
WHERE "paymentType" = 'INSTALLMENT'
  AND "installmentPaid" = false
  AND "installmentDueDate" IS NOT NULL;
