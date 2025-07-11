#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// 2025 Market Intelligence Data
const TIER_1_BRANDS = [
  'Dior', 'Chanel', 'Tom Ford', 'Hermès', 'Creed', 'Guerlain', 'Givenchy', 'Yves Saint Laurent', 'Armani'
];

const TIER_2_BRANDS = [
  'Parfums de Marly', 'Maison Francis Kurkdjian', 'Byredo', 'Amouage', 'Montale', 'Mancera', 'Initio', 'Xerjoff'
];

const TIER_3_BRANDS = [
  'Lattafa', 'Al Haramain', 'Afnan', 'Armaf', 'Club de Nuit', 'Rasasi', 'Swiss Arabian'
];

const TIER_4_BRANDS = [
  'Ariana Grande', 'Rihanna', 'Britney Spears', 'Justin Bieber', 'Kim Kardashian', 'Selena Gomez'
];

const VIRAL_FRAGRANCES = [
  'Baccarat Rouge 540', 'Sauvage', 'Aventus', 'La Vie Est Belle', 'Fucking Fabulous', 'Tobacco Vanille',
  'Black Opium', 'Good Girl', 'Libre', 'Alien', 'Hypnotic Poison', 'Flowerbomb', 'Bleu de Chanel',
  'Oud Wood', 'Lost Cherry', 'Br540', 'Lattafa Badee Al Oud', 'Ameer Al Oud', 'Velvet Rose & Oud'
];

function calculateMarketPriority(name: string, brand: string, rating: number, ratingCount: number, year: string): number {
  let priority = 1;

  // Brand tier influence
  if (TIER_1_BRANDS.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
    priority += 4;
  } else if (TIER_2_BRANDS.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
    priority += 3;
  } else if (TIER_3_BRANDS.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
    priority += 2;
  } else if (TIER_4_BRANDS.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
    priority += 1;
  }

  // Viral fragrance bonus
  if (VIRAL_FRAGRANCES.some(vf => name.toLowerCase().includes(vf.toLowerCase()))) {
    priority += 3;
  }

  // Rating influence
  if (rating > 4.0) priority += 2;
  else if (rating > 3.5) priority += 1;

  // Popularity influence
  if (ratingCount > 1000) priority += 2;
  else if (ratingCount > 500) priority += 1;

  // Recent release bonus
  const releaseYear = parseInt(year);
  if (releaseYear >= 2020) priority += 1;

  return Math.min(priority, 10);
}

function determineTargetDemographic(name: string, brand: string, year: string): string {
  const nameL = name.toLowerCase();
  const brandL = brand.toLowerCase();
  const releaseYear = parseInt(year);

  // Gen Z patterns
  if (releaseYear >= 2020 ||
      TIER_4_BRANDS.some(b => brandL.includes(b.toLowerCase())) ||
      nameL.includes('cloud') || nameL.includes('sweet') || nameL.includes('vanilla')) {
    return 'Gen Z';
  }

  // Gen X patterns
  if (releaseYear < 2000 ||
      nameL.includes('classic') || nameL.includes('original') ||
      ['chanel', 'dior', 'guerlain'].some(b => brandL.includes(b))) {
    return 'Gen X';
  }

  // Default to Millennials
  return 'Millennials';
}

function calculateViralScore(name: string, rating: number, ratingCount: number): number {
  let score = 0;

  // Viral fragrance match
  if (VIRAL_FRAGRANCES.some(vf => name.toLowerCase().includes(vf.toLowerCase()))) {
    score += 50;
  }

  // High engagement
  if (ratingCount > 2000) score += 30;
  else if (ratingCount > 1000) score += 20;
  else if (ratingCount > 500) score += 10;

  // High rating
  if (rating > 4.0) score += 20;
  else if (rating > 3.5) score += 10;

  return Math.min(score, 100);
}

function getBrandTier(brand: string): string {
  const brandL = brand.toLowerCase();

  if (TIER_1_BRANDS.some(b => brandL.includes(b.toLowerCase()))) {
    return 'Tier 1';
  } else if (TIER_2_BRANDS.some(b => brandL.includes(b.toLowerCase()))) {
    return 'Tier 2';
  } else if (TIER_3_BRANDS.some(b => brandL.includes(b.toLowerCase()))) {
    return 'Tier 3';
  } else if (TIER_4_BRANDS.some(b => brandL.includes(b.toLowerCase()))) {
    return 'Tier 4';
  }

  return 'Unclassified';
}

async function restoreFromBackup() {
  try {
    logger.info('🔄 Starting database restoration from backup...');

    // Read the cleaned CSV file
    const csvPath = join(process.cwd(), '../../data/fra_cleaned.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ','
    });

    logger.info(`📊 Found ${records.length} fragrances to restore`);

    let processed = 0;
    let successful = 0;
    let errors = 0;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      const fragrancesToInsert = batch.map((record: any) => {
        const rating = parseFloat(record['Rating Value']) || 0;
        const ratingCount = parseInt(record['Rating Count']) || 0;
        const year = record['Release Year'] || 'N/A';

        const marketPriority = calculateMarketPriority(
          record.Name || '',
          record.Brand || '',
          rating,
          ratingCount,
          year
        );

        const targetDemographic = determineTargetDemographic(
          record.Name || '',
          record.Brand || '',
          year
        );

        const viralScore = calculateViralScore(
          record.Name || '',
          rating,
          ratingCount
        );

        const brandTier = getBrandTier(record.Brand || '');

        const isViral = VIRAL_FRAGRANCES.some(vf =>
          (record.Name || '').toLowerCase().includes(vf.toLowerCase())
        );

        return {
          name: record.Name || '',
          brand: record.Brand || '',
          concentration: record.Concentration || null,
          releaseYear: year !== 'N/A' ? parseInt(year) : null,
          perfumer: record.Perfumers || null,
          topNotes: record['Top Notes'] || null,
          middleNotes: record['Middle Notes'] || null,
          baseNotes: record['Base Notes'] || null,
          mainAccords: record['Main Accords'] || null,
          ratingValue: rating > 0 ? rating : null,
          ratingCount: ratingCount > 0 ? ratingCount : null,
          url: record.URL || null,
          externalId: record.URL ? record.URL.split('/').pop() : null,

          // Market Intelligence Fields
          marketPriority,
          trending: isViral,
          targetDemographic,
          viralScore,
          brandTier,
          searchDemand: ratingCount > 0 ? Math.min(ratingCount / 10, 100) : 0,

          // Quality scoring
          prestigeScore: marketPriority * 10,
          popularityScore: ratingCount > 0 ? Math.min(ratingCount / 20, 100) : 0,
          relevanceScore: (rating * 20) + (ratingCount / 50),

          // Metadata
          dataSource: 'backup_restoration',
          lastUpdated: new Date(),
          verified: rating > 0 && ratingCount > 0,
        };
      });

      try {
        await prisma.fragrance.createMany({
          data: fragrancesToInsert,
          skipDuplicates: true
        });

        successful += fragrancesToInsert.length;
        processed += batch.length;

        if (processed % 500 === 0) {
          logger.info(`📈 Progress: ${processed}/${records.length} processed, ${successful} successful`);
        }
      } catch (error) {
        logger.error(`❌ Batch error at position ${i}:`, { error: error instanceof Error ? error.message : String(error) });
        errors += batch.length;
        processed += batch.length;
      }
    }

    // Final stats
    const finalCount = await prisma.fragrance.count();

    logger.info(`🎉 Database restoration completed!`);
    logger.info(`📊 Final Statistics:`);
    logger.info(`- Total processed: ${processed}`);
    logger.info(`- Successfully inserted: ${successful}`);
    logger.info(`- Errors: ${errors}`);
    logger.info(`- Database size: ${finalCount} fragrances`);

    // Market intelligence summary
    const marketStats = await prisma.fragrance.groupBy({
      by: ['brandTier'],
      _count: { brandTier: true }
    });

    logger.info(`📈 Market Coverage:`);
    marketStats.forEach(stat => {
      logger.info(`- ${stat.brandTier}: ${stat._count.brandTier} fragrances`);
    });

    const viralCount = await prisma.fragrance.count({
      where: { trending: true }
    });

    logger.info(`🔥 Viral fragrances: ${viralCount}`);

    logger.info(`✅ Ready for strategic purge and API growth!`);

  } catch (error) {
    logger.error('❌ Restoration failed:', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  restoreFromBackup().catch(console.error);
}

export { restoreFromBackup };
