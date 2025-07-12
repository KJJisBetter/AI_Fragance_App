import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

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
  'Après Rasage': 'aftershave',
};

export async function restoreConcentrationsFromBackup(): Promise<void> {
  console.log('🔄 Starting concentration data restoration from CSV backup...');

  // Step 1: Get stats before restoration
  const beforeStats = await getConcentrationStats();
  console.log('\n📊 Before restoration:');
  console.log(`   Total fragrances: ${beforeStats.total}`);
  console.log(`   With concentration: ${beforeStats.withConcentration} (${beforeStats.percentage}%)`);

  // Step 2: Read the backup CSV file
  console.log('\n📂 Reading backup CSV file...');

  const backupPath = join(__dirname, '../../../backup_fragrances_2025-07-11T22-59-03-535Z.csv');

  try {
    const csvContent = readFileSync(backupPath, 'utf-8');
    console.log(`   ✅ Successfully read backup file: ${backupPath}`);

    const backupRecords = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ','
    });

    console.log(`   📊 Found ${backupRecords.length} fragrances in backup`);

    // Step 3: Process backup records and restore concentrations
    console.log('\n🔄 Restoring concentration data...');

    let processed = 0;
    let restored = 0;
    let skipped = 0;

    for (const backupRecord of backupRecords) {
      processed++;

      // Skip if no concentration data in backup
      if (!backupRecord.concentration ||
          backupRecord.concentration === '' ||
          backupRecord.concentration === 'null') {
        skipped++;
        continue;
      }

      // Find matching fragrance in current database
      const currentFragrance = await prisma.fragrance.findFirst({
        where: {
          AND: [
            { name: { equals: backupRecord.name, mode: 'insensitive' } },
            { brand: { equals: backupRecord.brand, mode: 'insensitive' } },
            {
              OR: [
                { concentration: null },
                { concentration: '' },
                { concentration: 'Concentration' }
              ]
            }
          ]
        }
      });

      if (currentFragrance) {
        // Standardize the concentration value
        const standardizedConcentration = concentrationStandardization[backupRecord.concentration] || backupRecord.concentration.toLowerCase();

        // Only proceed if we have a valid standardized concentration
        if (standardizedConcentration && standardizedConcentration !== 'null') {
          await prisma.fragrance.update({
            where: { id: currentFragrance.id },
            data: { concentration: standardizedConcentration }
          });

          restored++;

          if (restored % 100 === 0) {
            console.log(`   📈 Restored ${restored} concentrations...`);
          }
        }
      }

      if (processed % 1000 === 0) {
        console.log(`   📊 Processed ${processed}/${backupRecords.length} records...`);
      }
    }

    console.log(`   ✅ Processing complete!`);
    console.log(`   📊 Processed: ${processed} records`);
    console.log(`   ✅ Restored: ${restored} concentrations`);
    console.log(`   ⏭️  Skipped: ${skipped} records (no concentration data)`);

  } catch (error) {
    console.error('❌ Error reading backup file:', error);
    throw error;
  }

  // Step 4: Clean up any remaining invalid values
  console.log('\n🧹 Cleaning up invalid concentration values...');

  const invalidCleanup = await prisma.fragrance.updateMany({
    where: {
      concentration: {
        in: ['Concentration', 'Unknown', 'N/A', 'TBD', '']
      }
    },
    data: { concentration: null }
  });

  if (invalidCleanup.count > 0) {
    console.log(`   🗑️  Cleaned up ${invalidCleanup.count} invalid concentration values`);
  }

  // Step 5: Get stats after restoration
  const afterStats = await getConcentrationStats();
  console.log('\n📊 After restoration:');
  console.log(`   Total fragrances: ${afterStats.total}`);
  console.log(`   With concentration: ${afterStats.withConcentration} (${afterStats.percentage}%)`);
  console.log(`   Improvement: +${afterStats.withConcentration - beforeStats.withConcentration} concentrations`);

  // Step 6: Show final breakdown
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

  console.log(`\n✅ Concentration restoration completed!`);
  console.log(`📈 Success rate: ${((afterStats.withConcentration / afterStats.total) * 100).toFixed(1)}%`);
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

// Run restoration if called directly
if (require.main === module) {
  restoreConcentrationsFromBackup()
    .catch(console.error)
    .finally(() => process.exit(0));
}
