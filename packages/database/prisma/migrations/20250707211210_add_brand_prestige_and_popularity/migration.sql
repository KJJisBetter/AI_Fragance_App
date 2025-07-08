-- CreateEnum
CREATE TYPE "BrandTier" AS ENUM ('LUXURY', 'HIGH_END_DESIGNER', 'DESIGNER', 'NICHE', 'MASS_MARKET', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PriceRange" AS ENUM ('UNDER_50', 'RANGE_50_150', 'RANGE_150_300', 'RANGE_300_500', 'OVER_500', 'UNKNOWN');

-- AlterTable
ALTER TABLE "fragrances" ADD COLUMN     "popularityScore" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "brand_prestige" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "priceRange" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "researchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_prestige_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_prestige_brand_key" ON "brand_prestige"("brand");

-- CreateIndex
CREATE INDEX "brand_prestige_tier_idx" ON "brand_prestige"("tier");

-- CreateIndex
CREATE INDEX "brand_prestige_brand_idx" ON "brand_prestige"("brand");

-- CreateIndex
CREATE INDEX "fragrances_popularityScore_idx" ON "fragrances"("popularityScore" DESC);
