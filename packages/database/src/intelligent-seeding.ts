import { PrismaClient } from '@prisma/client';
import { PerfumeroService, PerfumeResult, PerfumeSearchParams } from './services/perfumero-service';
import { DatabaseQualityAnalyzer } from './analyze-database';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const prisma = new PrismaClient();

interface SeedingConfig {
  maxApiRequests: number;
  priorityBrands: string[];
  dryRun: boolean;
  focusAreas: ('missing_notes' | 'low_ratings' | 'popular_brands' | 'trending')[];
}

interface SeedingStats {
  totalApiRequests: number;
  fragrancesEnriched: number;
  fragrancesCreated: number;
  brandsCovered: number;
  notesAdded: number;
  ratingsAdded: number;
  errors: string[];
}

interface SeedingPlan {
  estimatedRequests: number;
  phases: Array<{
    name: string;
    description: string;
    targets: Array<{
      type: 'brand' | 'search' | 'enrich';
      query: string;
      priority: number;
      expectedResults: number;
    }>;
  }>;
}

class IntelligentSeedingService {
  private perfumero: PerfumeroService;
  private config: SeedingConfig;
  private stats: SeedingStats;
  private logFile: string;
  private seedingPlan: SeedingPlan | null = null;

  constructor(config: SeedingConfig) {
    this.config = config;
    this.stats = {
      totalApiRequests: 0,
      fragrancesEnriched: 0,
      fragrancesCreated: 0,
      brandsCovered: 0,
      notesAdded: 0,
      ratingsAdded: 0,
      errors: []
    };

    // Initialize Perfumero service
    this.perfumero = new PerfumeroService({
      apiKey: process.env.PERFUMERO_API_KEY!,
      baseURL: process.env.PERFUMERO_BASE_URL || 'https://perfumero1.p.rapidapi.com',
      monthlyLimit: 10000
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `../logs/intelligent-seeding-${timestamp}.log`);

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

  async execute(): Promise<SeedingStats> {
    this.log('🌱 Starting intelligent database seeding...');
    this.log(`Mode: ${this.config.dryRun ? 'DRY RUN' : 'LIVE EXECUTION'}`);
    this.log(`Max API requests: ${this.config.maxApiRequests}`);

    try {
      // 1. Analyze current database state
      const analyzer = new DatabaseQualityAnalyzer();
      const analysis = await analyzer.analyze();
      this.log(`📊 Database quality score: ${analysis.qualityScore}/100`);

      // 2. Create seeding plan
      this.seedingPlan = await this.createSeedingPlan(analysis);
      this.log(`📋 Seeding plan created: ${this.seedingPlan.estimatedRequests} estimated requests`);

      // 3. Execute seeding phases
      await this.executeSeedingPlan();

      // 4. Generate reports
      await this.generateSeedingReport();

      this.log('✅ Intelligent seeding completed successfully!');
      return this.stats;

    } catch (error) {
      this.log(`❌ Seeding failed: ${error}`, 'ERROR');
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async createSeedingPlan(analysis: any): Promise<SeedingPlan> {
    this.log('📋 Creating intelligent seeding plan...');

    let plan: SeedingPlan = {
      estimatedRequests: 0,
      phases: []
    };

    // Phase 1: Priority brands with missing data
    if (this.config.focusAreas.includes('popular_brands')) {
      const brandPhase = await this.createBrandSeedingPhase(analysis);
      plan.phases.push(brandPhase);
      plan.estimatedRequests += brandPhase.targets.reduce((sum, t) => sum + t.expectedResults, 0);
    }

    // Phase 2: Fragrances with missing notes
    if (this.config.focusAreas.includes('missing_notes')) {
      const notesPhase = await this.createMissingNotesPhase(analysis);
      plan.phases.push(notesPhase);
      plan.estimatedRequests += notesPhase.targets.length;
    }

    // Phase 3: Fragrances with missing ratings
    if (this.config.focusAreas.includes('low_ratings')) {
      const ratingsPhase = await this.createMissingRatingsPhase(analysis);
      plan.phases.push(ratingsPhase);
      plan.estimatedRequests += ratingsPhase.targets.length;
    }

    // Phase 4: Trending/popular fragrances
    if (this.config.focusAreas.includes('trending')) {
      const trendingPhase = await this.createTrendingPhase();
      plan.phases.push(trendingPhase);
      plan.estimatedRequests += trendingPhase.targets.reduce((sum, t) => sum + t.expectedResults, 0);
    }

    // Adjust plan to fit within API limits
    if (plan.estimatedRequests > this.config.maxApiRequests) {
      plan = this.optimizeSeedingPlan(plan);
    }

    return plan;
  }

  private async createBrandSeedingPhase(analysis: any): Promise<any> {
    const brandPhase = {
      name: 'Priority Brand Seeding',
      description: 'Seed fragrances from high-priority brands',
      targets: [] as any[]
    };

    // Get brands that need more data
    const brandStats = await prisma.fragrance.groupBy({
      by: ['brand'],
      _count: { brand: true },
      _avg: {
        communityRating: true,
        relevanceScore: true
      },
      where: {
        brand: { in: this.config.priorityBrands }
      },
      orderBy: { _count: { brand: 'desc' } }
    });

    for (const brandStat of brandStats.slice(0, 10)) {
      // Calculate how many fragrances this brand needs
      const missingDataCount = await prisma.fragrance.count({
        where: {
          brand: brandStat.brand,
          OR: [
            { topNotes: { equals: [] } },
            { middleNotes: { equals: [] } },
            { baseNotes: { equals: [] } },
            { communityRating: null }
          ]
        }
      });

      if (missingDataCount > 5) {
        brandPhase.targets.push({
          type: 'brand',
          query: brandStat.brand,
          priority: 1,
          expectedResults: Math.min(50, missingDataCount)
        });
      }
    }

    return brandPhase;
  }

  private async createMissingNotesPhase(analysis: any): Promise<any> {
    const notesPhase = {
      name: 'Missing Notes Enhancement',
      description: 'Add notes to fragrances that lack them',
      targets: [] as any[]
    };

    // Find fragrances with missing notes that are popular
    const missingNotes = await prisma.fragrance.findMany({
      where: {
        AND: [
          { topNotes: { equals: [] } },
          { middleNotes: { equals: [] } },
          { baseNotes: { equals: [] } },
          {
            OR: [
              { communityRating: { gt: 3.5 } },
              { relevanceScore: { gt: 0.7 } }
            ]
          }
        ]
      },
      take: Math.min(100, this.config.maxApiRequests * 0.3),
      orderBy: { relevanceScore: 'desc' }
    });

    missingNotes.forEach(fragrance => {
      notesPhase.targets.push({
        type: 'enrich',
        query: `${fragrance.name} ${fragrance.brand}`,
        priority: 2,
        expectedResults: 1
      });
    });

    return notesPhase;
  }

  private async createMissingRatingsPhase(analysis: any): Promise<any> {
    const ratingsPhase = {
      name: 'Missing Ratings Enhancement',
      description: 'Add ratings to fragrances that lack them',
      targets: [] as any[]
    };

    // Find fragrances with good note data but missing ratings
    const missingRatings = await prisma.fragrance.findMany({
      where: {
        AND: [
          { communityRating: null },
          {
            OR: [
              { NOT: { topNotes: { isEmpty: true } } },
              { NOT: { middleNotes: { isEmpty: true } } },
              { NOT: { baseNotes: { isEmpty: true } } }
            ]
          }
        ]
      },
      take: Math.min(100, this.config.maxApiRequests * 0.2),
      orderBy: { createdAt: 'desc' }
    });

    missingRatings.forEach(fragrance => {
      ratingsPhase.targets.push({
        type: 'enrich',
        query: `${fragrance.name} ${fragrance.brand}`,
        priority: 3,
        expectedResults: 1
      });
    });

    return ratingsPhase;
  }

  private async createTrendingPhase(): Promise<any> {
    const trendingPhase = {
      name: 'Trending Fragrances',
      description: 'Add currently trending fragrances',
      targets: [] as any[]
    };

    // Popular search terms for trending fragrances
    const trendingQueries = [
      'tom ford oud',
      'creed aventus',
      'maison margiela replica',
      'le labo santal',
      'byredo gypsy water',
      'amouage jubilation',
      'diptyque philosykos'
    ];

    trendingQueries.forEach(query => {
      trendingPhase.targets.push({
        type: 'search',
        query,
        priority: 4,
        expectedResults: 10
      });
    });

    return trendingPhase;
  }

  private optimizeSeedingPlan(plan: SeedingPlan): SeedingPlan {
    this.log('⚠️ Optimizing seeding plan to fit API limits...');

    // Sort phases by priority and trim targets
    plan.phases.forEach(phase => {
      phase.targets.sort((a, b) => a.priority - b.priority);
    });

    let totalRequests = 0;
    const optimizedPlan: SeedingPlan = {
      estimatedRequests: 0,
      phases: []
    };

    for (const phase of plan.phases) {
      const optimizedPhase = { ...phase, targets: [] };

      for (const target of phase.targets) {
        if (totalRequests + target.expectedResults <= this.config.maxApiRequests) {
          optimizedPhase.targets.push(target);
          totalRequests += target.expectedResults;
        }
      }

      if (optimizedPhase.targets.length > 0) {
        optimizedPlan.phases.push(optimizedPhase);
      }
    }

    optimizedPlan.estimatedRequests = totalRequests;
    this.log(`📊 Optimized plan: ${optimizedPlan.estimatedRequests} requests`);

    return optimizedPlan;
  }

  private async executeSeedingPlan(): Promise<void> {
    if (!this.seedingPlan) {
      throw new Error('No seeding plan available');
    }

    this.log('🚀 Executing seeding plan...');

    for (const phase of this.seedingPlan.phases) {
      this.log(`📋 Starting phase: ${phase.name}`);

      for (const target of phase.targets) {
        if (this.stats.totalApiRequests >= this.config.maxApiRequests) {
          this.log('⚠️ API request limit reached, stopping seeding');
          break;
        }

        await this.executeTarget(target);

        // Rate limiting: small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  private async executeTarget(target: any): Promise<void> {
    try {
      switch (target.type) {
        case 'brand':
          await this.seedBrandFragrances(target.query);
          break;
        case 'search':
          await this.seedSearchResults(target.query);
          break;
        case 'enrich':
          await this.enrichFragrance(target.query);
          break;
      }
    } catch (error) {
      this.stats.errors.push(`Failed to execute target ${target.query}: ${error}`);
      this.log(`❌ Target execution failed: ${error}`, 'ERROR');
    }
  }

  private async seedBrandFragrances(brand: string): Promise<void> {
    this.log(`🔍 Seeding brand: ${brand}`);

    if (!this.config.dryRun && !this.perfumero.canMakeRequest()) {
      this.log('⚠️ Cannot make API request due to rate limits', 'WARN');
      return;
    }

    try {
      const results = await this.perfumero.getBrandPerfumes(brand, 30);
      this.stats.totalApiRequests++;

      for (const perfume of results) {
        await this.enrichOrCreateFragrance(perfume);
      }

      this.stats.brandsCovered++;
      this.log(`✅ Seeded ${results.length} fragrances for brand: ${brand}`);

    } catch (error) {
      this.stats.errors.push(`Brand seeding failed for ${brand}: ${error}`);
      this.log(`❌ Brand seeding failed: ${error}`, 'ERROR');
    }
  }

  private async seedSearchResults(query: string): Promise<void> {
    this.log(`🔍 Seeding search: ${query}`);

    if (!this.config.dryRun && !this.perfumero.canMakeRequest()) {
      this.log('⚠️ Cannot make API request due to rate limits', 'WARN');
      return;
    }

    try {
      const results = await this.perfumero.search({ name: query, limit: 15 });
      this.stats.totalApiRequests++;

      for (const perfume of results.perfumes) {
        await this.enrichOrCreateFragrance(perfume);
      }

      this.log(`✅ Seeded ${results.perfumes.length} fragrances for search: ${query}`);

    } catch (error) {
      this.stats.errors.push(`Search seeding failed for ${query}: ${error}`);
      this.log(`❌ Search seeding failed: ${error}`, 'ERROR');
    }
  }

  private async enrichFragrance(query: string): Promise<void> {
    this.log(`🔍 Enriching fragrance: ${query}`);

    if (!this.config.dryRun && !this.perfumero.canMakeRequest()) {
      this.log('⚠️ Cannot make API request due to rate limits', 'WARN');
      return;
    }

    try {
      const results = await this.perfumero.search({ name: query, limit: 1 });
      this.stats.totalApiRequests++;

      if (results.perfumes.length > 0) {
        await this.enrichOrCreateFragrance(results.perfumes[0]);
      }

    } catch (error) {
      this.stats.errors.push(`Enrichment failed for ${query}: ${error}`);
      this.log(`❌ Enrichment failed: ${error}`, 'ERROR');
    }
  }

  private async enrichOrCreateFragrance(apiData: PerfumeResult): Promise<void> {
    if (this.config.dryRun) {
      this.log(`[DRY RUN] Would enrich/create: ${apiData.name} by ${apiData.brand}`);
      return;
    }

    try {
      // Check if fragrance exists
      const existing = await prisma.fragrance.findFirst({
        where: {
          OR: [
            {
              AND: [
                { name: { equals: apiData.name, mode: 'insensitive' } },
                { brand: { equals: apiData.brand, mode: 'insensitive' } }
              ]
            },
            { name: { contains: apiData.name, mode: 'insensitive' } }
          ]
        }
      });

      const enrichedData = {
        name: apiData.name,
        brand: apiData.brand,
        year: apiData.year,
        concentration: apiData.concentration,
        topNotes: apiData.topNotes || [],
        middleNotes: apiData.heartNotes || apiData.middleNotes || [],
        baseNotes: apiData.baseNotes || [],
        communityRating: apiData.rating,
        longevity: apiData.longevity,
        sillage: apiData.sillage,
        projection: apiData.projection,
        lastEnhanced: new Date()
      };

      if (existing) {
        // Update existing fragrance with richer data
        const updateData: any = {};

        // Only update if we have better data
        if (apiData.topNotes && apiData.topNotes.length > existing.topNotes.length) {
          updateData.topNotes = apiData.topNotes;
          this.stats.notesAdded++;
        }

        if (apiData.heartNotes && apiData.heartNotes.length > existing.middleNotes.length) {
          updateData.middleNotes = apiData.heartNotes;
          this.stats.notesAdded++;
        }

        if (apiData.baseNotes && apiData.baseNotes.length > existing.baseNotes.length) {
          updateData.baseNotes = apiData.baseNotes;
          this.stats.notesAdded++;
        }

        if (apiData.rating && !existing.communityRating) {
          updateData.communityRating = apiData.rating;
          this.stats.ratingsAdded++;
        }

        if (Object.keys(updateData).length > 0) {
          updateData.lastEnhanced = new Date();

          await prisma.fragrance.update({
            where: { id: existing.id },
            data: updateData
          });

          this.stats.fragrancesEnriched++;
          this.log(`📝 Enriched: ${apiData.name} by ${apiData.brand}`);
        }
      } else {
        // Create new fragrance
        await prisma.fragrance.create({
          data: enrichedData
        });

        this.stats.fragrancesCreated++;
        this.log(`➕ Created: ${apiData.name} by ${apiData.brand}`);
      }

    } catch (error) {
      this.stats.errors.push(`Failed to enrich/create ${apiData.name}: ${error}`);
      this.log(`❌ Failed to enrich/create: ${error}`, 'ERROR');
    }
  }

  private async generateSeedingReport(): Promise<void> {
    this.log('📊 Generating seeding report...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(__dirname, `../reports/seeding-report-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      plan: this.seedingPlan,
      stats: this.stats,
      apiUsage: this.perfumero.getUsageStats()
    };

    // Ensure reports directory exists
    const reportsDir = path.dirname(reportFile);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    this.log(`💾 Seeding report saved: ${reportFile}`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  const config: SeedingConfig = {
    maxApiRequests: parseInt(args.find(arg => arg.startsWith('--max-requests='))?.split('=')[1] || '500'),
    priorityBrands: ['Versace', 'Chanel', 'Dior', 'Tom Ford', 'Creed', 'Maison Margiela', 'Le Labo', 'Byredo'],
    dryRun: args.includes('--dry-run'),
    focusAreas: args.includes('--focus-areas=')
      ? args.find(arg => arg.startsWith('--focus-areas='))!.split('=')[1].split(',') as any[]
      : ['missing_notes', 'popular_brands', 'low_ratings']
  };

  const seeder = new IntelligentSeedingService(config);

  try {
    const stats = await seeder.execute();

    console.log('\n✅ Intelligent seeding completed!');
    console.log('📊 Final Statistics:');
    console.log(`   API requests used: ${stats.totalApiRequests}`);
    console.log(`   Fragrances enriched: ${stats.fragrancesEnriched}`);
    console.log(`   Fragrances created: ${stats.fragrancesCreated}`);
    console.log(`   Brands covered: ${stats.brandsCovered}`);
    console.log(`   Notes added: ${stats.notesAdded}`);
    console.log(`   Ratings added: ${stats.ratingsAdded}`);
    console.log(`   Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
    }

  } catch (error) {
    console.error('❌ Intelligent seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { IntelligentSeedingService, SeedingConfig, SeedingStats };
