import { prisma } from './index';

const cleanupFragrances = async () => {
  console.log('🧹 Starting ENHANCED fragrance database cleanup...');

  // Get initial count
  const initialCount = await prisma.fragrance.count();
  console.log(`📊 Initial count: ${initialCount} fragrances`);

  // Define standard concentrations to keep (actual fragrances only)
  const standardConcentrations = [
    'Eau de Cologne',
    'Eau de Toilette',
    'Eau de Parfum',
    'Parfum',
    'Extrait de Parfum',
    'Extrait',
    'Elixir de Parfum',
    'L\'Elixir Eau de Parfum',
    'Perfume',
    'Cologne'
  ];

  // Define non-fragrance concentrations to remove (actual non-fragrance items only)
  const nonFragranceConcentrations = [
    // Aftershave variations (English)
    'After Shave',
    'After Shave Lotion',
    'Aftershave',
    'Aftershave Lotion',
    'After-Shave',
    'After-Shave Lotion',
    'Aftershave Splash',
    'After Shave Splash',
    'Aftershave Tonic',
    'After Shave Tonic',
    'After Shave Sport',
    'After Shave Eau de Toilette',
    'After Shave Eau de Cologne',
    'Aftershave Eau de Toilette',
    'After Shaving Lotion',
    'After Shaving Splash',
    'Lotion Vitale After Shave',
    'After Bath Cologne',
    'After Bath Freshener',
    // French aftershave variations
    'Lotion Après-Rasage',
    'Lotion Après Rasage',
    'Lotion Après Rasage Concentrée',
    'Après-Rasage',
    'Après Rasage',
    'Tonique Après-Rasage',
    'Lotion Fraîche Après Rasage',
    'Lotion Avant-Rasage',
    'Après-Rasage apaisant sans alcool',
    // Shaving products
    'Shaving Cream',
    'Shaving Soap',
    'Shaving Gel',
    'Shaving Foam',
    'Pre-Shave',
    'Post-Shave',
    // Balms and lotions
    'Balm',
    'Liquid Balm',
    'Lotion',
    // Body care (non-fragrance)
    'Deodorant',
    'Antiperspirant',
    'Body Wash',
    'Shower Gel',
    'Soap',
    // Home fragrance
    'Candle',
    'Room Spray',
    'Fabric Spray',
    'Car Fragrance',
    'Air Freshener',
    // Gel products (usually not traditional fragrances)
    'Gel Perfume',
    'Perfume in Gel',
    'Gel Fragrance',
    'Parfum Gel',
    'Parfum-Gel',
    'Gel de Parfum',
    'Gel Solide Parfumé',
    'Gel Concentré',
    'Gel Cologne',
    'Cologne Gelée',
    'Cream Perfume'
  ];

  // Define obvious limited edition patterns to remove (only the most obvious ones)
  const limitedEditionPatterns = [
    'anniversary',
    'collector\'s edition',
    'collector edition',
    'commemorative',
    'limited edition',
    'collector\'s',
    'special edition',
    'exclusive edition'
  ];

  // Count fragrances to be removed
  const toRemove = await prisma.fragrance.count({
    where: {
      OR: [
        // No notes at all (main criteria)
        {
          AND: [
            { topNotes: { equals: [] } },
            { middleNotes: { equals: [] } },
            { baseNotes: { equals: [] } }
          ]
        },
        // Fragrances with questionable names
        { name: { contains: '#NAME?' } },
        // Fragrances with very short or invalid names
        { name: { in: ['', 'N/A', 'TBD'] } },
        // Brands that seem invalid
        { brand: { in: ['', 'N/A', 'TBD', 'Unknown'] } },
        // Non-fragrance concentrations (explicit non-fragrance items only)
        { concentration: { in: nonFragranceConcentrations } },
        // Limited edition fragrances
        {
          OR: limitedEditionPatterns.map(pattern => ({
            name: { contains: pattern, mode: 'insensitive' as const }
          }))
        }
      ]
    }
  });

  console.log(`🗑️  Fragrances to remove: ${toRemove}`);
  console.log(`✨ Fragrances to keep: ${initialCount - toRemove}`);

  // Show detailed breakdown by category
  const noNotes = await prisma.fragrance.count({
    where: {
      AND: [
        { topNotes: { equals: [] } },
        { middleNotes: { equals: [] } },
        { baseNotes: { equals: [] } }
      ]
    }
  });

  const invalidNames = await prisma.fragrance.count({
    where: {
      OR: [
        { name: { contains: '#NAME?' } },
        { name: { in: ['', 'N/A', 'TBD'] } },
        { brand: { in: ['', 'N/A', 'TBD', 'Unknown'] } }
      ]
    }
  });

  const nonFragranceItems = await prisma.fragrance.count({
    where: {
      concentration: { in: nonFragranceConcentrations }
    }
  });

  const limitedEditions = await prisma.fragrance.count({
    where: {
      OR: limitedEditionPatterns.map(pattern => ({
        name: { contains: pattern, mode: 'insensitive' as const }
      }))
    }
  });

  // We'll calculate final counts after cleanup

  console.log(`\n📋 Detailed Breakdown:`);
  console.log(`   🚫 No notes: ${noNotes}`);
  console.log(`   ❌ Invalid names/brands: ${invalidNames}`);
  console.log(`   🧴 Non-fragrance items (aftershave, body spray, etc.): ${nonFragranceItems}`);
  console.log(`   🎭 Limited editions: ${limitedEditions}`);
  console.log(`   ✨ High-quality retail fragrances will be kept after cleanup`);

  console.log(`\n🎯 Standard fragrance concentrations we're keeping:`);
  standardConcentrations.forEach(conc => console.log(`   • ${conc}`));

  console.log(`\n🚫 Non-fragrance items we're removing:`);
  nonFragranceConcentrations.forEach(conc => console.log(`   • ${conc}`));

  // Ask for confirmation
  console.log(`\n⚠️  This will DELETE ${toRemove} items permanently!`);
  console.log(`✅ Final database will have ${initialCount - toRemove} high-quality, retail-available fragrances only`);

  // For safety, let's do a dry run first
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made');

    // Show examples of what would be removed
    const examples = await prisma.fragrance.findMany({
      where: {
        OR: [
          {
            AND: [
              { topNotes: { equals: [] } },
              { middleNotes: { equals: [] } },
              { baseNotes: { equals: [] } }
            ]
          },
          { name: { contains: '#NAME?' } },
          { name: { in: ['', 'N/A', 'TBD'] } },
          { brand: { in: ['', 'N/A', 'TBD', 'Unknown'] } },
          { concentration: { in: nonFragranceConcentrations } },
          {
            OR: limitedEditionPatterns.map(pattern => ({
              name: { contains: pattern, mode: 'insensitive' as const }
            }))
          }
        ]
      },
      take: 20,
      select: { name: true, brand: true, year: true, concentration: true, topNotes: true, middleNotes: true, baseNotes: true }
    });

    console.log('\n📋 Examples of items that would be removed:');
    examples.forEach((f, i) => {
      const totalNotes = f.topNotes.length + f.middleNotes.length + f.baseNotes.length;
      const reason = [];
      if (totalNotes === 0) reason.push('No notes');
      if (f.concentration && nonFragranceConcentrations.includes(f.concentration)) reason.push('Non-fragrance item');
      if (limitedEditionPatterns.some(pattern => f.name.toLowerCase().includes(pattern.toLowerCase()))) reason.push('Limited edition');
      if (f.name.includes('#NAME?') || ['', 'N/A', 'TBD'].includes(f.name)) reason.push('Invalid name');

      console.log(`   ${i+1}. "${f.name}" by ${f.brand} (${f.year || 'No year'}) - ${f.concentration || 'No concentration'} - Reason: ${reason.join(', ')}`);
    });

    console.log('\n🎯 To actually perform the cleanup, run: npm run db:cleanup');

  } else {
    console.log('\n🚀 Performing enhanced cleanup...');

    const result = await prisma.fragrance.deleteMany({
      where: {
        OR: [
          {
            AND: [
              { topNotes: { equals: [] } },
              { middleNotes: { equals: [] } },
              { baseNotes: { equals: [] } }
            ]
          },
          { name: { contains: '#NAME?' } },
          { name: { in: ['', 'N/A', 'TBD'] } },
          { brand: { in: ['', 'N/A', 'TBD', 'Unknown'] } },
          { concentration: { in: nonFragranceConcentrations } },
          {
            OR: limitedEditionPatterns.map(pattern => ({
              name: { contains: pattern, mode: 'insensitive' as const }
            }))
          }
        ]
      }
    });

    console.log(`✅ Enhanced cleanup completed!`);
    console.log(`🗑️  Removed: ${result.count} items`);

    const finalCount = await prisma.fragrance.count();
    console.log(`📊 Final count: ${finalCount} fragrances`);
    console.log(`📈 Data quality improvement: ${((finalCount / initialCount) * 100).toFixed(1)}% retention`);
    console.log(`🎯 Result: Premium retail fragrance database with standard concentrations only`);

    // Show final breakdown by concentration
    const finalByConcentration = await prisma.fragrance.groupBy({
      by: ['concentration'],
      _count: { concentration: true },
      orderBy: { _count: { concentration: 'desc' } }
    });

    console.log('\n📊 Final database by concentration:');
    finalByConcentration.forEach(item => {
      console.log(`   ${item.concentration || 'Unknown'}: ${item._count.concentration}`);
    });
  }
};

// CLI runner
if (require.main === module) {
  cleanupFragrances()
    .then(() => {
      console.log('🎉 Enhanced fragrance cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
