import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const prisma = new PrismaClient();

interface QualityAnalysis {
  totalFragrances: number;
  brandRedundancy: {
    count: number;
    percentage: number;
    examples: Array<{
      id: string;
      name: string;
      brand: string;
      redundancyType: string;
    }>;
  };
  dataCompleteness: {
    topNotes: { count: number; percentage: number };
    middleNotes: { count: number; percentage: number };
    baseNotes: { count: number; percentage: number };
    year: { count: number; percentage: number };
    concentration: { count: number; percentage: number };
    rating: { count: number; percentage: number };
  };
  brandDistribution: Array<{
    brand: string;
    count: number;
    percentage: number;
  }>;
  concentrationDistribution: Array<{
    concentration: string;
    count: number;
    percentage: number;
  }>;
  qualityScore: number;
  recommendations: string[];
}

class DatabaseQualityAnalyzer {
  private logFile: string;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `../logs/database-analysis-${timestamp}.log`);

    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async analyze(): Promise<QualityAnalysis> {
    this.log('🔍 Starting comprehensive database quality analysis...');

    // 1. Get total count
    const totalFragrances = await prisma.fragrance.count();
    this.log(`📊 Total fragrances: ${totalFragrances.toLocaleString()}`);

    // 2. Analyze brand redundancy
    const brandRedundancy = await this.analyzeBrandRedundancy(totalFragrances);

    // 3. Analyze data completeness
    const dataCompleteness = await this.analyzeDataCompleteness(totalFragrances);

    // 4. Analyze brand distribution
    const brandDistribution = await this.analyzeBrandDistribution(totalFragrances);

    // 5. Analyze concentration distribution
    const concentrationDistribution = await this.analyzeConcentrationDistribution(totalFragrances);

    // 6. Calculate quality score
    const qualityScore = this.calculateQualityScore(brandRedundancy, dataCompleteness, totalFragrances);

    // 7. Generate recommendations
    const recommendations = this.generateRecommendations(qualityScore, brandRedundancy, dataCompleteness);

    const analysis: QualityAnalysis = {
      totalFragrances,
      brandRedundancy,
      dataCompleteness,
      brandDistribution,
      concentrationDistribution,
      qualityScore,
      recommendations
    };

    await this.saveAnalysis(analysis);
    this.presentResults(analysis);

    return analysis;
  }

  private async analyzeBrandRedundancy(total: number) {
    this.log('🔍 Analyzing brand redundancy...');

    const redundantFragrances = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      brand: string;
      redundancy_type: string;
    }>>`
      SELECT
        id,
        name,
        brand,
        CASE
          WHEN name ILIKE '%Atelier%' || brand || '%' || brand || '%' THEN 'atelier_double'
          WHEN name ILIKE brand || ' - %' THEN 'brand_dash_prefix'
          WHEN name ILIKE '% ' || brand || ' %' THEN 'brand_middle'
          WHEN name ILIKE '% ' || brand || ' 20__' THEN 'brand_with_year'
          WHEN name ILIKE '% ' || brand THEN 'brand_suffix'
          WHEN name ILIKE brand || ' %' THEN 'brand_prefix'
          ELSE 'other'
        END as redundancy_type
      FROM fragrances
      WHERE
        name ILIKE '%' || brand || '%'
        AND LENGTH(name) > LENGTH(brand) + 3
      ORDER BY brand, name
      LIMIT 100
    `;

    const count = redundantFragrances.length;
    const percentage = (count / total) * 100;

    this.log(`❌ Brand redundancy found: ${count} fragrances (${percentage.toFixed(1)}%)`);

    return {
      count,
      percentage,
      examples: redundantFragrances.map(f => ({
        id: f.id,
        name: f.name,
        brand: f.brand,
        redundancyType: f.redundancy_type
      }))
    };
  }

  private async analyzeDataCompleteness(total: number) {
    this.log('📋 Analyzing data completeness...');

    const completeness = await prisma.$queryRaw<Array<{
      field: string;
      count: number;
    }>>`
      SELECT
        'topNotes' as field,
        COUNT(*) as count
      FROM fragrances
      WHERE array_length("topNotes", 1) > 0

      UNION ALL

      SELECT
        'middleNotes' as field,
        COUNT(*) as count
      FROM fragrances
      WHERE array_length("middleNotes", 1) > 0

      UNION ALL

      SELECT
        'baseNotes' as field,
        COUNT(*) as count
      FROM fragrances
      WHERE array_length("baseNotes", 1) > 0

      UNION ALL

      SELECT
        'year' as field,
        COUNT(*) as count
      FROM fragrances
      WHERE year IS NOT NULL

      UNION ALL

      SELECT
        'concentration' as field,
        COUNT(*) as count
      FROM fragrances
      WHERE concentration IS NOT NULL AND concentration != ''

      UNION ALL

      SELECT
        'rating' as field,
        COUNT(*) as count
      FROM fragrances
      WHERE "communityRating" IS NOT NULL
    `;

    const result = completeness.reduce((acc, item) => {
      acc[item.field] = {
        count: Number(item.count),
        percentage: (Number(item.count) / total) * 100
      };
      return acc;
    }, {} as any);

    this.log(`📊 Data completeness analysis:`);
    Object.entries(result).forEach(([field, data]: [string, any]) => {
      this.log(`   ${field}: ${data.count.toLocaleString()}/${total.toLocaleString()} (${data.percentage.toFixed(1)}%)`);
    });

    return result;
  }

  private async analyzeBrandDistribution(total: number) {
    this.log('🏷️ Analyzing brand distribution...');

    const brands = await prisma.fragrance.groupBy({
      by: ['brand'],
      _count: { brand: true },
      orderBy: { _count: { brand: 'desc' } },
      take: 20
    });

    const distribution = brands.map(b => ({
      brand: b.brand,
      count: b._count.brand,
      percentage: (b._count.brand / total) * 100
    }));

    this.log(`🏷️ Top 10 brands:`);
    distribution.slice(0, 10).forEach(b => {
      this.log(`   ${b.brand}: ${b.count.toLocaleString()} (${b.percentage.toFixed(1)}%)`);
    });

    return distribution;
  }

  private async analyzeConcentrationDistribution(total: number) {
    this.log('💧 Analyzing concentration distribution...');

    const concentrations = await prisma.fragrance.groupBy({
      by: ['concentration'],
      _count: { concentration: true },
      orderBy: { _count: { concentration: 'desc' } },
      take: 15
    });

    const distribution = concentrations.map(c => ({
      concentration: c.concentration || 'Unknown',
      count: c._count.concentration,
      percentage: (c._count.concentration / total) * 100
    }));

    this.log(`💧 Top concentrations:`);
    distribution.slice(0, 10).forEach(c => {
      this.log(`   ${c.concentration}: ${c.count.toLocaleString()} (${c.percentage.toFixed(1)}%)`);
    });

    return distribution;
  }

  private calculateQualityScore(brandRedundancy: any, dataCompleteness: any, total: number): number {
    // Cleanliness score (0-40 points) - penalize redundancy
    const cleanlinessScore = Math.max(0, 40 - (brandRedundancy.percentage * 0.8));

    // Completeness score (0-40 points) - reward complete data
    const avgCompleteness = Object.values(dataCompleteness).reduce((sum: number, field: any) =>
      sum + field.percentage, 0) / Object.keys(dataCompleteness).length;
    const completenessScore = Math.min(40, avgCompleteness * 0.4);

    // Volume score (0-20 points) - reward having substantial data
    const volumeScore = Math.min(20, (total / 1000) * 20);

    const totalScore = Math.round(cleanlinessScore + completenessScore + volumeScore);

    this.log(`📊 Quality Score Calculation:`);
    this.log(`   Cleanliness: ${cleanlinessScore.toFixed(1)}/40`);
    this.log(`   Completeness: ${completenessScore.toFixed(1)}/40`);
    this.log(`   Volume: ${volumeScore.toFixed(1)}/20`);
    this.log(`   Total: ${totalScore}/100`);

    return totalScore;
  }

  private generateRecommendations(
    qualityScore: number,
    brandRedundancy: any,
    dataCompleteness: any
  ): string[] {
    const recommendations: string[] = [];

    // Quality-based recommendations
    if (qualityScore > 70) {
      recommendations.push('🟢 HIGH QUALITY: Light cleanup + selective API seeding (~500 API calls)');
      recommendations.push('✅ Keep existing data, focus on enriching incomplete records');
    } else if (qualityScore > 40) {
      recommendations.push('🟡 MEDIUM QUALITY: Moderate cleanup + targeted API seeding (~1000 API calls)');
      recommendations.push('⚠️ Clean redundancy issues, then enrich with API data');
    } else {
      recommendations.push('🔴 LOW QUALITY: Heavy cleanup + comprehensive API seeding (~2000 API calls)');
      recommendations.push('🔧 Consider fresh start with API as primary data source');
    }

    // Redundancy-based recommendations
    if (brandRedundancy.percentage > 30) {
      recommendations.push('🧹 URGENT: Run brand redundancy cleanup - significant naming issues detected');
    } else if (brandRedundancy.percentage > 10) {
      recommendations.push('⚠️ MODERATE: Brand redundancy cleanup recommended');
    }

    // Completeness-based recommendations
    const avgCompleteness = Object.values(dataCompleteness).reduce((sum: number, field: any) =>
      sum + field.percentage, 0) / Object.keys(dataCompleteness).length;

    if (avgCompleteness < 50) {
      recommendations.push('📊 DATA GAPS: Prioritize API seeding for note data and ratings');
    }

    return recommendations;
  }

  private async saveAnalysis(analysis: QualityAnalysis): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(__dirname, `../reports/database-quality-${timestamp}.json`);

    // Ensure reports directory exists
    const reportsDir = path.dirname(reportFile);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(analysis, null, 2));
    this.log(`💾 Analysis report saved: ${reportFile}`);
  }

  private presentResults(analysis: QualityAnalysis): void {
    this.log('\n' + '='.repeat(80));
    this.log('📊 DATABASE QUALITY ANALYSIS RESULTS');
    this.log('='.repeat(80));

    this.log(`\n🎯 OVERALL QUALITY SCORE: ${analysis.qualityScore}/100`);

    if (analysis.qualityScore >= 70) {
      this.log('🟢 EXCELLENT - Your database is in great shape!');
    } else if (analysis.qualityScore >= 50) {
      this.log('🟡 GOOD - Some improvements needed');
    } else if (analysis.qualityScore >= 30) {
      this.log('🟠 FAIR - Significant improvements required');
    } else {
      this.log('🔴 POOR - Major cleanup needed');
    }

    this.log(`\n📊 KEY METRICS:`);
    this.log(`   Total Fragrances: ${analysis.totalFragrances.toLocaleString()}`);
    this.log(`   Brand Redundancy: ${analysis.brandRedundancy.count.toLocaleString()} (${analysis.brandRedundancy.percentage.toFixed(1)}%)`);
    this.log(`   Avg Data Completeness: ${(Object.values(analysis.dataCompleteness).reduce((sum: number, field: any) => sum + field.percentage, 0) / Object.keys(analysis.dataCompleteness).length).toFixed(1)}%`);

    this.log(`\n🎯 RECOMMENDATIONS:`);
    analysis.recommendations.forEach(rec => {
      this.log(`   ${rec}`);
    });

    this.log(`\n📋 NEXT STEPS:`);
    this.log(`   1. Review the detailed report (JSON file saved)`);
    this.log(`   2. Run cleanup scripts based on recommendations`);
    this.log(`   3. Plan API integration strategy`);
    this.log(`   4. Implement hybrid service architecture`);

    this.log('\n' + '='.repeat(80));
  }
}

// Export for programmatic usage
export { DatabaseQualityAnalyzer };

// CLI execution
async function main() {
  const analyzer = new DatabaseQualityAnalyzer();

  try {
    const analysis = await analyzer.analyze();

    console.log('\n✅ Database analysis complete!');
    console.log(`📊 Quality Score: ${analysis.qualityScore}/100`);
    console.log(`🎯 Strategy: ${analysis.recommendations[0]}`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
