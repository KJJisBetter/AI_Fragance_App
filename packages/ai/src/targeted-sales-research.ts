import dotenv from 'dotenv';
import { PrismaClient } from '@fragrance-battle/database';
import {
  researchFragranceSalesBatch,
  analyzeSalesResearch,
  SalesResearchRequest
} from './sales-research';

// Load environment variables from the API app
dotenv.config({ path: '../../apps/api/.env' });

const prisma = new PrismaClient();

// HIGH-VALUE TARGET STRATEGY
// Focus on fragrances that actually impact user experience and discovery

async function getStrategicFragrances(): Promise<SalesResearchRequest[]> {
  console.log('🎯 Identifying high-value fragrances for sales research...');

  // 1. TOP MAINSTREAM BRANDS (users actually search for these)
  const topBrandFragrances = await prisma.fragrance.findMany({
    where: {
      brand: {
        in: [
          'Dior', 'Chanel', 'Calvin Klein', 'Versace', 'Paco Rabanne',
          'Giorgio Armani', 'Hugo Boss', 'Yves Saint Laurent', 'Tom Ford',
          'Ariana Grande', 'Rihanna', 'Bath & Body Works'
        ]
      },
      // Focus on most popular within each brand
      popularityScore: { gte: 12 }
    },
    select: {
      name: true,
      brand: true,
      year: true,
      concentration: true,
      popularityScore: true
    },
    orderBy: { popularityScore: 'desc' },
    take: 40 // Top fragrances from mainstream brands
  });

  // 2. CURRENT TOP PERFORMERS (what our algorithm thinks is popular)
  const currentTopPerformers = await prisma.fragrance.findMany({
    where: {
      popularityScore: { gte: 18 } // Top tier only
    },
    select: {
      name: true,
      brand: true,
      year: true,
      concentration: true,
      popularityScore: true
    },
    orderBy: { popularityScore: 'desc' },
    take: 20
  });

  // 3. ICONIC CLASSICS (cultural significance)
  const iconicClassics = await prisma.fragrance.findMany({
    where: {
      OR: [
        { name: { contains: 'Sauvage', mode: 'insensitive' } },
        { name: { contains: 'Aventus', mode: 'insensitive' } },
        { name: { contains: 'CK One', mode: 'insensitive' } },
        { name: { contains: 'Eros', mode: 'insensitive' } },
        { name: { contains: 'One Million', mode: 'insensitive' } },
        { name: { contains: 'Acqua di Gio', mode: 'insensitive' } },
        { name: { contains: 'Bleu de Chanel', mode: 'insensitive' } },
        { name: { contains: 'La Vie Est Belle', mode: 'insensitive' } },
        { name: { contains: 'Cloud', mode: 'insensitive' } }
      ]
    },
    select: {
      name: true,
      brand: true,
      year: true,
      concentration: true,
      popularityScore: true
    },
    take: 15
  });

  // Combine and deduplicate
  const allFragrances = [...topBrandFragrances, ...currentTopPerformers, ...iconicClassics];
  const uniqueFragrances = allFragrances.filter((fragrance, index, self) =>
    index === self.findIndex(f => f.name === fragrance.name && f.brand === fragrance.brand)
  );

  console.log(`📊 Selected ${uniqueFragrances.length} strategic fragrances:`);
  console.log(`- ${topBrandFragrances.length} from top mainstream brands`);
  console.log(`- ${currentTopPerformers.length} current top performers`);
  console.log(`- ${iconicClassics.length} iconic classics`);

  // Convert to research requests
  return uniqueFragrances.map(f => ({
    name: f.name,
    brand: f.brand,
    year: f.year || undefined,
    concentration: f.concentration || undefined
  }));
}

async function runTargetedSalesResearch() {
  console.log('🎯 TARGETED SALES RESEARCH');
  console.log('==========================');
  console.log('💡 Smart approach: Focus on high-value fragrances that impact user experience');
  console.log('💰 Cost-effective: ~50-75 fragrances instead of 5,384');

  try {
    // Get strategic fragrance list
    const targetFragrances = await getStrategicFragrances();

    console.log(`\n📦 Research Plan:`);
    console.log(`- Fragrances to research: ${targetFragrances.length}`);
    console.log(`- Estimated cost: $${(targetFragrances.length * 0.04).toFixed(2)} (GPT-4)`);
    console.log(`- Estimated time: ${Math.ceil(targetFragrances.length / 2) * 3 / 60} minutes`);
    console.log(`- Coverage: Top brands + current top performers + iconic classics`);

    // Show sample of what we'll research
    console.log(`\n🎯 Sample targets:`);
    targetFragrances.slice(0, 10).forEach((f, i) => {
      console.log(`${i + 1}. ${f.name} by ${f.brand}`);
    });

    if (targetFragrances.length > 10) {
      console.log(`... and ${targetFragrances.length - 10} more`);
    }

    // Ask for confirmation before spending money
    console.log(`\n⚠️  COST CONFIRMATION REQUIRED`);
    console.log(`This will make ${targetFragrances.length} AI API calls using GPT-4`);
    console.log(`Estimated cost: $${(targetFragrances.length * 0.04).toFixed(2)}`);
    console.log(`\nTo proceed, run: npm run targeted-sales-research -- --confirm`);

    // Check if confirmation flag is provided
    const args = process.argv.slice(2);
    const confirmed = args.includes('--confirm');

    if (!confirmed) {
      console.log(`\n🛑 Stopping here to avoid unexpected costs.`);
      console.log(`Add --confirm flag to actually run the research.`);
      return;
    }

    console.log(`\n🚀 Starting targeted sales research...`);

    // Run the research in smaller batches (cost control)
    const batchSize = 10; // Process 10 at a time for better cost control
    const allResults = [];

    for (let i = 0; i < targetFragrances.length; i += batchSize) {
      const batch = targetFragrances.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(targetFragrances.length / batchSize);

      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} fragrances)`);
      console.log(`💰 Batch cost: ~$${(batch.length * 0.04).toFixed(2)}`);

      const batchResults = await researchFragranceSalesBatch(batch);
      allResults.push(...batchResults);

      const totalCost = allResults.length * 0.04;
      console.log(`✅ Batch complete. Running total: ${allResults.length} researched, ~$${totalCost.toFixed(2)} spent`);

      // Safety pause between batches
      if (i + batchSize < targetFragrances.length) {
        console.log('⏳ Pausing before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Analyze results
    console.log(`\n📊 RESEARCH COMPLETE!`);
    console.log(`✅ Successfully researched: ${allResults.length}/${targetFragrances.length} fragrances`);
    console.log(`💰 Total cost: ~$${(allResults.length * 0.04).toFixed(2)}`);

    // Show top performers
    const analyses = allResults.map(analyzeSalesResearch);
    analyses.sort((a, b) => b.scores.enhanced - a.scores.enhanced);

    console.log(`\n🏆 TOP SALES PERFORMERS:`);
    analyses.slice(0, 10).forEach((analysis, index) => {
      console.log(`${index + 1}. ${analysis.fragrance.name} by ${analysis.fragrance.brand}`);
      console.log(`   🎯 Enhanced Score: ${analysis.scores.enhanced}/100`);
      console.log(`   🏪 Retail: ${analysis.scores.retail}/100`);
      console.log(`   💰 Price: ${analysis.scores.price}/100`);
      console.log(`   📊 Market: ${analysis.scores.market}/100`);
      console.log(`   🌍 Cultural: ${analysis.scores.cultural}/100`);
    });

    // Compare with current algorithm
    console.log(`\n🔄 ALGORITHM COMPARISON:`);
    for (const analysis of analyses.slice(0, 5)) {
      const dbFragrance = await prisma.fragrance.findFirst({
        where: {
          name: { contains: analysis.fragrance.name, mode: 'insensitive' },
          brand: { contains: analysis.fragrance.brand, mode: 'insensitive' }
        },
        select: { name: true, brand: true, popularityScore: true, prestigeScore: true }
      });

      console.log(`\n📈 ${analysis.fragrance.name} by ${analysis.fragrance.brand}:`);
      console.log(`   🔍 AI Sales Score: ${analysis.scores.enhanced}/100`);
      console.log(`   🎯 Current Popularity: ${dbFragrance?.popularityScore || 'N/A'}`);
      console.log(`   ⭐ Prestige Score: ${dbFragrance?.prestigeScore || 'N/A'}`);
    }

    console.log(`\n🎉 Targeted sales research complete!`);
    console.log(`💡 This data can now enhance your popularity algorithm with real market insights.`);

  } catch (error) {
    console.error('❌ Error in targeted sales research:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  runTargetedSalesResearch().catch(console.error);
}

export { runTargetedSalesResearch };
