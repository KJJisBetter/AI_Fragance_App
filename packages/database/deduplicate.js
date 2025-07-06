const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deduplicateFragrances() {
  console.log('🔍 Starting fragrance deduplication...');

  try {
    // Find duplicates based on name + brand + year
    const duplicates = await prisma.$queryRaw`
      SELECT name, brand, year, COUNT(*) as count, ARRAY_AGG(id ORDER BY "createdAt" ASC) as ids
      FROM fragrances
      GROUP BY name, brand, year
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    console.log(`Found ${duplicates.length} sets of duplicates`);

    let totalDeleted = 0;

    for (const duplicate of duplicates) {
      const { name, brand, year, count, ids } = duplicate;

      // Keep the first one (oldest), delete the rest
      const idsToDelete = ids.slice(1); // Remove first ID from deletion list

      console.log(`📦 "${name}" by ${brand} (${year}): ${count} copies, deleting ${idsToDelete.length}`);

      // Delete duplicates
      if (idsToDelete.length > 0) {
        await prisma.fragrance.deleteMany({
          where: {
            id: {
              in: idsToDelete
            }
          }
        });
        totalDeleted += idsToDelete.length;
      }
    }

    console.log(`✅ Deduplication complete!`);
    console.log(`   📊 Removed ${totalDeleted} duplicate fragrances`);
    console.log(`   🎯 Kept ${duplicates.length} unique fragrances (oldest copy of each)`);

    // Get final count
    const finalCount = await prisma.fragrance.count();
    console.log(`   🔢 Total fragrances now: ${finalCount.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error during deduplication:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  deduplicateFragrances()
    .then(() => {
      console.log('🎉 Deduplication finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Deduplication failed:', error);
      process.exit(1);
    });
}

module.exports = { deduplicateFragrances };
