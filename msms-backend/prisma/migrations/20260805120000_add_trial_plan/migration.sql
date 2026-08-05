-- AlterTable: support a time-boxed TRIAL plan on Shop
ALTER TABLE "Shop" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
