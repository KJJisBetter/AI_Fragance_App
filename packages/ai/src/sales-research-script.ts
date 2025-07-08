import dotenv from 'dotenv';
import { PrismaClient } from '@fragrance-battle/database';
import {
  researchFragranceSales,
  researchFragranceSalesBatch,
  analyzeSalesResearch,
  SalesResearchRequest
} from './sales-research';

// Load environment variables from the API app
dotenv.config({ path: '../../apps/api/.env' });

const prisma = new PrismaClient();

// Test fragrances for sales research
const TEST_FRAGRANCES: SalesResearchRequest[] = [
  // Popular mainstream fragrances
  { name: 'Sauvage', brand: 'Dior', year: 2015, concentration: 'Eau de Toilette' },
  { name: 'Eros', brand: 'Versace', year: 2012, concentration: 'Eau de Toilette' },
  { name: 'CK One', brand: 'Calvin Klein', year: 1994, concentration: 'Eau de Toilette' },
  { name: 'One Million', brand: 'Paco Rabanne', year: 2008, concentration: 'Eau de Toilette' },
  { name: 'Acqua di Gio', brand: 'Giorgio Armani', year: 1996, concentration: 'Eau de Toilette' },

  // Celebrity fragrances
  { name: 'Cloud', brand: 'Ariana Grande', year: 2018, concentration: 'Eau de Parfum' },
  { name: 'Fenty Eau de Parfum', brand: 'Rihanna', year: 2021, concentration: 'Eau de Parfum' },

  // Mass market accessible
  { name: 'Into the Night', brand: 'Bath & Body Works', year: 2020, concentration: 'Fragrance Mist' },
  { name: 'Bombshell', brand: 'Victoria\'s Secret', year: 2010, concentration: 'Eau de Parfum' },

  // High-end but accessible
  { name: 'Bleu de Chanel', brand: 'Chanel', year: 2010, concentration: 'Eau de Toilette' },
  { name: 'La Vie Est Belle', brand: 'Lancôme', year: 2012, concentration: 'Eau de Parfum' },

  // Niche comparison
  { name: 'Aventus', brand: 'Creed', year: 2010, concentration: 'Eau de Parfum' },
  { name: 'Tobacco Vanille', brand: 'Tom Ford', year: 2007, concentration: 'Eau de Parfum' }
];

async function testSalesResearch() {
  console.log('🔍 Testing AI Sales Research System');
  console.log('==================================');

  try {
        // Test single fragrance research
    console.log('\n📊 Testing Single Fragrance Research:');
    const testFragrance = TEST_FRAGRANCES[0]; // Dior Sauvage
    if (!testFragrance) {
      throw new Error('No test fragrance available');
    }
    console.log(`Researching: ${testFragrance.name} by ${testFragrance.brand}`);

    const singleResult = await researchFragranceSales(testFragrance);
    const analysis = analyzeSalesResearch(singleResult);

    console.log('\n📈 Sales Research Results:');
    console.log(`Fragrance: ${analysis.fragrance.name} by ${analysis.fragrance.brand}`);
    console.log(`Confidence: ${analysis.confidence}%`);
    console.log('\n🏪 Retail Presence:');
    console.log(`- Available at: ${analysis.analysis.retailPresence.stores.join(', ')}`);
    console.log(`- Mainstream: ${analysis.analysis.retailPresence.mainstream ? 'Yes' : 'No'}`);
    console.log(`- Accessibility: ${analysis.analysis.retailPresence.accessibility}`);

    console.log('\n💰 Pricing:');
    console.log(`- Estimated Price: $${analysis.analysis.pricing.estimatedPrice}`);
    console.log(`- Category: ${analysis.analysis.pricing.category}`);
    console.log(`- Affordability: ${analysis.analysis.pricing.affordability}`);

    console.log('\n📊 Market Performance:');
    console.log(`- Trend: ${analysis.analysis.market.trend}`);
    console.log(`- Demand: ${analysis.analysis.market.demand}`);
    console.log(`- Performance: ${analysis.analysis.market.performance}`);

    console.log('\n🌍 Cultural Impact:');
    console.log(`- Social Buzz: ${analysis.analysis.cultural.socialBuzz}`);
    console.log(`- Viral Status: ${analysis.analysis.cultural.viral ? 'Yes' : 'No'}`);
    console.log(`- Influencer Endorsed: ${analysis.analysis.cultural.influencer ? 'Yes' : 'No'}`);
    console.log(`- Impact Level: ${analysis.analysis.cultural.impact}`);

    console.log('\n🎯 Scores:');
    console.log(`- Retail: ${analysis.scores.retail}/100`);
    console.log(`- Price: ${analysis.scores.price}/100`);
    console.log(`- Market: ${analysis.scores.market}/100`);
    console.log(`- Cultural: ${analysis.scores.cultural}/100`);
    console.log(`- Overall: ${analysis.scores.overall}/100`);
    console.log(`- Enhanced: ${analysis.scores.enhanced}/100`);

    console.log('\n💡 Reasoning:');
    console.log(analysis.reasoning);

  } catch (error) {
    console.error('❌ Error testing sales research:', error);
  }
}

async function runBatchSalesResearch() {
  console.log('\n🚀 Running Batch Sales Research');
  console.log('================================');

  try {
    // Research a smaller subset first
    const testBatch = TEST_FRAGRANCES.slice(0, 5); // First 5 fragrances
    console.log(`\n📦 Researching ${testBatch.length} fragrances:`);
    testBatch.forEach((f, i) => {
      console.log(`${i + 1}. ${f.name} by ${f.brand}`);
    });

    const results = await researchFragranceSalesBatch(testBatch);

    console.log(`\n✅ Research Complete: ${results.length} successful`);

    // Analyze and display results
    console.log('\n📊 SALES RESEARCH SUMMARY:');
    console.log('=========================');

    const analyses = results.map(analyzeSalesResearch);

    // Sort by enhanced popularity score
    analyses.sort((a, b) => b.scores.enhanced - a.scores.enhanced);

    analyses.forEach((analysis, index) => {
      console.log(`\n${index + 1}. ${analysis.fragrance.name} by ${analysis.fragrance.brand}`);
      console.log(`   🎯 Enhanced Score: ${analysis.scores.enhanced}/100`);
      console.log(`   🏪 Retail: ${analysis.scores.retail}/100 (${analysis.analysis.retailPresence.accessibility})`);
      console.log(`   💰 Price: ${analysis.scores.price}/100 (${analysis.analysis.pricing.affordability})`);
      console.log(`   📊 Market: ${analysis.scores.market}/100 (${analysis.analysis.market.performance})`);
      console.log(`   🌍 Cultural: ${analysis.scores.cultural}/100 (${analysis.analysis.cultural.impact})`);
      console.log(`   💡 Confidence: ${analysis.confidence}%`);
    });

    // Compare with current popularity algorithm
    console.log('\n🔄 COMPARISON WITH CURRENT ALGORITHM:');
    console.log('====================================');

    for (const analysis of analyses.slice(0, 3)) { // Top 3
      // Try to find matching fragrance in database
      const dbFragrance = await prisma.fragrance.findFirst({
        where: {
          name: { contains: analysis.fragrance.name, mode: 'insensitive' },
          brand: { contains: analysis.fragrance.brand, mode: 'insensitive' }
        },
        select: {
          name: true,
          brand: true,
          popularityScore: true,
          prestigeScore: true
        }
      });

      console.log(`\n📈 ${analysis.fragrance.name} by ${analysis.fragrance.brand}:`);
      console.log(`   🔍 AI Sales Score: ${analysis.scores.enhanced}/100`);
      if (dbFragrance) {
        console.log(`   🎯 Current Popularity: ${dbFragrance.popularityScore || 'N/A'}`);
        console.log(`   ⭐ Prestige Score: ${dbFragrance.prestigeScore || 'N/A'}`);
      } else {
        console.log(`   ❌ Not found in database`);
      }
    }

  } catch (error) {
    console.error('❌ Error running batch sales research:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🤖 AI SALES RESEARCH SYSTEM');
  console.log('===========================');
  console.log('📊 Gathering real market data to improve popularity algorithm');
  console.log('🎯 Focus: Retail presence, pricing, market trends, cultural impact\n');

  // Test individual research first
  await testSalesResearch();

  // Then run batch research
  await runBatchSalesResearch();

  console.log('\n🎉 Sales research complete!');
  console.log('💡 Use this data to enhance the True Popularity Algorithm');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runSalesResearch };
