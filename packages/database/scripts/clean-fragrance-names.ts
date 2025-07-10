import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CleanupStats {
  totalProcessed: number;
  totalCleaned: number;
  patterns: {
    atelierVersace: number;
    brandWithYear: number;
    brandSuffix: number;
    dashPrefix: number;
    unchanged: number;
  };
  errors: string[];
}

interface BackupRecord {
  id: string;
  originalName: string;
  newName: string;
  pattern: string;
  timestamp: Date;
}

/**
 * Comprehensive fragrance name cleaning utility
 */
class FragranceNameCleaner {
  private stats: CleanupStats;
  private backupRecords: BackupRecord[] = [];
  private logFile: string;

  constructor() {
    this.stats = {
      totalProcessed: 0,
      totalCleaned: 0,
      patterns: {
        atelierVersace: 0,
        brandWithYear: 0,
        brandSuffix: 0,
        dashPrefix: 0,
        unchanged: 0,
      },
      errors: [],
    };

    // Create timestamped log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `../logs/fragrance-cleanup-${timestamp}.log`);

    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Clean fragrance name using pattern matching
   */
  private cleanFragranceName(name: string, brand: string): { cleaned: string; pattern: string } {
    if (!name || !brand) {
      return { cleaned: name || '', pattern: 'unchanged' };
    }

    const originalName = name.trim();
    let cleanedName = originalName;
    let pattern = 'unchanged';

    // Pattern 1: "Atelier [Brand] - [Product] [Brand] [Year]" → "[Product] [Year]"
    if (brand === 'Versace') {
      const atelierPattern = /^Atelier\s+Versace\s*-\s*(.+?)\s+Versace\s+(\d{4})\s*$/i;
      const atelierMatch = cleanedName.match(atelierPattern);
      if (atelierMatch) {
        cleanedName = `${atelierMatch[1].trim()} ${atelierMatch[2]}`;
        pattern = 'atelierVersace';
      } else {
        // Pattern 2: "[Product] Versace [Year]" → "[Product] [Year]"
        const regularPattern = /^(.+?)\s+Versace\s+(\d{4})\s*$/i;
        const regularMatch = cleanedName.match(regularPattern);
        if (regularMatch) {
          cleanedName = `${regularMatch[1].trim()} ${regularMatch[2]}`;
          pattern = 'brandWithYear';
        } else {
          // Pattern 3: "[Product] Versace" → "[Product]"
          const simplePattern = /^(.+?)\s+Versace\s*$/i;
          const simpleMatch = cleanedName.match(simplePattern);
          if (simpleMatch && simpleMatch[1].trim().length > 3) {
            cleanedName = simpleMatch[1].trim();
            pattern = 'brandSuffix';
          }
        }
      }
    }

    // General patterns for any brand
    if (pattern === 'unchanged') {
      const brandEscaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Pattern 4: "Brand - Product" → "Product"
      const dashPattern = new RegExp(`^${brandEscaped}\\s*-\\s*(.+)$`, 'i');
      const dashMatch = cleanedName.match(dashPattern);
      if (dashMatch) {
        cleanedName = dashMatch[1].trim();
        pattern = 'dashPrefix';
      } else {
        // Pattern 5: "Product Brand Year" → "Product Year"
        const trailingBrandYearPattern = new RegExp(`^(.+?)\\s+${brandEscaped}\\s+(\\d{4})\\s*$`, 'i');
        const trailingMatch = cleanedName.match(trailingBrandYearPattern);
        if (trailingMatch && trailingMatch[1].trim().length > 3) {
          cleanedName = `${trailingMatch[1].trim()} ${trailingMatch[2]}`;
          pattern = 'brandWithYear';
        } else {
          // Pattern 6: "Product Brand" → "Product"
          const trailingBrandPattern = new RegExp(`^(.+?)\\s+${brandEscaped}\\s*$`, 'i');
          const simpleBrandMatch = cleanedName.match(trailingBrandPattern);
          if (simpleBrandMatch && simpleBrandMatch[1].trim().length > 3) {
            cleanedName = simpleBrandMatch[1].trim();
            pattern = 'brandSuffix';
          }
        }
      }
    }

    // Clean up extra whitespace
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

    // Safety check - if we accidentally made it too short, keep original
    if (cleanedName.length < 2) {
      cleanedName = originalName;
      pattern = 'unchanged';
    }

    return { cleaned: cleanedName, pattern };
  }

  /**
   * Log message to both console and file
   */
  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;

    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  /**
   * Create backup column and copy original data
   */
  private async createBackup(): Promise<void> {
    this.log('🔄 Creating backup column for original names...');

    try {
      // Add backup column if it doesn't exist
      await prisma.$executeRaw`
        ALTER TABLE fragrances
        ADD COLUMN IF NOT EXISTS name_original TEXT;
      `;

      // Copy current names to backup column (only if backup is empty)
      const result = await prisma.$executeRaw`
        UPDATE fragrances
        SET name_original = name
        WHERE name_original IS NULL;
      `;

      this.log(`✅ Backup created successfully. ${result} records backed up.`);
    } catch (error) {
      this.log(`❌ Failed to create backup: ${error}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Process fragrances in safe batches
   */
  private async processBatch(offset: number, batchSize: number): Promise<void> {
    const fragrances = await prisma.fragrance.findMany({
      select: { id: true, name: true, brand: true },
      skip: offset,
      take: batchSize,
      orderBy: { id: 'asc' },
    });

    if (fragrances.length === 0) {
      return;
    }

    this.log(`📦 Processing batch: ${offset + 1}-${offset + fragrances.length}`);

    for (const fragrance of fragrances) {
      try {
        this.stats.totalProcessed++;

        const { cleaned, pattern } = this.cleanFragranceName(fragrance.name, fragrance.brand);

        if (cleaned !== fragrance.name) {
          // Update the name in database
          await prisma.fragrance.update({
            where: { id: fragrance.id },
            data: { name: cleaned },
          });

          // Track the change
          this.backupRecords.push({
            id: fragrance.id,
            originalName: fragrance.name,
            newName: cleaned,
            pattern,
            timestamp: new Date(),
          });

          this.stats.totalCleaned++;
          this.stats.patterns[pattern as keyof typeof this.stats.patterns]++;

          this.log(
            `🔧 CLEANED: "${fragrance.name}" → "${cleaned}" (${pattern})`,
            'INFO'
          );
        } else {
          this.stats.patterns.unchanged++;
        }
      } catch (error) {
        const errorMsg = `Failed to process fragrance ${fragrance.id}: ${error}`;
        this.stats.errors.push(errorMsg);
        this.log(errorMsg, 'ERROR');
      }
    }
  }

  /**
   * Save detailed backup information to JSON file
   */
  private async saveBackupInfo(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(__dirname, `../backups/fragrance-cleanup-backup-${timestamp}.json`);

    // Ensure backups directory exists
    const backupsDir = path.dirname(backupFile);
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const backupData = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      changes: this.backupRecords,
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    this.log(`💾 Backup information saved to: ${backupFile}`);
  }

  /**
   * Generate rollback script
   */
  private async generateRollbackScript(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rollbackFile = path.join(__dirname, `../scripts/rollback-${timestamp}.sql`);

    let rollbackSQL = `-- Rollback script generated on ${new Date().toISOString()}\n`;
    rollbackSQL += `-- This script will restore original fragrance names\n\n`;

    rollbackSQL += `-- Restore original names from backup column\n`;
    rollbackSQL += `UPDATE fragrances SET name = name_original WHERE name_original IS NOT NULL;\n\n`;

    rollbackSQL += `-- Drop backup column (optional - uncomment if needed)\n`;
    rollbackSQL += `-- ALTER TABLE fragrances DROP COLUMN name_original;\n\n`;

    rollbackSQL += `-- Summary: ${this.stats.totalCleaned} changes will be reverted\n`;

    fs.writeFileSync(rollbackFile, rollbackSQL);
    this.log(`🔄 Rollback script generated: ${rollbackFile}`);
  }

  /**
   * Validate results after cleanup
   */
  private async validateResults(): Promise<void> {
    this.log('🔍 Validating cleanup results...');

    // Check for obvious redundancy patterns that should be gone
    const remaining = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM fragrances
      WHERE (
        name ILIKE '%Atelier Versace -%Versace%' OR
        name ILIKE '%Versace %Versace%' OR
        name ILIKE '% Versace 20__' OR
        name ~ '.+ Versace$'
      )
    `;

    const remainingCount = Number(remaining[0]?.count || 0);

    if (remainingCount > 0) {
      this.log(`⚠️  WARNING: ${remainingCount} fragrances still have potential redundancy patterns`, 'WARN');
    } else {
      this.log('✅ Validation passed: No obvious redundancy patterns detected');
    }

    // Check for suspiciously short names
    const tooShort = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM fragrances
      WHERE LENGTH(TRIM(name)) < 3
    `;

    const shortCount = Number(tooShort[0]?.count || 0);

    if (shortCount > 0) {
      this.log(`⚠️  WARNING: ${shortCount} fragrances have very short names (< 3 chars)`, 'WARN');
    }
  }

  /**
   * Main cleanup execution
   */
  async execute(dryRun: boolean = false, batchSize: number = 100): Promise<CleanupStats> {
    const startTime = Date.now();

    try {
      this.log('🚀 Starting fragrance name cleanup process...');
      this.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE EXECUTION'}`);
      this.log(`Batch size: ${batchSize}`);

      if (!dryRun) {
        // Create backup column
        await this.createBackup();
      }

      // Get total count
      const totalCount = await prisma.fragrance.count();
      this.log(`📊 Total fragrances to process: ${totalCount}`);

      if (dryRun) {
        // For dry run, process a small sample
        const sampleSize = Math.min(50, totalCount);
        const fragrances = await prisma.fragrance.findMany({
          select: { id: true, name: true, brand: true },
          take: sampleSize,
        });

        this.log(`🔍 DRY RUN: Processing sample of ${sampleSize} fragrances...`);

        for (const fragrance of fragrances) {
          const { cleaned, pattern } = this.cleanFragranceName(fragrance.name, fragrance.brand);

          if (cleaned !== fragrance.name) {
            this.stats.totalCleaned++;
            this.stats.patterns[pattern as keyof typeof this.stats.patterns]++;
            this.log(`[DRY RUN] WOULD CLEAN: "${fragrance.name}" → "${cleaned}" (${pattern})`);
          } else {
            this.stats.patterns.unchanged++;
          }

          this.stats.totalProcessed++;
        }
      } else {
        // Live execution - process in batches
        for (let offset = 0; offset < totalCount; offset += batchSize) {
          await this.processBatch(offset, batchSize);

          // Log progress
          if (offset > 0 && offset % (batchSize * 10) === 0) {
            this.log(`📈 Progress: ${offset}/${totalCount} (${((offset / totalCount) * 100).toFixed(1)}%)`);
          }
        }

        // Save backup information
        await this.saveBackupInfo();

        // Generate rollback script
        await this.generateRollbackScript();

        // Validate results
        await this.validateResults();
      }

      const duration = (Date.now() - startTime) / 1000;

      // Final statistics
      this.log('📊 CLEANUP COMPLETE - Final Statistics:');
      this.log(`   Total processed: ${this.stats.totalProcessed}`);
      this.log(`   Total cleaned: ${this.stats.totalCleaned}`);
      this.log(`   Unchanged: ${this.stats.patterns.unchanged}`);
      this.log(`   Pattern breakdown:`);
      this.log(`     - Atelier Versace patterns: ${this.stats.patterns.atelierVersace}`);
      this.log(`     - Brand with year: ${this.stats.patterns.brandWithYear}`);
      this.log(`     - Brand suffix: ${this.stats.patterns.brandSuffix}`);
      this.log(`     - Dash prefix: ${this.stats.patterns.dashPrefix}`);
      this.log(`   Errors: ${this.stats.errors.length}`);
      this.log(`   Duration: ${duration.toFixed(2)} seconds`);

      if (this.stats.errors.length > 0) {
        this.log('❌ Errors encountered:');
        this.stats.errors.forEach(error => this.log(`   - ${error}`, 'ERROR'));
      }

      return this.stats;

    } catch (error) {
      this.log(`💥 FATAL ERROR: ${error}`, 'ERROR');
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

/**
 * Rollback function to restore original names
 */
export async function rollbackCleanup(): Promise<void> {
  const cleaner = new (class extends FragranceNameCleaner {
    async rollback() {
      this.log('🔄 Starting rollback process...');

      try {
        const result = await prisma.$executeRaw`
          UPDATE fragrances
          SET name = name_original
          WHERE name_original IS NOT NULL;
        `;

        this.log(`✅ Rollback completed. ${result} records restored.`);

        // Optionally remove backup column
        // await prisma.$executeRaw`ALTER TABLE fragrances DROP COLUMN name_original;`;

      } catch (error) {
        this.log(`❌ Rollback failed: ${error}`, 'ERROR');
        throw error;
      }
    }
  })();

  await cleaner.rollback();
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const rollback = args.includes('--rollback');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100', 10);

  if (rollback) {
    await rollbackCleanup();
    return;
  }

  const cleaner = new FragranceNameCleaner();
  await cleaner.execute(dryRun, batchSize);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { FragranceNameCleaner };
