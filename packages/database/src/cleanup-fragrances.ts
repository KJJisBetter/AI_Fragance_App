import { prisma } from './index';

const cleanupFragrances = async () => {
  console.log('🧹 Starting fragrance database cleanup...');

  // Get initial count
  const initialCount = await prisma.fragrance.count();
  console.log(`📊 Initial count: ${initialCount} fragrances`);

  // Count fragrances to be removed (ONLY those with no notes + invalid data)
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
        { brand: { in: ['', 'N/A', 'TBD', 'Unknown'] } }
      ]
    }
  });

  console.log(`🗑️  Fragrances to remove: ${toRemove}`);
  console.log(`✨ Fragrances to keep: ${initialCount - toRemove}`);

    // Show breakdown by category
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

  // Show info about classics we're keeping
  const totalPre1990 = await prisma.fragrance.count({
    where: { year: { lt: 1990 } }
  });

  const classicsWithoutNotes = await prisma.fragrance.count({
    where: {
      AND: [
        { year: { lt: 1990 } },
        { topNotes: { equals: [] } },
        { middleNotes: { equals: [] } },
        { baseNotes: { equals: [] } }
      ]
    }
  });

  const classicsWithNotes = totalPre1990 - classicsWithoutNotes;

  console.log(`\n📋 Breakdown:`);
  console.log(`   🚫 No notes: ${noNotes}`);
  console.log(`   ❌ Invalid names/brands: ${invalidNames}`);
  console.log(`   ✨ Pre-1990 classics with notes (keeping): ${classicsWithNotes}`);

  // Ask for confirmation
  console.log(`\n⚠️  This will DELETE ${toRemove} fragrances permanently!`);
  console.log(`✅ Final database will have ${initialCount - toRemove} high-quality fragrances`);

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
          { brand: { in: ['', 'N/A', 'TBD', 'Unknown'] } }
        ]
      },
      take: 10,
      select: { name: true, brand: true, year: true, topNotes: true, middleNotes: true, baseNotes: true }
    });

    console.log('\n📋 Examples of fragrances that would be removed:');
    examples.forEach((f, i) => {
      const totalNotes = f.topNotes.length + f.middleNotes.length + f.baseNotes.length;
      console.log(`   ${i+1}. "${f.name}" by ${f.brand} (${f.year || 'No year'}) - Notes: ${totalNotes === 0 ? 'None' : totalNotes + ' notes'}`);
    });

    console.log('\n🎯 To actually perform the cleanup, run: npm run db:cleanup');

  } else {
    console.log('\n🚀 Performing cleanup...');

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
          { brand: { in: ['', 'N/A', 'TBD', 'Unknown'] } }
        ]
      }
    });

    console.log(`✅ Cleanup completed!`);
    console.log(`🗑️  Removed: ${result.count} fragrances`);

    const finalCount = await prisma.fragrance.count();
    console.log(`📊 Final count: ${finalCount} fragrances`);
    console.log(`📈 Improvement: ${((finalCount / initialCount) * 100).toFixed(1)}% data quality`);
  }
};

// CLI runner
if (require.main === module) {
  cleanupFragrances()
    .then(() => {
      console.log('🎉 Fragrance cleanup completed!');
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
