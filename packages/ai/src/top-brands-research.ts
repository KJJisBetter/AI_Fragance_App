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

// TOP 50 BRANDS FROM MARKET RESEARCH REPORT 2025
// Based on comprehensive market analysis, TikTok trends, and sales data
const TOP_50_BRANDS = [
  // TIER 1: LUXURY DESIGNER BRANDS (Market Leaders)
  'Chanel', 'Dior', 'Tom Ford', 'Gucci', 'Armani', 'Giorgio Armani',
  'Yves Saint Laurent', 'Calvin Klein', 'Versace', 'Burberry', 'Prada',

  // TIER 2: PREMIUM NICHE BRANDS (High Growth, Exclusivity)
  'Maison Francis Kurkdjian', 'Le Labo', 'Byredo', 'Creed', 'Diptyque',
  'Frédéric Malle', 'Amouage', 'Serge Lutens', 'Penhaligon\'s', 'Montale', 'Mancera',

  // TIER 3: EMERGING & VIRAL BRANDS (High Growth Potential)
  'Viktor & Rolf', 'Carolina Herrera', 'Jean Paul Gaultier', 'Narciso Rodriguez',
  'Marc Jacobs', 'Kayali', 'Sol de Janeiro', 'Glossier', 'Ariana Grande', 'Billie Eilish',

  // TIER 4: MASS MARKET & ACCESSIBLE LUXURY
  'Bath & Body Works', 'Zara', 'Victoria\'s Secret', 'Ralph Lauren', 'Hugo Boss',
  'Dolce & Gabbana', 'Paco Rabanne', 'Lancôme', 'Estée Lauder', 'Clinique',

  // TIER 5: NICHE & ARTISANAL (Cult Followings)
  'D.S. & Durga', 'Juliette Has a Gun', 'Imaginary Authors', 'Maison Crivelli',
  'CB I Hate Perfume', 'Escentric Molecules', 'Zoologist Perfumes', 'Tauer Perfumes',
  'Lattafa', 'Memo Paris'
];

interface BrandMatch {
  brand: string;
  fragranceCount: number;
  matchedName: string; // What we found in the database
  avgPopularityScore: number;
  avgPrestigeScore: number;
  topFragrances: string[];
}

async function matchBrandsInDatabase(): Promise<BrandMatch[]> {
  console.log('🔍 Matching market research brands with database...');

  const matchedBrands: BrandMatch[] = [];

  for (const targetBrand of TOP_50_BRANDS) {
    console.log(`🔎 Searching for: ${targetBrand}`);

    // Try exact match first
    let brandStats = await prisma.fragrance.groupBy({
      by: ['brand'],
      where: {
        brand: { equals: targetBrand, mode: 'insensitive' }
      },
      _count: { brand: true },
      _avg: { popularityScore: true, prestigeScore: true }
    });

        // If no exact match, try partial match
    if (brandStats.length === 0) {
      const partialStats = await prisma.fragrance.groupBy({
        by: ['brand'],
        where: {
          brand: { contains: targetBrand, mode: 'insensitive' }
        },
        _count: { brand: true },
        _avg: { popularityScore: true, prestigeScore: true }
      });
      brandStats = partialStats;
    }

    // If still no match, try the other way around (database brand contains target)
    if (brandStats.length === 0) {
      const allBrands = await prisma.fragrance.findMany({
        select: { brand: true },
        distinct: ['brand']
      });

      const potentialMatch = allBrands.find(b =>
        b.brand.toLowerCase().includes(targetBrand.toLowerCase()) ||
        targetBrand.toLowerCase().includes(b.brand.toLowerCase())
      );

      if (potentialMatch) {
        const reverseStats = await prisma.fragrance.groupBy({
          by: ['brand'],
          where: { brand: potentialMatch.brand },
          _count: { brand: true },
          _avg: { popularityScore: true, prestigeScore: true }
        });
        brandStats = reverseStats;
      }
    }

    if (brandStats.length > 0) {
      const stat = brandStats[0];

      if (stat) {
        // Get top fragrances for this brand
        const topFragrances = await prisma.fragrance.findMany({
          where: { brand: stat.brand },
          select: { name: true },
          orderBy: { popularityScore: 'desc' },
          take: 3
        });

        matchedBrands.push({
          brand: targetBrand,
          fragranceCount: stat._count.brand,
          matchedName: stat.brand,
          avgPopularityScore: stat._avg.popularityScore || 0,
          avgPrestigeScore: stat._avg.prestigeScore || 0,
          topFragrances: topFragrances.map(f => f.name)
        });

        console.log(`✅ Found: ${stat.brand} (${stat._count.brand} fragrances)`);
      }
    } else {
      console.log(`❌ Not found: ${targetBrand}`);
    }
  }

  return matchedBrands;
}

async function getFragrancesFromResearchBrands(matchedBrands: BrandMatch[]): Promise<SalesResearchRequest[]> {
  console.log('\n📦 Getting fragrances from market research brands...');

  const brandNames = matchedBrands.map(b => b.matchedName);

  // Get all fragrances from these brands
  const fragrances = await prisma.fragrance.findMany({
    where: {
      brand: { in: brandNames }
    },
    select: {
      name: true,
      brand: true,
      year: true,
      concentration: true,
      popularityScore: true
    },
    orderBy: { popularityScore: 'desc' }
  });

  console.log(`✅ Found ${fragrances.length} fragrances from ${matchedBrands.length} matched brands`);

  // Convert to research requests
  return fragrances.map(f => ({
    name: f.name,
    brand: f.brand,
    year: f.year || undefined,
    concentration: f.concentration || undefined
  }));
}

async function runTop50BrandsResearch() {
  console.log('🎯 TOP 50 BRANDS SALES RESEARCH');
  console.log('===============================');
  console.log('📊 Based on Market Research Report 2025');
  console.log('💡 Strategy: Research fragrances from curated top 50 brands');
  console.log('📈 Includes: TikTok trends, celebrity endorsements, market growth');

  try {
    // Step 1: Match research brands with database
    const matchedBrands = await matchBrandsInDatabase();

    console.log(`\n📊 BRAND MATCHING RESULTS:`);
    console.log(`- Target brands from research: ${TOP_50_BRANDS.length}`);
    console.log(`- Found in database: ${matchedBrands.length}`);
    console.log(`- Missing: ${TOP_50_BRANDS.length - matchedBrands.length}`);

    // Show matched brands
    console.log(`\n✅ MATCHED BRANDS:`);
    matchedBrands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.brand} → ${brand.matchedName} (${brand.fragranceCount} fragrances)`);
    });

    // Step 2: Get fragrances from matched brands
    const targetFragrances = await getFragrancesFromResearchBrands(matchedBrands);

    console.log(`\n📊 RESEARCH PLAN:`);
    console.log(`- Matched brands: ${matchedBrands.length}`);
    console.log(`- Fragrances to research: ${targetFragrances.length}`);
    console.log(`- Estimated cost: $${(targetFragrances.length * 0.000039).toFixed(2)} (GPT-3.5)`);
    console.log(`- Estimated time: ${Math.ceil(targetFragrances.length / 5 * 2 / 60)} minutes`);

    // Show top brands by fragrance count
    console.log(`\n🏆 TOP 10 BRANDS BY FRAGRANCE COUNT:`);
    matchedBrands
      .sort((a, b) => b.fragranceCount - a.fragranceCount)
      .slice(0, 10)
      .forEach((brand, index) => {
        console.log(`${index + 1}. ${brand.matchedName} (${brand.fragranceCount} fragrances)`);
        console.log(`   🎯 Avg Popularity: ${brand.avgPopularityScore.toFixed(1)}`);
        console.log(`   🔝 Top: ${brand.topFragrances.join(', ')}`);
      });

    // Ask for confirmation
    console.log(`\n⚠️  COST CONFIRMATION REQUIRED`);
    console.log(`This will research ${targetFragrances.length} fragrances from market research brands`);
    console.log(`Estimated cost: $${(targetFragrances.length * 0.000039).toFixed(2)}`);
    console.log(`\n🎯 RESEARCH SCOPE:`);
    console.log(`- Tier 1 Luxury: Chanel, Dior, Tom Ford, Gucci, Armani...`);
    console.log(`- Tier 2 Niche: Maison Francis Kurkdjian, Le Labo, Byredo...`);
    console.log(`- Tier 3 Viral: Viktor & Rolf, Ariana Grande, Kayali...`);
    console.log(`- Tier 4 Mass Market: Bath & Body Works, Zara, Victoria's Secret...`);
    console.log(`- Tier 5 Artisanal: D.S. & Durga, Zoologist, Memo Paris...`);
    console.log(`\nTo proceed, run: npm run top-brands-research -- --confirm`);

    // Check if confirmation flag is provided
    const args = process.argv.slice(2);
    const confirmed = args.includes('--confirm');

    if (!confirmed) {
      console.log(`\n🛑 Stopping here to avoid unexpected costs.`);
      console.log(`Add --confirm flag to actually run the research.`);
      return;
    }

    console.log(`\n🚀 Starting market research brands sales research...`);
    console.log(`💡 This will provide AI-powered sales insights for the most important brands!`);

    // Run the research
    const results = await researchFragranceSalesBatch(targetFragrances);

    console.log(`\n📊 RESEARCH COMPLETE!`);
    console.log(`✅ Successfully researched: ${results.length}/${targetFragrances.length} fragrances`);
    console.log(`💰 Total cost: ~$${(results.length * 0.000039).toFixed(2)}`);

    // Analyze results by research tier
    console.log(`\n🏆 TOP PERFORMING BRANDS BY TIER:`);

    const brandPerformance = new Map<string, { scores: number[], avg: number, count: number, tier: string }>();

    // Define tier mapping
    const tierMapping = new Map<string, string>();
    ['Chanel', 'Dior', 'Tom Ford', 'Gucci', 'Armani', 'Giorgio Armani', 'Yves Saint Laurent', 'Calvin Klein', 'Versace', 'Burberry', 'Prada'].forEach(b => tierMapping.set(b, 'Tier 1: Luxury Designer'));
    ['Maison Francis Kurkdjian', 'Le Labo', 'Byredo', 'Creed', 'Diptyque', 'Frédéric Malle', 'Amouage', 'Serge Lutens', 'Penhaligon\'s', 'Montale', 'Mancera'].forEach(b => tierMapping.set(b, 'Tier 2: Premium Niche'));
    ['Viktor & Rolf', 'Carolina Herrera', 'Jean Paul Gaultier', 'Narciso Rodriguez', 'Marc Jacobs', 'Kayali', 'Sol de Janeiro', 'Glossier', 'Ariana Grande', 'Billie Eilish'].forEach(b => tierMapping.set(b, 'Tier 3: Emerging & Viral'));
    ['Bath & Body Works', 'Zara', 'Victoria\'s Secret', 'Ralph Lauren', 'Hugo Boss', 'Dolce & Gabbana', 'Paco Rabanne', 'Lancôme', 'Estée Lauder', 'Clinique'].forEach(b => tierMapping.set(b, 'Tier 4: Mass Market'));
    ['D.S. & Durga', 'Juliette Has a Gun', 'Imaginary Authors', 'Maison Crivelli', 'CB I Hate Perfume', 'Escentric Molecules', 'Zoologist Perfumes', 'Tauer Perfumes', 'Lattafa', 'Memo Paris'].forEach(b => tierMapping.set(b, 'Tier 5: Niche & Artisanal'));

    for (const result of results) {
      const analysis = analyzeSalesResearch(result);
      const brand = result.fragrance.brand;

      // Find tier for this brand
      const tier = Array.from(tierMapping.entries()).find(([targetBrand, _]) =>
        brand.toLowerCase().includes(targetBrand.toLowerCase()) ||
        targetBrand.toLowerCase().includes(brand.toLowerCase())
      )?.[1] || 'Unknown';

      if (!brandPerformance.has(brand)) {
        brandPerformance.set(brand, { scores: [], avg: 0, count: 0, tier });
      }

      const brandData = brandPerformance.get(brand)!;
      brandData.scores.push(analysis.scores.enhanced);
      brandData.count++;
    }

    // Calculate averages
    brandPerformance.forEach((data, brand) => {
      data.avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    });

    // Sort by average score and group by tier
    const sortedBrands = Array.from(brandPerformance.entries())
      .sort((a, b) => b[1].avg - a[1].avg);

    // Group by tier
    const tierGroups = new Map<string, Array<[string, any]>>();
    for (const [brand, data] of sortedBrands) {
      if (!tierGroups.has(data.tier)) {
        tierGroups.set(data.tier, []);
      }
      tierGroups.get(data.tier)!.push([brand, data]);
    }

    // Display results by tier
    for (const [tier, brands] of tierGroups) {
      console.log(`\n🎯 ${tier}:`);
      brands.slice(0, 3).forEach(([brand, data], index) => {
        console.log(`${index + 1}. ${brand}`);
        console.log(`   🎯 Avg AI Sales Score: ${data.avg.toFixed(1)}/100`);
        console.log(`   📦 Fragrances researched: ${data.count}`);
      });
    }

    // Show top individual fragrances
    console.log(`\n🔥 TOP PERFORMING FRAGRANCES (by AI sales scores):`);
    const analyses = results.map(analyzeSalesResearch);
    analyses.sort((a, b) => b.scores.enhanced - a.scores.enhanced);

    analyses.slice(0, 15).forEach((analysis, index) => {
      console.log(`${index + 1}. ${analysis.fragrance.name} by ${analysis.fragrance.brand}`);
      console.log(`   🎯 AI Sales Score: ${analysis.scores.enhanced}/100`);
      console.log(`   🏪 Retail: ${analysis.scores.retail}/100 | 💰 Price: ${analysis.scores.price}/100`);
      console.log(`   📊 Market: ${analysis.scores.market}/100 | 🌍 Cultural: ${analysis.scores.cultural}/100`);
    });

    console.log(`\n🎉 Market research brands sales research complete!`);
    console.log(`💡 This data represents the most important brands in the fragrance market!`);
    console.log(`📈 Perfect for enhancing your popularity algorithm with real market insights!`);

  } catch (error) {
    console.error('❌ Error in market research brands research:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  runTop50BrandsResearch().catch(console.error);
}

export { runTop50BrandsResearch, TOP_50_BRANDS };
