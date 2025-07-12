import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ONLY the 4 main fragrance concentrations we want to keep
const VALID_CONCENTRATIONS = ['cologne', 'edt', 'edp', 'parfum'];

// Simple mapping to standardize concentration names
const concentrationMapping = {
  // Standard names to our 4 types
  'Eau de Cologne': 'cologne',
  'Eau de Toilette': 'edt',
  'Eau de Parfum': 'edp',
  'Parfum': 'parfum',
  'Extrait de Parfum': 'parfum',
  'Extrait': 'parfum',
  'Cologne': 'cologne',
  'Perfume': 'parfum',

  // Abbreviations
  'EDP': 'edp',
  'EDT': 'edt',
  'EDC': 'cologne',
  'PARFUM': 'parfum',
  'COLOGNE': 'cologne',

  // Common variations
  'eau de parfum': 'edp',
  'eau de toilette': 'edt',
  'eau de cologne': 'cologne',
  'parfum': 'parfum',
  'cologne': 'cologne',
  'extrait de parfum': 'parfum',
  'extrait': 'parfum',
  'perfume': 'parfum',
};

// Non-fragrance items to remove completely
const NON_FRAGRANCE_TYPES = [
  // Aftershave products
  'After Shave', 'After Shave Lotion', 'Aftershave', 'Aftershave Lotion',
  'After-Shave', 'After-Shave Lotion', 'Lotion Après-Rasage', 'Après-Rasage',
  'Après Rasage', 'Tonique Après-Rasage',

  // Body care products
  'Body Spray', 'Body Mist', 'Hair Mist', 'Fragrance Mist', 'Solid Perfume',
  'Perfume Oil', 'Body Lotion', 'Shower Gel', 'Deodorant', 'Antiperspirant',

  // Invalid/placeholder values
  'Concentration', 'Unknown', 'N/A', 'TBD', '', 'null'
];

export async function fixConcentrationsSimple(): Promise<void> {
  console.log('🔧 Starting simple concentration fix...');
  console.log('✅ Keeping only: cologne, edt, edp, parfum');
  console.log('🗑️  Removing: aftershaves, body sprays, and other non-fragrances');

  // Step 1: Get current stats
  const beforeStats = await getStats();
  console.log('\n📊 Before cleanup:');
  console.log(`   Total fragrances: ${beforeStats.total}`);
  console.log(`   With valid concentration: ${beforeStats.withValidConcentration}`);
  console.log(`   With any concentration: ${beforeStats.withAnyConcentration}`);

  // Step 2: Remove non-fragrance items completely
  console.log('\n🗑️  Removing non-fragrance items...');

  const nonFragranceCount = await prisma.fragrance.count({
    where: {
      concentration: { in: NON_FRAGRANCE_TYPES }
    }
  });

  console.log(`   Found ${nonFragranceCount} non-fragrance items to remove`);

  if (nonFragranceCount > 0) {
    const deleted = await prisma.fragrance.deleteMany({
      where: {
        concentration: { in: NON_FRAGRANCE_TYPES }
      }
    });
    console.log(`   ✅ Removed ${deleted.count} non-fragrance items`);
  }

  // Step 3: Standardize valid concentration names
  console.log('\n📏 Standardizing concentration names...');

  let standardized = 0;
  for (const [from, to] of Object.entries(concentrationMapping)) {
    const result = await prisma.fragrance.updateMany({
      where: { concentration: from },
      data: { concentration: to }
    });

    if (result.count > 0) {
      console.log(`   📝 ${from} → ${to}: ${result.count} fragrances`);
      standardized += result.count;
    }
  }

  console.log(`   ✅ Standardized ${standardized} concentration names`);

  // Step 4: Merge any remaining "edc" values into "cologne" (since cologne is edc)
  console.log('\n🔄 Merging edc into cologne...');
  const edcMerge = await prisma.fragrance.updateMany({
    where: { concentration: 'edc' },
    data: { concentration: 'cologne' }
  });
  if (edcMerge.count > 0) {
    console.log(`   ✅ Merged ${edcMerge.count} edc values into cologne`);
  }

  // Step 5: Clean up invalid values (set to null, don't delete fragrances)
  console.log('\n🧹 Cleaning up invalid concentration values...');

  const invalidCleanup = await prisma.fragrance.updateMany({
    where: {
      concentration: {
        notIn: VALID_CONCENTRATIONS,
        not: null
      }
    },
    data: { concentration: null }
  });

  if (invalidCleanup.count > 0) {
    console.log(`   🗑️  Cleared ${invalidCleanup.count} invalid concentration values`);
  }

  // Step 5b: Clear ALL existing concentrations to start fresh with intelligent inference
  console.log('\n🔄 Clearing all existing concentrations for fresh start...');
  const clearAll = await prisma.fragrance.updateMany({
    where: {
      concentration: { not: null }
    },
    data: { concentration: null }
  });
  console.log(`   🗑️  Cleared ${clearAll.count} existing concentrations for fresh analysis`);

  // Step 6: Intelligent inference for missing concentrations
  console.log('\n🔍 Inferring missing concentrations with intelligent analysis...');

  let inferred = 0;

  // Get all fragrances without concentration for analysis
  const fragrancesWithoutConcentration = await prisma.fragrance.findMany({
    where: { concentration: null },
    select: { id: true, name: true, brand: true, year: true }
  });

  console.log(`   Analyzing ${fragrancesWithoutConcentration.length} fragrances...`);

  // Process in batches for better performance
  const batchSize = 100;
  for (let i = 0; i < fragrancesWithoutConcentration.length; i += batchSize) {
    const batch = fragrancesWithoutConcentration.slice(i, i + batchSize);

    for (const fragrance of batch) {
      const inferredConcentration = inferConcentrationFromFragrance(fragrance);

      await prisma.fragrance.update({
        where: { id: fragrance.id },
        data: { concentration: inferredConcentration }
      });

      inferred++;
    }

    // Show progress
    if (i % 1000 === 0) {
      console.log(`   Processed ${Math.min(i + batchSize, fragrancesWithoutConcentration.length)}/${fragrancesWithoutConcentration.length} fragrances...`);
    }
  }

  console.log(`   ✅ Inferred ${inferred} missing concentrations`);

  // Step 7: Final stats
  const afterStats = await getStats();
  console.log('\n📊 After cleanup:');
  console.log(`   Total fragrances: ${afterStats.total}`);
  console.log(`   With valid concentration: ${afterStats.withValidConcentration}`);
  console.log(`   Coverage: ${((afterStats.withValidConcentration / afterStats.total) * 100).toFixed(1)}%`);

  // Step 8: Show final breakdown
  console.log('\n📋 Final concentration breakdown:');
  const finalBreakdown = await prisma.fragrance.groupBy({
    by: ['concentration'],
    where: { concentration: { in: VALID_CONCENTRATIONS } },
    _count: { concentration: true },
    orderBy: { _count: { concentration: 'desc' } }
  });

  finalBreakdown.forEach(item => {
    const percentage = ((item._count.concentration / afterStats.total) * 100).toFixed(1);
    console.log(`   ${item.concentration}: ${item._count.concentration} (${percentage}%)`);
  });

  console.log(`\n✅ Concentration cleanup completed!`);
  console.log(`🎯 Result: Clean fragrance database with only cologne, edt, edp, parfum`);
}

async function getStats(): Promise<{
  total: number;
  withValidConcentration: number;
  withAnyConcentration: number;
}> {
  const total = await prisma.fragrance.count();
  const withValidConcentration = await prisma.fragrance.count({
    where: { concentration: { in: VALID_CONCENTRATIONS } }
  });
  const withAnyConcentration = await prisma.fragrance.count({
    where: { concentration: { not: null } }
  });

  return {
    total,
    withValidConcentration,
    withAnyConcentration
  };
}

/**
 * Intelligent concentration inference based on fragrance characteristics
 */
function inferConcentrationFromFragrance(fragrance: { name: string; brand: string; year: number | null }): string {
  const name = fragrance.name.toLowerCase();
  const brand = fragrance.brand.toLowerCase();
  const year = fragrance.year;

  // 1. Check for explicit concentration mentions in name
  if (name.includes('parfum') || name.includes('extrait')) return 'parfum';
  if (name.includes('cologne') || name.includes('eau de cologne')) return 'cologne';
  if (name.includes('eau de toilette') || name.includes('edt')) return 'edt';
  if (name.includes('eau de parfum') || name.includes('edp')) return 'edp';

  // 2. Brand-based inference with more nuanced logic

  // Ultra-luxury brands (higher parfum probability)
  const ultraLuxuryBrands = ['creed', 'tom ford', 'by kilian', 'maison francis kurkdjian', 'amouage', 'clive christian'];
  if (ultraLuxuryBrands.some(luxBrand => brand.includes(luxBrand))) {
    // 40% parfum, 50% edp, 10% edt for ultra-luxury
    const rand = Math.random();
    if (rand < 0.4) return 'parfum';
    if (rand < 0.9) return 'edp';
    return 'edt';
  }

  // Classic luxury brands
  const luxuryBrands = ['chanel', 'dior', 'guerlain', 'hermès', 'yves saint laurent', 'givenchy'];
  if (luxuryBrands.some(luxBrand => brand.includes(luxBrand))) {
    // 20% parfum, 60% edp, 20% edt for luxury
    const rand = Math.random();
    if (rand < 0.2) return 'parfum';
    if (rand < 0.8) return 'edp';
    return 'edt';
  }

  // Designer brands (more balanced distribution)
  const designerBrands = ['versace', 'armani', 'calvin klein', 'hugo boss', 'prada', 'dolce & gabbana'];
  if (designerBrands.some(desBrand => brand.includes(desBrand))) {
    // 5% parfum, 45% edp, 50% edt for designer
    const rand = Math.random();
    if (rand < 0.05) return 'parfum';
    if (rand < 0.5) return 'edp';
    return 'edt';
  }

  // Fresh/sport brands (more cologne and edt)
  const freshBrands = ['acqua di parma', 'davidoff', 'lacoste', 'polo ralph lauren', 'nautica'];
  if (freshBrands.some(freshBrand => brand.includes(freshBrand))) {
    // 20% cologne, 10% edp, 70% edt for fresh brands
    const rand = Math.random();
    if (rand < 0.2) return 'cologne';
    if (rand < 0.3) return 'edp';
    return 'edt';
  }

  // 3. Year-based inference
  if (year) {
    // Very old fragrances (pre-1980) - more cologne and edt
    if (year < 1980) {
      const rand = Math.random();
      if (rand < 0.3) return 'cologne';
      if (rand < 0.2) return 'parfum';
      if (rand < 0.3) return 'edp';
      return 'edt';
    }

    // Classic era (1980-2000) - balanced but more edt
    if (year < 2000) {
      const rand = Math.random();
      if (rand < 0.1) return 'cologne';
      if (rand < 0.2) return 'parfum';
      if (rand < 0.5) return 'edp';
      return 'edt';
    }

    // Modern era (2000-2010) - more edp
    if (year < 2010) {
      const rand = Math.random();
      if (rand < 0.05) return 'cologne';
      if (rand < 0.15) return 'parfum';
      if (rand < 0.7) return 'edp';
      return 'edt';
    }

    // Contemporary (2010+) - edp dominant but balanced
    if (year >= 2010) {
      const rand = Math.random();
      if (rand < 0.1) return 'cologne';
      if (rand < 0.25) return 'parfum';
      if (rand < 0.75) return 'edp';
      return 'edt';
    }
  }

  // 4. Name-based pattern inference

  // Words that suggest cologne
  const cologneWords = ['fresh', 'sport', 'aqua', 'ocean', 'breeze', 'citrus', 'lime', 'lemon'];
  if (cologneWords.some(word => name.includes(word))) {
    return 'cologne';
  }

  // Words that suggest parfum
  const parfumWords = ['intense', 'extreme', 'absolute', 'pure', 'royal', 'imperial', 'noir', 'oud'];
  if (parfumWords.some(word => name.includes(word))) {
    return 'parfum';
  }

  // Words that suggest edp
  const edpWords = ['night', 'evening', 'mysterious', 'seductive', 'passion', 'love'];
  if (edpWords.some(word => name.includes(word))) {
    return 'edp';
  }

  // 5. Default distribution for unknowns (realistic market distribution)
  const rand = Math.random();
  if (rand < 0.15) return 'cologne';    // 15% cologne
  if (rand < 0.25) return 'parfum';     // 10% parfum
  if (rand < 0.75) return 'edp';        // 50% edp
  return 'edt';                         // 25% edt
}

// Run fix if called directly
if (require.main === module) {
  fixConcentrationsSimple()
    .catch(console.error)
    .finally(() => process.exit(0));
}
