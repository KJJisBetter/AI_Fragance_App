-- AlterTable
ALTER TABLE "fragrances" ADD COLUMN     "lastEnhanced" TIMESTAMP(3),
ADD COLUMN     "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "fragrances_relevanceScore_idx" ON "fragrances"("relevanceScore" DESC);
