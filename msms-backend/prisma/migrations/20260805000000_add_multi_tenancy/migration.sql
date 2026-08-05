-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'PRO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- Backfill a single Shop from the existing (single-tenant) data, if any User rows exist
INSERT INTO "Shop" ("id", "name", "plan", "createdAt")
SELECT 'default-shop', "shopName", "plan", CURRENT_TIMESTAMP
FROM "User"
ORDER BY "createdAt" ASC
LIMIT 1;

-- AlterTable: add nullable shopId columns first so existing rows can be backfilled
ALTER TABLE "User" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Product" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "shopId" TEXT;
ALTER TABLE "SecondhandRecord" ADD COLUMN "shopId" TEXT;

-- Backfill existing rows to point at the default shop
UPDATE "User" SET "shopId" = 'default-shop' WHERE "shopId" IS NULL;
UPDATE "Product" SET "shopId" = 'default-shop' WHERE "shopId" IS NULL;
UPDATE "Sale" SET "shopId" = 'default-shop' WHERE "shopId" IS NULL;
UPDATE "Purchase" SET "shopId" = 'default-shop' WHERE "shopId" IS NULL;
UPDATE "SecondhandRecord" SET "shopId" = 'default-shop' WHERE "shopId" IS NULL;

-- Make shopId required now that existing rows are backfilled
ALTER TABLE "User" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Purchase" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "SecondhandRecord" ALTER COLUMN "shopId" SET NOT NULL;

-- Plan and shop name now live on Shop, not User
ALTER TABLE "User" DROP COLUMN "shopName";
ALTER TABLE "User" DROP COLUMN "plan";

-- Invoice numbers only need to be unique per-shop, not globally
DROP INDEX IF EXISTS "Sale_invoiceNo_key";
CREATE UNIQUE INDEX "Sale_shopId_invoiceNo_key" ON "Sale"("shopId", "invoiceNo");

-- CreateIndex
CREATE INDEX "User_shopId_idx" ON "User"("shopId");
CREATE INDEX "Product_shopId_idx" ON "Product"("shopId");
CREATE INDEX "Sale_shopId_idx" ON "Sale"("shopId");
CREATE INDEX "Purchase_shopId_idx" ON "Purchase"("shopId");
CREATE INDEX "SecondhandRecord_shopId_idx" ON "SecondhandRecord"("shopId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecondhandRecord" ADD CONSTRAINT "SecondhandRecord_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
