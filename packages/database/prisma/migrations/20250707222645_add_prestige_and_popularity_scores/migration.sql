-- AlterTable
ALTER TABLE "fragrances" ADD COLUMN     "prestigeScore" DOUBLE PRECISION DEFAULT 0;

-- CreateIndex
CREATE INDEX "fragrances_prestigeScore_idx" ON "fragrances"("prestigeScore" DESC);
