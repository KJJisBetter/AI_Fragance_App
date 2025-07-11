/**
 * Execute Strategic Database Purge
 *
 * This script safely archives bad data and keeps only gold standard fragrances
 * based on market intelligence and quality criteria.
 */

import { prisma } from '@fragrance-battle/database';
import { log } from '../utils/logger';
import { identifyHotCacheCandidates } from './identify-hot-cache';

interface PurgeStats {
  kept: number;
  purged: number;
  finalSize: number;
  backupTable: string;
}

export async function createFullBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupTable = `fragrances_backup_${timestamp}`;

  try {
    // Create backup table with all data
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${backupTable}" AS
      SELECT * FROM fragrances;
    `);

    log.info(`💾 Full backup created: ${backupTable}`);

    // Verify backup
    const backupCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
      SELECT COUNT(*) as count FROM "${backupTable}"
    `);

    log.info(`✅ Backup verified: ${backupCount[0].count} fragrances backed up`);

    return backupTable;
  } catch (error) {
    log.error('❌ Backup creation failed:', error);
    throw new Error('Cannot proceed without backup');
  }
}

export async function executePurge(dryRun: boolean = false): Promise<PurgeStats> {
  log.info(`🗑️ Executing strategic database purge${dryRun ? ' (DRY RUN)' : ''} with market intelligence...`);

  // SAFETY FIRST: Create complete backup (skip in dry run)
  let backupTable = 'dry_run_no_backup';
  if (!dryRun) {
    backupTable = await createFullBackup();
  }

  // Get initial count
  const initialCount = await prisma.fragrance.count();
  log.info(`📊 Initial database size: ${initialCount.toLocaleString()} fragrances`);

  // Identify keepers using market priority
  const keeperIds = await identifyHotCacheCandidates();
  log.info(`🏆 Keeping ${keeperIds.length.toLocaleString()} market-prioritized fragrances`);

  // Find everything else to purge
  const toPurge = await prisma.fragrance.findMany({
    where: {
      id: { notIn: keeperIds }
    },
    select: {
      id: true,
      name: true,
      brand: true,
      year: true,
      concentration: true,
      topNotes: true,
      middleNotes: true,
      baseNotes: true,
      communityRating: true,
      popularityScore: true,
      verified: true
    }
  });

  log.info(`🗑️ Identified ${toPurge.length.toLocaleString()} low-quality/low-priority fragrances to purge`);

  if (dryRun) {
    // In dry run, just show what would happen
    log.info('\n📋 DRY RUN - Sample of fragrances that would be purged:');
    toPurge.slice(0, 10).forEach((f, i) => {
      log.info(`  ${i + 1}. ${f.brand} - ${f.name} (${f.year || 'N/A'})`);
    });
    log.info('  ...');

    const stats = {
      kept: keeperIds.length,
      purged: toPurge.length,
      finalSize: keeperIds.length,
      backupTable
    };

    log.info(`\n📊 DRY RUN Summary:`);
    log.info(`- Would keep: ${stats.kept.toLocaleString()} fragrances`);
    log.info(`- Would purge: ${stats.purged.toLocaleString()} fragrances`);
    log.info(`- Final size would be: ${stats.finalSize.toLocaleString()} fragrances`);
    log.info(`- Reduction: ${((stats.purged / initialCount) * 100).toFixed(1)}%`);

    return stats;
  }

  // Archive fragrances before deletion
  log.info('📦 Archiving fragrances before deletion...');

  // Batch archive to avoid memory issues
  const batchSize = 1000;
  let archived = 0;

  for (let i = 0; i < toPurge.length; i += batchSize) {
    const batch = toPurge.slice(i, i + batchSize);

    // Check for redundant naming patterns
    const archiveData = batch.map(f => {
      const hasRedundantName = f.name.toLowerCase().includes(f.brand.toLowerCase());
      const hasYearInName = /\b(19|20)\d{2}\b/.test(f.name);
      const hasConcentrationInName = /\b(EDT|EDP|Parfum|Cologne)\b/i.test(f.name);

      // Determine purge reason
      let reason = 'quality_and_market_purge_2025';
      if (hasRedundantName || hasYearInName || hasConcentrationInName) {
        reason = 'redundant_naming';
      } else if (!f.verified && (!f.communityRating || f.communityRating < 3.0)) {
        reason = 'low_quality';
      } else if (!f.popularityScore || f.popularityScore === 0) {
        reason = 'no_popularity';
      }

      return {
        originalId: f.id,
        name: f.name,
        brand: f.brand,
        year: f.year,
        concentration: f.concentration,
        topNotes: f.topNotes,
        middleNotes: f.middleNotes,
        baseNotes: f.baseNotes,
        archivedAt: new Date(),
        reason,
        recoverable: true,
        metadata: {
          communityRating: f.communityRating,
          popularityScore: f.popularityScore,
          verified: f.verified
        }
      };
    });

    await prisma.archivedFragrance.createMany({
      data: archiveData
    });

    archived += batch.length;
    if (archived % 5000 === 0) {
      log.info(`📦 Archived ${archived.toLocaleString()}/${toPurge.length.toLocaleString()} fragrances...`);
    }
  }

  log.info(`✅ Archived ${archived.toLocaleString()} fragrances`);

  // Execute the purge in batches
  log.info('🗑️ Executing purge...');
  let deleted = 0;

  for (let i = 0; i < toPurge.length; i += batchSize) {
    const batch = toPurge.slice(i, i + batchSize);
    const batchIds = batch.map(f => f.id);

    await prisma.fragrance.deleteMany({
      where: {
        id: { in: batchIds }
      }
    });

    deleted += batch.length;
    if (deleted % 5000 === 0) {
      log.info(`🗑️ Deleted ${deleted.toLocaleString()}/${toPurge.length.toLocaleString()} fragrances...`);
    }
  }

  // Update metadata and quality flags for remaining fragrances
  log.info('📈 Updating quality flags for remaining fragrances...');

  await prisma.$executeRaw`
    UPDATE fragrances
    SET
      "dataQuality" = CASE
        WHEN verified = true AND "communityRating" >= 4.0 THEN 0.9
        WHEN verified = true THEN 0.8
        WHEN "communityRating" >= 4.0 THEN 0.7
        WHEN "marketPriority" >= 0.8 THEN 0.7
        ELSE 0.5
      END,
      "hasRedundantName" = CASE
        WHEN LOWER(name) LIKE '%' || LOWER(brand) || '%' THEN true
        ELSE false
      END,
      "hasYearInName" = CASE
        WHEN name ~ '\b(19|20)\d{2}\b' THEN true
        ELSE false
      END,
      "hasConcentrationInName" = CASE
        WHEN name ~* '\b(EDT|EDP|Parfum|Cologne)\b' THEN true
        ELSE false
      END
    WHERE id = ANY(${keeperIds}::text[])
  `;

  // Get final statistics
  const finalCount = await prisma.fragrance.count();
  const archiveCount = await prisma.archivedFragrance.count();

  const stats = {
    kept: keeperIds.length,
    purged: toPurge.length,
    finalSize: finalCount,
    backupTable
  };

  // Final report
  log.info(`\n✅ Purge complete!`);
  log.info(`📊 Final Statistics:`);
  log.info(`- Initial size: ${initialCount.toLocaleString()} fragrances`);
  log.info(`- Kept: ${stats.kept.toLocaleString()} fragrances`);
  log.info(`- Purged: ${stats.purged.toLocaleString()} fragrances`);
  log.info(`- Final database size: ${stats.finalSize.toLocaleString()} fragrances`);
  log.info(`- Archive size: ${archiveCount.toLocaleString()} fragrances`);
  log.info(`- Backup table: ${backupTable}`);
  log.info(`📈 Quality improvement: ${((stats.kept / initialCount) * 100).toFixed(1)}% data retained`);
  log.info(`📉 Database reduction: ${((stats.purged / initialCount) * 100).toFixed(1)}%`);

  // Market coverage report
  const marketCoverage = await prisma.fragrance.groupBy({
    by: ['targetDemographic'],
    _count: true
  });

  log.info(`\n📊 Market Coverage After Purge:`);
  marketCoverage.forEach(segment => {
    log.info(`- ${segment.targetDemographic || 'unassigned'}: ${segment._count} fragrances`);
  });

  return stats;
}

// Rollback function in case of issues
export async function rollbackPurge(backupTable: string): Promise<void> {
  log.warn(`⚠️ Rolling back purge using backup table: ${backupTable}`);

  try {
    // Clear current fragrances table
    await prisma.fragrance.deleteMany();

    // Restore from backup
    await prisma.$executeRawUnsafe(`
      INSERT INTO fragrances
      SELECT * FROM "${backupTable}";
    `);

    const restoredCount = await prisma.fragrance.count();
    log.info(`✅ Rollback complete! Restored ${restoredCount.toLocaleString()} fragrances`);

  } catch (error) {
    log.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');

  executePurge(dryRun)
    .then(stats => {
      log.info(`\n🎉 Strategic purge ${dryRun ? 'simulation' : 'execution'} completed successfully!`);
      process.exit(0);
    })
    .catch(error => {
      log.error('❌ Strategic purge failed:', error);
      process.exit(1);
    });
}
