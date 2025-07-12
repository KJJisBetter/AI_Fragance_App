import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Standard concentration mapping for API compatibility
const concentrationStandardization = {
  // Full names to abbreviations (API compatible)
  'Eau de Parfum': 'edp',
  'Eau de Toilette': 'edt',
  'Eau de Cologne': 'edc',
  'Parfum': 'parfum',
  'Extrait de Parfum': 'parfum',
  'Extrait': 'parfum',
  'Cologne': 'cologne',
  'Perfume': 'parfum',

  // Abbreviations to standardized (lowercase)
  'EDP': 'edp',
  'EDT': 'edt',
  'EDC': 'edc',
  'PARFUM': 'parfum',
  'COLOGNE': 'cologne',

  // Invalid values to remove
  'Concentration': null,
  'Unknown': null,
  '': null,
  'N/A': null,
  'TBD': null,

  // Body care products (mark as non-fragrance)
  'Body Spray': 'body_spray',
  'Body Mist': 'body_mist',
  'Hair Mist': 'hair_mist',
  'Fragrance Mist': 'fragrance_mist',
  'Solid Perfume': 'solid_perfume',
  'Perfume Oil': 'perfume_oil',

  // Aftershave products (mark as non-fragrance)
  'After Shave': 'aftershave',
  'After Shave Lotion': 'aftershave',
  'Aftershave': 'aftershave',
  'Aftershave Lotion': 'aftershave',
  'Lotion Après-Rasage': 'aftershave',
  'Après-Rasage': 'aftershave',
};

export async function recoverConcentrations(): Promise<void> {
  console.log('🔄 Starting concentration data recovery...');

  // Step 1: Get stats before recovery
  const beforeStats = await getConcentrationStats();
  console.log('\n📊 Before recovery:');
  console.log(`   Total fragrances: ${beforeStats.total}`);
  console.log(`   With concentration: ${beforeStats.withConcentration} (${beforeStats.percentage}%)`);

  // Step 2: Recover concentration data from archived fragrances
  console.log('\n🔄 Recovering concentration data from archived fragrances...');

  const archivedWithConcentration = await prisma.archivedFragrance.findMany({
    where: {
      concentration: { not: null },
      reason: 'quality_and_market_purge_2025'
    },
    select: {
      originalId: true,
      name: true,
      brand: true,
      concentration: true
    }
  });

  console.log(`   Found ${archivedWithConcentration.length} archived fragrances with concentration data`);

  let recovered = 0;
  let updated = 0;

  for (const archived of archivedWithConcentration) {
    // Try to find matching fragrance in current database
    const current = await prisma.fragrance.findFirst({
      where: {
        AND: [
          { name: { equals: archived.name, mode: 'insensitive' } },
          { brand: { equals: archived.brand, mode: 'insensitive' } },
          { concentration: { in: [null, '', 'Concentration'] } } // Only update if missing/invalid
        ]
      }
    });

    if (current && archived.concentration) {
      const standardized = concentrationStandardization[archived.concentration] || archived.concentration.toLowerCase();

      if (standardized && standardized !== null) {
        await prisma.fragrance.update({
          where: { id: current.id },
          data: { concentration: standardized }
        });
        recovered++;
      }
    }

    if (recovered % 100 === 0 && recovered > 0) {
      console.log(`   Recovered ${recovered} concentration values...`);
    }
  }

  console.log(`   ✅ Recovered ${recovered} concentration values from archive`);

  // Step 3: Standardize existing concentration values
  console.log('\n📏 Standardizing existing concentration values...');

  for (const [from, to] of Object.entries(concentrationStandardization)) {
    if (to === null) {
      // Remove invalid values
      const result = await prisma.fragrance.updateMany({
        where: { concentration: from },
        data: { concentration: null }
      });
      if (result.count > 0) {
        console.log(`   🗑️  Removed ${result.count} invalid "${from}" values`);
        updated += result.count;
      }
    } else {
      // Standardize valid values
      const result = await prisma.fragrance.updateMany({
        where: { concentration: from },
        data: { concentration: to }
      });
      if (result.count > 0) {
        console.log(`   📝 Standardized ${result.count} "${from}" → "${to}"`);
        updated += result.count;
      }
    }
  }

  console.log(`   ✅ Standardized ${updated} concentration values`);

  // Step 4: Get stats after recovery
  const afterStats = await getConcentrationStats();
  console.log('\n📊 After recovery:');
  console.log(`   Total fragrances: ${afterStats.total}`);
  console.log(`   With concentration: ${afterStats.withConcentration} (${afterStats.percentage}%)`);
  console.log(`   Improvement: +${afterStats.withConcentration - beforeStats.withConcentration} concentrations`);

  // Step 5: Show final breakdown
  console.log('\n📋 Final concentration breakdown:');
  const finalBreakdown = await prisma.fragrance.groupBy({
    by: ['concentration'],
    where: { concentration: { not: null } },
    _count: { concentration: true },
    orderBy: { _count: { concentration: 'desc' } }
  });

  finalBreakdown.forEach(item => {
    console.log(`   ${item.concentration}: ${item._count.concentration}`);
  });

  console.log(`\n✅ Concentration recovery completed!`);
}

async function getConcentrationStats(): Promise<{
  total: number;
  withConcentration: number;
  percentage: string;
}> {
  const total = await prisma.fragrance.count();
  const withConcentration = await prisma.fragrance.count({
    where: {
      concentration: {
        not: null,
        notIn: ['', 'Concentration', 'Unknown', 'N/A']
      }
    }
  });

  return {
    total,
    withConcentration,
    percentage: ((withConcentration / total) * 100).toFixed(1)
  };
}

// Run recovery if called directly
if (require.main === module) {
  recoverConcentrations()
    .catch(console.error)
    .finally(() => process.exit(0));
}
