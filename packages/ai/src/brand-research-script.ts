#!/usr/bin/env node

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { researchBrand, researchBrandsBatch, BrandResearchResponse } from './brand-research';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: '../../apps/api/.env' });

const prisma = new PrismaClient();

interface BrandResearchStats {
  totalBrands: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  startTime: Date;
  endTime?: Date;
  estimatedCost: number;
}

// Estimate OpenAI API cost (approximate)
const estimateCost = (brandCount: number): number => {
  // GPT-3.5-turbo pricing: ~$0.001 per 1K tokens
  // Estimated ~500 tokens per brand research request
  return (brandCount * 500 * 0.001) / 1000;
};

// Save progress to file for crash recovery
const saveProgress = async (stats: BrandResearchStats, results: BrandResearchResponse[]) => {
  const progressFile = path.join(__dirname, '../brand-research-progress.json');
  const progressData = {
    stats,
    results: results.map(r => ({
      ...r,
      processed: true
    }))
  };

  try {
    await fs.promises.writeFile(progressFile, JSON.stringify(progressData, null, 2));
    console.log(`💾 Progress saved to ${progressFile}`);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};

// Load previous progress if exists
const loadProgress = async (): Promise<{ stats?: BrandResearchStats, processedBrands?: Set<string> }> => {
  const progressFile = path.join(__dirname, '../brand-research-progress.json');

  try {
    const data = await fs.promises.readFile(progressFile, 'utf-8');
    const progressData = JSON.parse(data);
    const processedBrands = new Set<string>(progressData.results.map((r: any) => r.brand));

    console.log(`📁 Found previous progress: ${processedBrands.size} brands already processed`);
    return { stats: progressData.stats, processedBrands };
  } catch (error) {
    console.log('📁 No previous progress found, starting fresh');
    return {};
  }
};

// Generate TypeScript lookup file for fast brand tier lookup
const generateBrandLookupFile = async (brandData: BrandResearchResponse[]) => {
  const lookupFile = path.join(__dirname, '../brand-lookup.ts');

  // Create lookup objects
  const tierLookup: Record<string, string> = {};
  const priceRangeLookup: Record<string, string> = {};
  const confidenceLookup: Record<string, number> = {};

  brandData.forEach(brand => {
    tierLookup[brand.brand] = brand.tier;
    priceRangeLookup[brand.brand] = brand.priceRange;
    confidenceLookup[brand.brand] = brand.confidence;
  });

  const fileContent = `// Auto-generated brand lookup file
// Generated on: ${new Date().toISOString()}
// Total brands: ${brandData.length}

export const BRAND_TIER_LOOKUP: Record<string, string> = ${JSON.stringify(tierLookup, null, 2)};

export const BRAND_PRICE_RANGE_LOOKUP: Record<string, string> = ${JSON.stringify(priceRangeLookup, null, 2)};

export const BRAND_CONFIDENCE_LOOKUP: Record<string, number> = ${JSON.stringify(confidenceLookup, null, 2)};

// Helper functions
export const getBrandTier = (brandName: string): string => {
  return BRAND_TIER_LOOKUP[brandName] || 'unknown';
};

export const getBrandPriceRange = (brandName: string): string => {
  return BRAND_PRICE_RANGE_LOOKUP[brandName] || 'unknown';
};

export const getBrandConfidence = (brandName: string): number => {
  return BRAND_CONFIDENCE_LOOKUP[brandName] || 0.1;
};

// Brand tier scoring for popularity algorithm
export const BRAND_TIER_SCORES: Record<string, number> = {
  'luxury': 25,
  'high-end-designer': 20,
  'designer': 15,
  'niche': 18,
  'mass-market': 10,
  'unknown': 5
};

export const getBrandTierScore = (brandName: string): number => {
  const tier = getBrandTier(brandName);
  return BRAND_TIER_SCORES[tier] || 5;
};
`;

  try {
    await fs.promises.writeFile(lookupFile, fileContent);
    console.log(`📝 Generated TypeScript lookup file: ${lookupFile}`);
  } catch (error) {
    console.error('Failed to generate lookup file:', error);
  }
};

// Save brand research results to database
const saveBrandResearchResults = async (results: BrandResearchResponse[]) => {
  console.log(`💾 Saving ${results.length} brand research results to database...`);

  let saved = 0;
  let updated = 0;
  let errors = 0;

  for (const result of results) {
    try {
      await prisma.brandPrestige.upsert({
        where: { brand: result.brand },
        update: {
          tier: result.tier,
          priceRange: result.priceRange,
          confidence: result.confidence,
          reasoning: result.reasoning,
          updatedAt: new Date()
        },
        create: {
          brand: result.brand,
          tier: result.tier,
          priceRange: result.priceRange,
          confidence: result.confidence,
          reasoning: result.reasoning
        }
      });

      // Check if this was an update or create
      const existing = await prisma.brandPrestige.findUnique({
        where: { brand: result.brand }
      });

      if (existing && existing.updatedAt > existing.researchedAt) {
        updated++;
      } else {
        saved++;
      }
    } catch (error) {
      console.error(`Failed to save brand ${result.brand}:`, error);
      errors++;
    }
  }

  console.log(`✅ Database saved: ${saved} new, ${updated} updated, ${errors} errors`);
};

// Main brand research function
const runBrandResearch = async (options: {
  batchSize?: number;
  maxBrands?: number;
  resume?: boolean;
  dryRun?: boolean;
}) => {
  const { batchSize = 50, maxBrands, resume = true, dryRun = false } = options;

  console.log('🚀 Starting Automated Brand Research System');
  console.log('==========================================');

  // Load previous progress if resuming
  const { processedBrands = new Set() } = resume ? await loadProgress() : {};

  // Get all unique brands from database
  console.log('📊 Extracting unique brands from fragrance database...');

  const uniqueBrands = await prisma.fragrance.groupBy({
    by: ['brand'],
    _count: {
      brand: true
    },
    orderBy: {
      _count: {
        brand: 'desc'
      }
    }
  });

  console.log(`📈 Found ${uniqueBrands.length} unique brands in database`);

  // Filter out already processed brands
  const brandsToProcess = uniqueBrands
    .map(b => b.brand)
    .filter(brand => !processedBrands.has(brand))
    .slice(0, maxBrands);

  console.log(`🎯 Brands to process: ${brandsToProcess.length}`);
  console.log(`💰 Estimated cost: $${estimateCost(brandsToProcess.length).toFixed(2)}`);
  console.log(`⏱️  Estimated time: ${Math.ceil(brandsToProcess.length / 5 * 2)} seconds`);

  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No actual API calls will be made');
    console.log('Top 10 brands to be processed:', brandsToProcess.slice(0, 10));
    return;
  }

  // Confirm before starting
  if (brandsToProcess.length > 100) {
    console.log('⚠️  This will process more than 100 brands. Press Ctrl+C to cancel or wait 10 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  const stats: BrandResearchStats = {
    totalBrands: brandsToProcess.length,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    startTime: new Date(),
    estimatedCost: estimateCost(brandsToProcess.length)
  };

  console.log('🔬 Starting brand research...\n');

  const allResults: BrandResearchResponse[] = [];

  // Process brands in batches
  for (let i = 0; i < brandsToProcess.length; i += batchSize) {
    const batch = brandsToProcess.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(brandsToProcess.length / batchSize);

    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} brands)`);
    console.log(`Brands: ${batch.slice(0, 3).join(', ')}${batch.length > 3 ? `... (+${batch.length - 3} more)` : ''}`);

    try {
      const batchResults = await researchBrandsBatch(batch);
      allResults.push(...batchResults);

      stats.processed += batch.length;
      stats.successful += batchResults.filter(r => r.confidence > 0.1).length;
      stats.failed += batch.length - batchResults.length;

      // Save progress after each batch
      await saveProgress(stats, allResults);

      // Save to database after each batch (for crash recovery)
      if (batchResults.length > 0) {
        await saveBrandResearchResults(batchResults);
      }

      // Progress update
      const progress = (stats.processed / stats.totalBrands * 100).toFixed(1);
      console.log(`📈 Progress: ${stats.processed}/${stats.totalBrands} (${progress}%)`);

    } catch (error) {
      console.error(`❌ Batch ${batchNumber} failed:`, error);
      stats.failed += batch.length;
    }
  }

  stats.endTime = new Date();
  const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;

  console.log('\n🎉 Brand Research Complete!');
  console.log('============================');
  console.log(`📊 Total brands: ${stats.totalBrands}`);
  console.log(`✅ Successful: ${stats.successful}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`⏱️  Duration: ${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')}`);
  console.log(`💰 Estimated cost: $${stats.estimatedCost.toFixed(2)}`);

  // Generate lookup file
  if (allResults.length > 0) {
    await generateBrandLookupFile(allResults);
  }

  // Show sample results
  console.log('\n📋 Sample Results:');
  allResults.slice(0, 5).forEach(result => {
    console.log(`  ${result.brand}: ${result.tier} (${result.priceRange}) - ${(result.confidence * 100).toFixed(0)}% confidence`);
  });

  await prisma.$disconnect();

  console.log('\n🚀 Ready for Phase 3: Popularity Algorithm Implementation!');
};

// CLI interface
const main = async () => {
  const args = process.argv.slice(2);
  const options: Parameters<typeof runBrandResearch>[0] = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--batch-size':
        const batchSizeArg = args[++i];
        if (batchSizeArg) options.batchSize = parseInt(batchSizeArg);
        break;
      case '--max-brands':
        const maxBrandsArg = args[++i];
        if (maxBrandsArg) options.maxBrands = parseInt(maxBrandsArg);
        break;
      case '--no-resume':
        options.resume = false;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Usage: node brand-research-script.js [options]

Options:
  --batch-size <number>   Number of brands to process per batch (default: 50)
  --max-brands <number>   Maximum number of brands to process (for testing)
  --no-resume            Start fresh, ignore previous progress
  --dry-run              Show what would be processed without making API calls
  --help                 Show this help message

Examples:
  node brand-research-script.js --dry-run
  node brand-research-script.js --max-brands 100
  node brand-research-script.js --batch-size 25 --max-brands 500
        `);
        process.exit(0);
        break;
    }
  }

  try {
    await runBrandResearch(options);
  } catch (error) {
    console.error('❌ Brand research failed:', error);
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { runBrandResearch };
