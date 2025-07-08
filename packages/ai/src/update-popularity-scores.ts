#!/usr/bin/env node

import dotenv from 'dotenv';
import { PrismaClient } from '@fragrance-battle/database';
import { calculatePopularityScoresBatch } from './popularity-algorithm';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: '../../apps/api/.env' });

const prisma = new PrismaClient();

interface PopularityUpdateStats {
  totalFragrances: number;
  processed: number;
  updated: number;
  failed: number;
  startTime: Date;
  endTime?: Date;
}

// Load brand tier lookup if it exists
const loadBrandTierLookup = async (): Promise<Record<string, string> | undefined> => {
  try {
    const lookupFile = path.join(__dirname, '../brand-lookup.ts');

    if (fs.existsSync(lookupFile)) {
      // Dynamic import to load the generated lookup file
      const lookup = await import(lookupFile);
      console.log('📊 Loaded brand tier lookup with', Object.keys(lookup.BRAND_TIER_LOOKUP || {}).length, 'brands');
      return lookup.BRAND_TIER_LOOKUP;
    } else {
      console.log('⚠️  Brand tier lookup not found. Run brand research first for more accurate popularity scores.');
      return undefined;
    }
  } catch (error) {
    console.warn('⚠️  Failed to load brand tier lookup:', error);
    return undefined;
  }
};

// Save progress to file for crash recovery
const saveProgress = async (stats: PopularityUpdateStats) => {
  const progressFile = path.join(__dirname, '../popularity-update-progress.json');

  try {
    await fs.promises.writeFile(progressFile, JSON.stringify(stats, null, 2));
    console.log(`💾 Progress saved to ${progressFile}`);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};

async function updatePopularityScores() {
  console.log('🔥 Starting True Popularity Algorithm update...');
  console.log('📊 This measures mainstream appeal & sales volume, not enthusiast preferences');

  try {
    // Get all fragrances with required fields
    const fragrances = await prisma.fragrance.findMany({
      select: {
        id: true,
        name: true,
        brand: true,
        year: true,
        communityRating: true,
        verified: true,
        popularityScore: true, // To see current scores
        prestigeScore: true    // To compare with prestige
      }
    });

    console.log(`📈 Found ${fragrances.length} fragrances to update`);

    // Calculate new popularity scores using True Popularity Algorithm
    // Convert null to undefined for compatibility with algorithm
    const fragrancesForAlgorithm = fragrances.map(f => ({
      ...f,
      year: f.year ?? undefined,
      communityRating: f.communityRating ?? undefined
    }));

    const updates = calculatePopularityScoresBatch(fragrancesForAlgorithm);

    console.log('\n🎯 Updating fragrances with True Popularity scores...');

    // Update fragrances in batches
    const batchSize = 100;
    let updated = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      await Promise.all(batch.map(async (update) => {
        await prisma.fragrance.update({
          where: { id: update.id },
          data: { popularityScore: update.popularityScore }
        });
      }));

      updated += batch.length;
      console.log(`✅ Updated ${updated}/${updates.length} fragrances`);
    }

    // Show top 10 most popular fragrances by new algorithm
    console.log('\n🔥 TOP 10 MOST POPULAR FRAGRANCES (True Popularity Algorithm):');
    const topPopular = await prisma.fragrance.findMany({
      take: 10,
      orderBy: { popularityScore: 'desc' },
      select: {
        name: true,
        brand: true,
        popularityScore: true,
        prestigeScore: true,
        communityRating: true,
        year: true
      }
    });

    topPopular.forEach((fragrance, index) => {
      console.log(`${index + 1}. ${fragrance.name} by ${fragrance.brand}`);
      console.log(`   🔥 Popularity: ${fragrance.popularityScore} | ⭐ Prestige: ${fragrance.prestigeScore || 'N/A'}`);
      console.log(`   📊 Community: ${fragrance.communityRating || 'N/A'} | 📅 Year: ${fragrance.year || 'Unknown'}`);
    });

    // Show comparison: Most popular vs most prestigious
    console.log('\n📊 POPULARITY vs PRESTIGE COMPARISON:');
    const mostPopular = await prisma.fragrance.findFirst({
      orderBy: { popularityScore: 'desc' },
      select: { name: true, brand: true, popularityScore: true, prestigeScore: true }
    });

    const mostPrestigious = await prisma.fragrance.findFirst({
      orderBy: { prestigeScore: 'desc' },
      select: { name: true, brand: true, popularityScore: true, prestigeScore: true }
    });

    console.log(`🔥 Most Popular: ${mostPopular?.name} by ${mostPopular?.brand} (${mostPopular?.popularityScore})`);
    console.log(`⭐ Most Prestigious: ${mostPrestigious?.name} by ${mostPrestigious?.brand} (${mostPrestigious?.prestigeScore})`);

    // Statistics
    const stats = await prisma.fragrance.aggregate({
      _avg: { popularityScore: true },
      _max: { popularityScore: true },
      _min: { popularityScore: true },
      _count: { popularityScore: true }
    });

    console.log('\n📈 POPULARITY SCORE STATISTICS:');
    console.log(`Average: ${stats._avg.popularityScore?.toFixed(2) || 0}`);
    console.log(`Maximum: ${stats._max.popularityScore || 0}`);
    console.log(`Minimum: ${stats._min.popularityScore || 0}`);
    console.log(`Total updated: ${stats._count.popularityScore || 0}`);

    // Show brand distribution
    console.log('\n🏷️ TOP BRANDS BY AVERAGE POPULARITY:');
    const brandStats = await prisma.fragrance.groupBy({
      by: ['brand'],
      _avg: { popularityScore: true },
      _count: { popularityScore: true },
      having: { popularityScore: { _count: { gte: 5 } } }, // At least 5 fragrances
      orderBy: { _avg: { popularityScore: 'desc' } },
      take: 10
    });

    brandStats.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.brand}: ${brand._avg.popularityScore?.toFixed(2)} (${brand._count.popularityScore} fragrances)`);
    });

    console.log('\n✅ True Popularity Algorithm update completed successfully!');
    console.log('🎯 This algorithm prioritizes mainstream appeal and sales volume over niche prestige.');

  } catch (error) {
    console.error('❌ Error updating popularity scores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updatePopularityScores();
