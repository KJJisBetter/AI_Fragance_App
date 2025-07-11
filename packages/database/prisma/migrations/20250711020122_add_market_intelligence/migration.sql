/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `fragrances` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "fragrances" ADD COLUMN     "dataQuality" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "dataSource" TEXT DEFAULT 'manual',
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "hasConcentrationInName" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasRedundantName" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasYearInName" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isApiOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketPriority" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "perfumeroPid" TEXT,
ADD COLUMN     "populatedAt" TIMESTAMP(3),
ADD COLUMN     "promotedAt" TIMESTAMP(3),
ADD COLUMN     "promotionReason" TEXT,
ADD COLUMN     "targetDemographic" TEXT,
ADD COLUMN     "trending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viralScore" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "archived_fragrances" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "year" INTEGER,
    "concentration" TEXT,
    "topNotes" TEXT[],
    "middleNotes" TEXT[],
    "baseNotes" TEXT[],
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "recoverable" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "archived_fragrances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_collections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "archived_fragrances_originalId_idx" ON "archived_fragrances"("originalId");

-- CreateIndex
CREATE INDEX "archived_fragrances_name_idx" ON "archived_fragrances"("name");

-- CreateIndex
CREATE INDEX "archived_fragrances_brand_idx" ON "archived_fragrances"("brand");

-- CreateIndex
CREATE INDEX "archived_fragrances_archivedAt_idx" ON "archived_fragrances"("archivedAt");

-- CreateIndex
CREATE INDEX "archived_fragrances_reason_idx" ON "archived_fragrances"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_fragranceId_key" ON "reviews"("userId", "fragranceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_collections_userId_fragranceId_type_key" ON "user_collections"("userId", "fragranceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "fragrances_externalId_key" ON "fragrances"("externalId");

-- CreateIndex
CREATE INDEX "fragrances_marketPriority_idx" ON "fragrances"("marketPriority" DESC);

-- CreateIndex
CREATE INDEX "fragrances_trending_idx" ON "fragrances"("trending");

-- CreateIndex
CREATE INDEX "fragrances_targetDemographic_idx" ON "fragrances"("targetDemographic");

-- CreateIndex
CREATE INDEX "fragrances_dataSource_idx" ON "fragrances"("dataSource");

-- CreateIndex
CREATE INDEX "fragrances_externalId_idx" ON "fragrances"("externalId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "fragrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_collections" ADD CONSTRAINT "user_collections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_collections" ADD CONSTRAINT "user_collections_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "fragrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
