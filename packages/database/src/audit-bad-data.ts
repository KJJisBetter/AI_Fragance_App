import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const prisma = new PrismaClient();

interface BadDataExample {
  id: string;
  name: string;
  brand: string;
  year?: number;
  concentration?: string;
  issue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
  category: string;
}

class DatabaseQualityAuditor {
  private badExamples: BadDataExample[] = [];
  private logFile: string;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `../reports/bad-data-audit-${timestamp}.log`);

    // Ensure reports directory exists
    const reportsDir = path.dirname(this.logFile);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  private addBadExample(fragrance: any, issue: string, severity: 'HIGH' | 'MEDIUM' | 'LOW', suggestion: string, category: string): void {
    this.badExamples.push({
      id: fragrance.id,
      name: fragrance.name,
      brand: fragrance.brand,
      year: fragrance.year,
      concentration: fragrance.concentration,
      issue,
      severity,
      suggestion,
      category
    });
  }

  async auditRedundantNames(): Promise<void> {
    this.log('🔍 Auditing redundant/repetitive names...');

    const fragrances = await prisma.fragrance.findMany({
      select: { id: true, name: true, brand: true, year: true, concentration: true }
    });

    for (const fragrance of fragrances) {
      const name = fragrance.name.toLowerCase();
      const brand = fragrance.brand.toLowerCase();

      // Check if name starts or ends with brand
      if (name.startsWith(brand + ' ') || name.endsWith(' ' + brand)) {
        this.addBadExample(
          fragrance,
          `Name contains redundant brand reference: "${fragrance.name}"`,
          'HIGH',
          `Remove brand from name: "${fragrance.name.replace(new RegExp(fragrance.brand, 'gi'), '').trim()}"`,
          'REDUNDANT_BRAND'
        );
      }

      // Check for brand repetition within name
      const brandOccurrences = (name.match(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
      if (brandOccurrences > 1) {
        this.addBadExample(
          fragrance,
          `Brand name appears ${brandOccurrences} times in fragrance name`,
          'HIGH',
          'Remove duplicate brand references',
          'BRAND_REPETITION'
        );
      }

      // Check for overly long names (over 80 characters)
      if (fragrance.name.length > 80) {
        this.addBadExample(
          fragrance,
          `Extremely long name (${fragrance.name.length} characters)`,
          'MEDIUM',
          'Simplify name or extract additional info to separate fields',
          'OVERLY_LONG'
        );
      }

      // Check for year repetition in name when year field exists
      if (fragrance.year && fragrance.name.includes(fragrance.year.toString())) {
        this.addBadExample(
          fragrance,
          `Year ${fragrance.year} redundantly included in name`,
          'MEDIUM',
          `Remove year from name since it's in year field`,
          'REDUNDANT_YEAR'
        );
      }

      // Check for concentration repetition
      if (fragrance.concentration) {
        const concWords = ['eau de parfum', 'eau de toilette', 'parfum', 'cologne', 'edt', 'edp'];
        const hasConcentrationInName = concWords.some(word =>
          name.includes(word) && fragrance.concentration?.toLowerCase().includes(word)
        );
        if (hasConcentrationInName) {
          this.addBadExample(
            fragrance,
            `Concentration redundantly included in name`,
            'MEDIUM',
            'Remove concentration from name since it\'s in concentration field',
            'REDUNDANT_CONCENTRATION'
          );
        }
      }
    }
  }

  async auditNamingPatterns(): Promise<void> {
    this.log('🔍 Auditing problematic naming patterns...');

    // Find names with excessive punctuation/special characters
    const specialCharFragrances = await prisma.$queryRaw<Array<{
      id: string; name: string; brand: string; year: number; concentration: string;
    }>>`
      SELECT id, name, brand, year, concentration
      FROM fragrances
      WHERE name ~ '[^\w\s''().&:/-]'
         OR LENGTH(name) - LENGTH(REPLACE(name, ' ', '')) > 10
    `;

    for (const fragrance of specialCharFragrances) {
      const specialChars = fragrance.name.match(/[^\w\s\-''().&:/]/g) || [];
      if (specialChars.length > 3) {
        this.addBadExample(
          fragrance,
          `Contains excessive special characters: ${specialChars.join(', ')}`,
          'MEDIUM',
          'Clean up special characters and normalize formatting',
          'SPECIAL_CHARACTERS'
        );
      }

      const spaceCount = (fragrance.name.match(/ /g) || []).length;
      if (spaceCount > 10) {
        this.addBadExample(
          fragrance,
          `Contains excessive spaces/words (${spaceCount + 1} words)`,
          'MEDIUM',
          'Simplify name or move detailed info to description',
          'TOO_MANY_WORDS'
        );
      }
    }
  }

  async auditSuspiciousData(): Promise<void> {
    this.log('🔍 Auditing suspicious/incomplete data...');

    // Names that are just numbers or very short
    const suspiciousNames = await prisma.$queryRaw<Array<{
      id: string; name: string; brand: string; year: number; concentration: string;
    }>>`
      SELECT id, name, brand, year, concentration
      FROM fragrances
      WHERE name ~ '^[0-9]+$'
         OR LENGTH(name) <= 2
         OR LOWER(name) LIKE '%unnamed%'
         OR LOWER(name) LIKE '%untitled%'
         OR LOWER(name) LIKE '%unknown%'
    `;

    for (const fragrance of suspiciousNames) {
      this.addBadExample(
        fragrance,
        `Suspicious/incomplete name: "${fragrance.name}"`,
        'HIGH',
        'Research proper fragrance name or remove if invalid',
        'SUSPICIOUS_NAME'
      );
    }

    // Brands that look like URLs or email addresses
    const suspiciousBrands = await prisma.fragrance.findMany({
      where: {
        OR: [
          { brand: { contains: 'www.' } },
          { brand: { contains: '.com' } },
          { brand: { contains: '@' } },
          { brand: { contains: 'http' } }
        ]
      },
      select: { id: true, name: true, brand: true, year: true, concentration: true }
    });

    for (const fragrance of suspiciousBrands) {
      this.addBadExample(
        fragrance,
        `Brand contains URL/email-like content: "${fragrance.brand}"`,
        'HIGH',
        'Extract proper brand name',
        'SUSPICIOUS_BRAND'
      );
    }
  }

  async auditInconsistentFormatting(): Promise<void> {
    this.log('🔍 Auditing inconsistent formatting...');

    // Mixed case issues
    const mixedCaseIssues = await prisma.$queryRaw<Array<{
      id: string; name: string; brand: string; year: number; concentration: string;
    }>>`
      SELECT id, name, brand, year, concentration
      FROM fragrances
      WHERE name ~ '[a-z][A-Z]|[A-Z]{3,}|[a-z]{20,}'
    `;

    for (const fragrance of mixedCaseIssues) {
      if (fragrance.name.match(/[A-Z]{3,}/)) {
        this.addBadExample(
          fragrance,
          'Contains excessive uppercase letters',
          'LOW',
          'Normalize capitalization',
          'CAPITALIZATION'
        );
      }
      if (fragrance.name.match(/[a-z]{20,}/)) {
        this.addBadExample(
          fragrance,
          'Contains excessive lowercase sequences',
          'LOW',
          'Proper case formatting needed',
          'CAPITALIZATION'
        );
      }
    }

    // Names with numbers in weird places
    const numberIssues = await prisma.$queryRaw<Array<{
      id: string; name: string; brand: string; year: number; concentration: string;
    }>>`
      SELECT id, name, brand, year, concentration
      FROM fragrances
      WHERE name ~ '[0-9]' AND name !~ '^[0-9]+$' AND name !~ '(19|20)[0-9]{2}'
    `;

    for (const fragrance of numberIssues) {
      this.addBadExample(
        fragrance,
        'Contains numbers that may be misplaced or unnecessary',
        'LOW',
        'Review if numbers are part of official name or should be removed',
        'MISPLACED_NUMBERS'
      );
    }
  }

  async auditMissingCriticalData(): Promise<void> {
    this.log('🔍 Auditing missing critical data...');

    // High-profile brands with missing basic info
    const importantBrands = ['Chanel', 'Dior', 'Tom Ford', 'Creed', 'Guerlain', 'Versace'];

    for (const brand of importantBrands) {
      const incompleteEntries = await prisma.fragrance.findMany({
        where: {
          brand: { equals: brand, mode: 'insensitive' },
          OR: [
            { topNotes: { equals: [] } },
            { middleNotes: { equals: [] } },
            { baseNotes: { equals: [] } },
            { year: null },
            { concentration: null },
            { communityRating: null }
          ]
        },
        select: { id: true, name: true, brand: true, year: true, concentration: true }
      });

      for (const fragrance of incompleteEntries) {
        const missingFields = [];
        if (!fragrance.year) missingFields.push('year');
        if (!fragrance.concentration) missingFields.push('concentration');

        this.addBadExample(
          fragrance,
          `High-profile brand missing: ${missingFields.join(', ')}`,
          'HIGH',
          'Priority for API enhancement - complete via Perfumero API',
          'MISSING_DATA_IMPORTANT'
        );
      }
    }
  }

  async generateReport(): Promise<void> {
    this.log(`📊 Generating comprehensive bad data report...`);

    // Sort by severity and category
    this.badExamples.sort((a, b) => {
      const severityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    // Show all examples for full database audit
    const limitedExamples = this.badExamples;

    // Generate summary by category
    const categoryStats = limitedExamples.reduce((acc, example) => {
      acc[example.category] = (acc[example.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityStats = limitedExamples.reduce((acc, example) => {
      acc[example.severity] = (acc[example.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBadExamples: limitedExamples.length,
        categoryBreakdown: categoryStats,
        severityBreakdown: severityStats
      },
      examples: limitedExamples,
      recommendations: [
        'Use Perfumero API to enhance HIGH severity items first',
        'Focus on REDUNDANT_BRAND and BRAND_REPETITION for quick wins',
        'Clean up MISSING_DATA_IMPORTANT for high-profile brands',
        'Consider batch operations for CAPITALIZATION issues'
      ]
    };

    const reportFile = path.join(__dirname, `../reports/bad-data-examples-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    this.log(`💾 Bad data report saved: ${reportFile}`);

    // Print summary
    console.log('\n================================================================================');
    console.log('📊 DATABASE QUALITY AUDIT RESULTS');
    console.log('================================================================================');
    console.log(`🎯 Found ${limitedExamples.length} bad data examples (showing top 1000)`);
    console.log('\n📈 BY SEVERITY:');
    Object.entries(severityStats).forEach(([severity, count]) => {
      console.log(`   ${severity}: ${count} examples`);
    });
    console.log('\n📋 BY CATEGORY:');
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} examples`);
    });
    console.log('\n🎯 TOP 10 WORST EXAMPLES:');
    limitedExamples.slice(0, 10).forEach((example, i) => {
      console.log(`${i + 1}. [${example.severity}] ${example.brand} - "${example.name}"`);
      console.log(`   Issue: ${example.issue}`);
      console.log(`   Fix: ${example.suggestion}\n`);
    });
    console.log('================================================================================');
  }

  async execute(): Promise<void> {
    this.log('🚀 Starting comprehensive database quality audit...');

    try {
      await this.auditRedundantNames();
      await this.auditNamingPatterns();
      await this.auditSuspiciousData();
      await this.auditInconsistentFormatting();
      await this.auditMissingCriticalData();

      await this.generateReport();

      this.log('✅ Database quality audit completed successfully!');

    } catch (error) {
      this.log(`❌ Audit failed: ${error}`);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  const auditor = new DatabaseQualityAuditor();
  await auditor.execute();
}

main().catch(console.error);
