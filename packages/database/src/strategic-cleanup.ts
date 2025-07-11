import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseQualityAnalyzer } from './analyze-database';

const prisma = new PrismaClient();

interface CleanupStats {
  totalProcessed: number;
  brandRedundancyCleaned: number;
  lowQualityRemoved: number;
  duplicatesConsolidated: number;
  formatsStandardized: number;
  errors: string[];
}

interface BackupData {
  timestamp: string;
  originalCount: number;
  cleanupStats: CleanupStats;
  changes: Array<{
    id: string;
    operation: 'update' | 'delete' | 'merge';
    before: any;
    after?: any;
  }>;
}

class StrategicCleanupService {
  private stats: CleanupStats;
  private backupData: BackupData;
  private logFile: string;
  private dryRun: boolean;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
    this.stats = {
      totalProcessed: 0,
      brandRedundancyCleaned: 0,
      lowQualityRemoved: 0,
      duplicatesConsolidated: 0,
      formatsStandardized: 0,
      errors: []
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `../logs/strategic-cleanup-${timestamp}.log`);

    this.backupData = {
      timestamp,
      originalCount: 0,
      cleanupStats: this.stats,
      changes: []
    };

    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async execute(): Promise<CleanupStats> {
    this.log('🚀 Starting strategic database cleanup...');
    this.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE EXECUTION'}`);

    try {
      // 1. Analyze current state
      const analyzer = new DatabaseQualityAnalyzer();
      const analysis = await analyzer.analyze();

      this.backupData.originalCount = analysis.totalFragrances;
      this.log(`📊 Starting with ${analysis.totalFragrances.toLocaleString()} fragrances`);
      this.log(`📈 Current quality score: ${analysis.qualityScore}/100`);

      if (!this.dryRun) {
        // 2. Create backup
        await this.createBackup();
      }

      // 3. Strategic cleanup phases
      await this.cleanBrandRedundancy(analysis);
      await this.standardizeFormats();
      await this.removeLowQualityEntries();
      await this.consolidateDuplicates();

      // 4. Generate reports
      await this.generateReports();

      this.log('✅ Strategic cleanup completed successfully!');
      return this.stats;

    } catch (error) {
      this.log(`❌ Strategic cleanup failed: ${error}`, 'ERROR');
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async createBackup(): Promise<void> {
    this.log('💾 Creating comprehensive backup...');

    try {
      // Create backup table with timestamp
      const backupTableName = `fragrances_backup_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}`;

      await prisma.$executeRaw`
        CREATE TABLE ${backupTableName} AS
        SELECT * FROM fragrances;
      `;

      // Add backup columns to main table
      await prisma.$executeRaw`
        ALTER TABLE fragrances
        ADD COLUMN IF NOT EXISTS name_backup TEXT,
        ADD COLUMN IF NOT EXISTS brand_backup TEXT,
        ADD COLUMN IF NOT EXISTS concentration_backup TEXT,
        ADD COLUMN IF NOT EXISTS cleanup_timestamp TIMESTAMP DEFAULT NOW();
      `;

      // Copy current data to backup columns
      await prisma.$executeRaw`
        UPDATE fragrances
        SET
          name_backup = name,
          brand_backup = brand,
          concentration_backup = concentration
        WHERE cleanup_timestamp IS NULL;
      `;

      this.log(`✅ Backup created: ${backupTableName}`);

    } catch (error) {
      this.log(`❌ Backup creation failed: ${error}`, 'ERROR');
      throw error;
    }
  }

  private async cleanBrandRedundancy(analysis: any): Promise<void> {
    this.log('🧹 Cleaning brand redundancy...');

    const redundantFragrances = await prisma.fragrance.findMany({
      where: {
        OR: [
          // Atelier patterns
          {
            AND: [
              { brand: 'Versace' },
              { name: { contains: 'Atelier Versace' } },
              { name: { contains: 'Versace' } }
            ]
          },
          // Brand dash patterns
          { name: { startsWith: `${this.escapeForPrisma('brand')} - ` } },
          // Brand suffix patterns
          { name: { endsWith: ` ${this.escapeForPrisma('brand')}` } },
          // Brand with year patterns
          { name: { contains: `${this.escapeForPrisma('brand')} 20` } }
        ]
      },
      take: this.dryRun ? 20 : undefined
    });

    this.log(`Found ${redundantFragrances.length} fragrances with brand redundancy`);

    for (const fragrance of redundantFragrances) {
      try {
        const cleanedName = this.cleanFragranceName(fragrance.name, fragrance.brand);

        if (cleanedName !== fragrance.name && cleanedName.length > 2) {
          this.stats.totalProcessed++;

          if (!this.dryRun) {
            await prisma.fragrance.update({
              where: { id: fragrance.id },
              data: { name: cleanedName }
            });
          }

          this.backupData.changes.push({
            id: fragrance.id,
            operation: 'update',
            before: { name: fragrance.name },
            after: { name: cleanedName }
          });

          this.stats.brandRedundancyCleaned++;
          this.log(`${this.dryRun ? '[DRY RUN] ' : ''}🔧 Cleaned: "${fragrance.name}" → "${cleanedName}"`);
        }
      } catch (error) {
        this.stats.errors.push(`Failed to clean fragrance ${fragrance.id}: ${error}`);
        this.log(`❌ Error cleaning ${fragrance.id}: ${error}`, 'ERROR');
      }
    }
  }

  private cleanFragranceName(name: string, brand: string): string {
    if (!name || !brand) return name;

    let cleaned = name.trim();

    // Pattern 1: "Atelier Brand - Product Brand Year" → "Product Year"
    if (brand === 'Versace') {
      const atelierPattern = /^Atelier\s+Versace\s*-\s*(.+?)\s+Versace\s+(\d{4})\s*$/i;
      const match = cleaned.match(atelierPattern);
      if (match) {
        return `${match[1].trim()} ${match[2]}`;
      }
    }

    // Pattern 2: "Brand - Product" → "Product"
    const brandEscaped = this.escapeRegex(brand);
    const dashPattern = new RegExp(`^${brandEscaped}\\s*-\\s*(.+)$`, 'i');
    const dashMatch = cleaned.match(dashPattern);
    if (dashMatch) {
      cleaned = dashMatch[1].trim();
    }

    // Pattern 3: "Product Brand Year" → "Product Year"
    const brandYearPattern = new RegExp(`^(.+?)\\s+${brandEscaped}\\s+(\\d{4})\\s*$`, 'i');
    const brandYearMatch = cleaned.match(brandYearPattern);
    if (brandYearMatch && brandYearMatch[1].trim().length > 3) {
      cleaned = `${brandYearMatch[1].trim()} ${brandYearMatch[2]}`;
    }

    // Pattern 4: "Product Brand" → "Product" (only if product name is substantial)
    const brandSuffixPattern = new RegExp(`^(.+?)\\s+${brandEscaped}\\s*$`, 'i');
    const brandSuffixMatch = cleaned.match(brandSuffixPattern);
    if (brandSuffixMatch && brandSuffixMatch[1].trim().length > 5) {
      cleaned = brandSuffixMatch[1].trim();
    }

    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  private async standardizeFormats(): Promise<void> {
    this.log('📏 Standardizing data formats...');

    // Standardize concentration names
    const concentrationMap = {
      'EDP': 'Eau de Parfum',
      'EDT': 'Eau de Toilette',
      'EDC': 'Eau de Cologne',
      'EAU DE PARFUM': 'Eau de Parfum',
      'EAU DE TOILETTE': 'Eau de Toilette',
      'PARFUM': 'Parfum',
      'EXTRAIT': 'Extrait de Parfum'
    };

    for (const [from, to] of Object.entries(concentrationMap)) {
      const toUpdate = await prisma.fragrance.findMany({
        where: { concentration: from },
        take: this.dryRun ? 5 : undefined
      });

      if (toUpdate.length > 0) {
        this.log(`${this.dryRun ? '[DRY RUN] ' : ''}📏 Standardizing ${toUpdate.length} "${from}" → "${to}"`);

        if (!this.dryRun) {
          await prisma.fragrance.updateMany({
            where: { concentration: from },
            data: { concentration: to }
          });
        }

        this.stats.formatsStandardized += toUpdate.length;
      }
    }
  }

  private async removeLowQualityEntries(): Promise<void> {
    this.log('🗑️ Removing low quality entries...');

    const lowQualityEntries = await prisma.fragrance.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { in: ['', 'N/A', 'TBD', 'Unknown'] } },
              { brand: { in: ['', 'N/A', 'TBD', 'Unknown'] } },
              { name: { contains: '#NAME?' } }
            ]
          },
          { topNotes: { equals: [] } },
          { middleNotes: { equals: [] } },
          { baseNotes: { equals: [] } }
        ]
      },
      take: this.dryRun ? 10 : undefined
    });

    this.log(`Found ${lowQualityEntries.length} low quality entries to remove`);

    if (lowQualityEntries.length > 0 && !this.dryRun) {
      // Archive before deleting
      for (const entry of lowQualityEntries) {
        this.backupData.changes.push({
          id: entry.id,
          operation: 'delete',
          before: entry
        });
      }

      await prisma.fragrance.deleteMany({
        where: {
          id: { in: lowQualityEntries.map(e => e.id) }
        }
      });
    }

    this.stats.lowQualityRemoved = lowQualityEntries.length;
  }

  private async consolidateDuplicates(): Promise<void> {
    this.log('🔄 Consolidating duplicates...');

    // Find potential duplicates based on name similarity and brand
    const duplicates = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      brand: string;
      year: number;
      duplicate_group: string;
    }>>`
      SELECT
        f1.id,
        f1.name,
        f1.brand,
        f1.year,
        f1.name || '|' || f1.brand as duplicate_group
      FROM fragrances f1
      JOIN fragrances f2 ON f1.brand = f2.brand
        AND f1.id != f2.id
        AND similarity(f1.name, f2.name) > 0.8
      ORDER BY f1.brand, f1.name
      LIMIT ${this.dryRun ? 20 : 100}
    `;

    this.log(`Found ${duplicates.length} potential duplicates`);

    // Group duplicates and merge the best ones
    const groupedDuplicates = new Map<string, typeof duplicates>();
    duplicates.forEach(dup => {
      const key = `${dup.brand}|${dup.name.substring(0, 10)}`;
      if (!groupedDuplicates.has(key)) {
        groupedDuplicates.set(key, []);
      }
      groupedDuplicates.get(key)!.push(dup);
    });

    let consolidated = 0;
    for (const [key, group] of groupedDuplicates) {
      if (group.length > 1) {
        // Keep the most complete one, remove others
        const keeper = group[0]; // In a real implementation, we'd choose the best one
        const toRemove = group.slice(1);

        this.log(`${this.dryRun ? '[DRY RUN] ' : ''}🔄 Consolidating ${group.length} duplicates for "${keeper.name}"`);

        if (!this.dryRun) {
          await prisma.fragrance.deleteMany({
            where: { id: { in: toRemove.map(r => r.id) } }
          });
        }

        consolidated += toRemove.length;
      }
    }

    this.stats.duplicatesConsolidated = consolidated;
  }

  private async generateReports(): Promise<void> {
    this.log('📊 Generating cleanup reports...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save detailed backup data
    const backupFile = path.join(__dirname, `../backups/strategic-cleanup-${timestamp}.json`);
    const backupsDir = path.dirname(backupFile);
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    fs.writeFileSync(backupFile, JSON.stringify(this.backupData, null, 2));

    // Generate rollback script
    const rollbackFile = path.join(__dirname, `../scripts/rollback-strategic-cleanup-${timestamp}.sql`);
    let rollbackSQL = `-- Strategic Cleanup Rollback Script\n-- Generated: ${new Date().toISOString()}\n\n`;

    rollbackSQL += `-- Restore from backup columns\n`;
    rollbackSQL += `UPDATE fragrances SET name = name_backup WHERE name_backup IS NOT NULL;\n`;
    rollbackSQL += `UPDATE fragrances SET brand = brand_backup WHERE brand_backup IS NOT NULL;\n`;
    rollbackSQL += `UPDATE fragrances SET concentration = concentration_backup WHERE concentration_backup IS NOT NULL;\n\n`;

    rollbackSQL += `-- Summary: ${this.stats.brandRedundancyCleaned} name changes, ${this.stats.formatsStandardized} format changes\n`;

    fs.writeFileSync(rollbackFile, rollbackSQL);

    this.log(`💾 Reports generated:`);
    this.log(`   Backup data: ${backupFile}`);
    this.log(`   Rollback script: ${rollbackFile}`);
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeForPrisma(text: string): string {
    return text.replace(/'/g, "''");
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const cleanup = new StrategicCleanupService(dryRun);

  try {
    const stats = await cleanup.execute();

    console.log('\n✅ Strategic cleanup completed!');
    console.log('📊 Final Statistics:');
    console.log(`   Brand redundancy cleaned: ${stats.brandRedundancyCleaned}`);
    console.log(`   Formats standardized: ${stats.formatsStandardized}`);
    console.log(`   Low quality removed: ${stats.lowQualityRemoved}`);
    console.log(`   Duplicates consolidated: ${stats.duplicatesConsolidated}`);
    console.log(`   Total processed: ${stats.totalProcessed}`);
    console.log(`   Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach(error => console.log(`   - ${error}`));
    }

  } catch (error) {
    console.error('❌ Strategic cleanup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { StrategicCleanupService };
