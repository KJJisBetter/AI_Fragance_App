-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fragrances" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "year" INTEGER,
    "concentration" TEXT,
    "topNotes" TEXT[],
    "middleNotes" TEXT[],
    "baseNotes" TEXT[],
    "aiSeasons" TEXT[],
    "aiOccasions" TEXT[],
    "aiMoods" TEXT[],
    "fragranticaSeasons" TEXT[],
    "communityRating" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "longevity" INTEGER,
    "sillage" INTEGER,
    "projection" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fragrances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Collection',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "personalRating" INTEGER,
    "personalNotes" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "bottleSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "BattleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_items" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "winner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "battle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_categor_feedbacks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "aiSuggestion" JSONB NOT NULL,
    "userCorrection" JSONB NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_categor_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "fragrances_name_idx" ON "fragrances"("name");

-- CreateIndex
CREATE INDEX "fragrances_brand_idx" ON "fragrances"("brand");

-- CreateIndex
CREATE INDEX "fragrances_communityRating_idx" ON "fragrances"("communityRating" DESC);

-- CreateIndex
CREATE INDEX "fragrances_aiSeasons_idx" ON "fragrances" USING GIN ("aiSeasons");

-- CreateIndex
CREATE INDEX "fragrances_aiOccasions_idx" ON "fragrances" USING GIN ("aiOccasions");

-- CreateIndex
CREATE INDEX "fragrances_aiMoods_idx" ON "fragrances" USING GIN ("aiMoods");

-- CreateIndex
CREATE INDEX "fragrances_year_idx" ON "fragrances"("year");

-- CreateIndex
CREATE INDEX "fragrances_concentration_idx" ON "fragrances"("concentration");

-- CreateIndex
CREATE INDEX "fragrances_verified_idx" ON "fragrances"("verified");

-- CreateIndex
CREATE INDEX "fragrances_brand_year_idx" ON "fragrances"("brand", "year");

-- CreateIndex
CREATE INDEX "fragrances_createdAt_idx" ON "fragrances"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_collectionId_fragranceId_key" ON "collection_items"("collectionId", "fragranceId");

-- CreateIndex
CREATE UNIQUE INDEX "battle_items_battleId_fragranceId_key" ON "battle_items"("battleId", "fragranceId");

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "fragrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_items" ADD CONSTRAINT "battle_items_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_items" ADD CONSTRAINT "battle_items_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "fragrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_categor_feedbacks" ADD CONSTRAINT "ai_categor_feedbacks_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "fragrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_categor_feedbacks" ADD CONSTRAINT "ai_categor_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
