#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function restoreFromBackup() {
  try {
    console.log('🔄 Starting database restoration from backup...');

    // Read the cleaned CSV file
    const csvPath = join(process.cwd(), '../../data/fra_cleaned.csv');
    console.log('📁 Reading CSV from:', csvPath);

    const csvContent = readFileSync(csvPath, 'utf-8');
    console.log('📄 CSV content length:', csvContent.length);

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';'
    });

    console.log(`📊 Found ${records.length} fragrances to restore`);
    console.log('📋 First record sample:', records[0]);

    // Test database connection
    const testCount = await prisma.fragrance.count();
    console.log('🔌 Database connected. Current count:', testCount);

    // Process just the first 5 records as a test
    const testRecords = records.slice(0, 5);

    for (const record of testRecords) {
      console.log('Processing:', record.Name);

      const fragrance = {
        name: record.Name || '',
        brand: record.Brand || '',
        concentration: record.Concentration || null,
        releaseYear: record['Release Year'] && record['Release Year'] !== 'N/A' ? parseInt(record['Release Year']) : null,
        perfumer: record.Perfumers || null,
        topNotes: record['Top Notes'] || null,
        middleNotes: record['Middle Notes'] || null,
        baseNotes: record['Base Notes'] || null,
        mainAccords: record['Main Accords'] || null,
        ratingValue: record['Rating Value'] && parseFloat(record['Rating Value']) > 0 ? parseFloat(record['Rating Value']) : null,
        ratingCount: record['Rating Count'] && parseInt(record['Rating Count']) > 0 ? parseInt(record['Rating Count']) : null,
        url: record.URL || null,
        externalId: record.URL ? record.URL.split('/').pop() : null,

        // Simple market intelligence
        marketPriority: 5,
        trending: false,
        targetDemographic: 'Millennials',
        viralScore: 0,
        brandTier: 'Unclassified',
        searchDemand: 0,

        // Quality scoring
        prestigeScore: 50,
        popularityScore: 0,
        relevanceScore: 0,

        // Metadata
        dataSource: 'backup_restoration',
        lastUpdated: new Date(),
        verified: false,
      };

      await prisma.fragrance.create({
        data: fragrance
      });

      console.log('✅ Inserted:', record.Name);
    }

    const finalCount = await prisma.fragrance.count();
    console.log(`🎉 Test completed! Database size: ${finalCount} fragrances`);

  } catch (error) {
    console.error('❌ Restoration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  restoreFromBackup().catch(console.error);
}

export { restoreFromBackup };
