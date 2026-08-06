-- CreateTable
CREATE TABLE "ClosingEntry" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "netIncome" DOUBLE PRECISION NOT NULL,
    "equityAccountId" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClosingEntry_shopId_idx" ON "ClosingEntry"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingEntry_journalEntryId_key" ON "ClosingEntry"("journalEntryId");

-- AddForeignKey
ALTER TABLE "ClosingEntry" ADD CONSTRAINT "ClosingEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingEntry" ADD CONSTRAINT "ClosingEntry_equityAccountId_fkey" FOREIGN KEY ("equityAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingEntry" ADD CONSTRAINT "ClosingEntry_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingEntry" ADD CONSTRAINT "ClosingEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
