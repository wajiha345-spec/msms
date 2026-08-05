-- AlterTable: allow a user to reset their password via a one-time emailed code
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "resetOtpHash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetOtpExpiresAt" TIMESTAMP(3);

-- Backfill email for existing users from the order tied to their (now-activated) license key,
-- matched on shop name since that's the only link between LicenseKey and the User created at setup.
UPDATE "User" u
SET "email" = o."customerEmail"
FROM "LicenseKey" lk
JOIN "Order" o ON o.id = lk."orderId"
WHERE lk."shopName" = (SELECT s.name FROM "Shop" s WHERE s.id = u."shopId")
  AND u."email" IS NULL;
