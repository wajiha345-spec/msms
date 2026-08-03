-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "customerCnic" TEXT,
ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT 'CASH',
ADD COLUMN     "installmentDueDate" TIMESTAMP(3),
ADD COLUMN     "installmentPaid" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Guarantor" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "name" TEXT,
    "cnic" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guarantor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guarantor_saleId_idx" ON "Guarantor"("saleId");

-- CreateIndex
CREATE INDEX "Sale_paymentType_installmentPaid_installmentDueDate_idx" ON "Sale"("paymentType", "installmentPaid", "installmentDueDate");

-- AddForeignKey
ALTER TABLE "Guarantor" ADD CONSTRAINT "Guarantor_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
