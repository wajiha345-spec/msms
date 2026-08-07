-- CreateTable
CREATE TABLE "LicenseInstallmentPlan" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "installmentAmount" INTEGER NOT NULL,
    "totalInstallments" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseInstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseInstallment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "screenshotUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LicenseInstallmentPlan_shopId_key" ON "LicenseInstallmentPlan"("shopId");

-- CreateIndex
CREATE INDEX "LicenseInstallment_planId_idx" ON "LicenseInstallment"("planId");

-- AddForeignKey
ALTER TABLE "LicenseInstallmentPlan" ADD CONSTRAINT "LicenseInstallmentPlan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseInstallment" ADD CONSTRAINT "LicenseInstallment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LicenseInstallmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
