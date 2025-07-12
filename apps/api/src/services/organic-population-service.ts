/**
 * Organic Population Service
 *
 * Manages API-driven search with smart promotion from cold storage (API)
 * to hot cache (database) based on market intelligence and quality metrics.
 */

import { prisma } from '@fragrance-battle/database';
import { perfumeroClient } from './perfumeroApi';
import { log } from '../utils/logger';

interface FragranceSearchResult {
  id: string;
  externalId?: string;
  name: string;
  brand: string;
  year?: number;
  concentration?: string;
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
  communityRating?: number;
  popularityScore?: number;
  marketPriority?: number;
  trending?: boolean;
  targetDemographic?: string;
  dataSource: string;
  isApiOnly?: boolean;
}

export class OrganicPopulationService {
  private perfumeroClient: typeof perfumeroClient;
  private populationLog: Map<string, Date> = new Map();

  // 2025 Market Priority Matrix
  private readonly brandPriorities = {
    tier1: {
      weight: 1.0,
      brands: ['Dior', 'Chanel', 'Tom Ford', 'Jean Paul Gaultier', 'Azzaro', 'Prada', 'Valentino', 'Viktor & Rolf', 'Armani', 'Giorgio Armani', 'Versace', 'YSL', 'Yves Saint Laurent', 'Creed', 'Hermès', 'Gucci']
    },
    tier2: {
      weight: 0.8,
      brands: ['Parfums de Marly', 'Diptyque', 'Maison Francis Kurkdjian', 'MFK', 'Le Labo', 'Byredo', 'Amouage', 'Xerjoff']
    },
    tier3: {
      weight: 0.6,
      brands: ['Lattafa', 'Armaf', 'Dossier', 'ALT Fragrances', 'ALT', 'Alexandria', 'DUA', 'Zara']
    },
    tier4: {
      weight: 0.7,
      brands: ['Ariana Grande', 'Billie Eilish', 'Bella Hadid', 'Rihanna', 'Fenty', 'Sabrina Carpenter']
    }
  };

  private readonly popularSearchTerms = [
    // Tier 1 brands - should always be in database
    'dior', 'sauvage', 'chanel', 'tom ford', 'creed', 'aventus',
    'jean paul gaultier', 'le male', 'azzaro', 'most wanted',
    'prada', 'candy', 'paradoxe', 'valentino', 'born in roma',
    'viktor rolf', 'flowerbomb', 'armani', 'acqua di gio',
    'versace', 'bright crystal', 'ysl', 'libre', 'gucci',

    // Viral/Trending - should be cached
    'baccarat rouge', 'br540', 'br 540', 'delina', 'parfums de marly',
    'cloud', 'ariana grande', 'santal 33', 'another 13',
    'diptyque', 'orpheon', 'le labo',

    // Popular clone terms - budget users search often
    'lattafa', 'khamrah', 'armaf', 'club de nuit', 'dossier',
    'alt fragrances', 'zara red temptation', 'apple juice'
  ];

  constructor() {
    this.perfumeroClient = perfumeroClient;
  }

  async searchWithOrganicPopulation(
    query: string,
    filters: any = {},
    options: { limit?: number; offset?: number } = {}
  ): Promise<FragranceSearchResult[]> {
    log.info(`🔍 Searching for: "${query}"`);

    // 1. Try local database first (super fast) - should have popular stuff
    const localResults = await this.searchLocal(query, filters, options);

    if (localResults.length > 0) {
      log.info(`💾 Found ${localResults.length} local results (hot cache hit)`);
      return localResults;
    }

    // 2. No local results - check if this is a popular query we should have cached
    const isPopularQuery = this.isPopularSearchTerm(query);

    if (isPopularQuery) {
      log.warn(`⚠️ Popular query "${query}" missing from database - priority API fetch`);
    } else {
      log.info(`🌐 Rare/niche query "${query}" - trying API for cold storage access`);
    }

    if (!this.shouldUseAPI(query)) {
      log.info(`⚠️ Skipping API call (rate limit/quality check)`);
      return [];
    }

    try {
      // 3. Fetch from Perfumero API
      const apiResponse = await this.perfumeroClient.search({
        name: query,
        limit: 20
      });

      if (apiResponse.data && apiResponse.data.length > 0) {
        log.info(`🎯 API found ${apiResponse.data.length} results`);

        // 4. SMART PROMOTION LOGIC:
        // Popular queries OR high-quality results get promoted to database
        const shouldPromoteToDatabase = isPopularQuery ||
          apiResponse.data.some(p => this.isHighQualityForPromotion(p));

        if (shouldPromoteToDatabase) {
          // Promote to database (hot cache)
          const promoted = await this.promoteToDatabase(apiResponse.data);
          log.info(`📝 Promoted ${promoted.length} fragrances to database`);
          return promoted;
        } else {
          // Return API results without storing (cold storage access)
          log.info(`🔄 Returning ${apiResponse.data.length} API-only results (not promoting)`);
          return this.formatAPIResults(apiResponse.data);
        }
      }

    } catch (error: any) {
      log.error(`❌ API error for query "${query}":`, error.message);
    }

    return [];
  }

  private async searchLocal(query: string, filters: any, options: { limit?: number; offset?: number } = {}): Promise<FragranceSearchResult[]> {
    log.info(`🔍 searchLocal called with options:`, { limit: options.limit, offset: options.offset });

    const searchConditions = [];

    // Add text search conditions
    if (query) {
      searchConditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          {
            OR: [
              { topNotes: { hasSome: [query] } },
              { middleNotes: { hasSome: [query] } },
              { baseNotes: { hasSome: [query] } }
            ]
          }
        ]
      });
    }

    // Add filter conditions
    const filterConditions = this.buildFilters(filters);
    if (filterConditions.length > 0) {
      searchConditions.push(...filterConditions);
    }

    const fragrances = await prisma.fragrance.findMany({
      where: searchConditions.length > 0 ? { AND: searchConditions } : {},
      orderBy: [
        { marketPriority: 'desc' },
        { communityRating: 'desc' },
        { relevanceScore: 'desc' }
      ],
      skip: options.offset || 0,
      take: options.limit || 100 // Increased default limit, but still reasonable
    });

    log.info(`🔍 searchLocal returning ${fragrances.length} results with limit ${options.limit}, offset ${options.offset}`);

    return fragrances.map(f => ({
      id: f.id,
      externalId: f.externalId || undefined,
      name: f.name,
      brand: f.brand,
      year: f.year || undefined,
      concentration: f.concentration || undefined,
      topNotes: f.topNotes,
      middleNotes: f.middleNotes,
      baseNotes: f.baseNotes,
      communityRating: f.communityRating || undefined,
      popularityScore: f.popularityScore || undefined,
      marketPriority: f.marketPriority || undefined,
      trending: f.trending || false,
      targetDemographic: f.targetDemographic || undefined,
      dataSource: f.dataSource || 'database',
      isApiOnly: false
    }));
  }

  async getSearchCount(query: string, filters: any = {}): Promise<number> {
    const searchConditions = [];

    // Add text search conditions
    if (query) {
      searchConditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          {
            OR: [
              { topNotes: { hasSome: [query] } },
              { middleNotes: { hasSome: [query] } },
              { baseNotes: { hasSome: [query] } }
            ]
          }
        ]
      });
    }

    // Add filter conditions
    const filterConditions = this.buildFilters(filters);
    if (filterConditions.length > 0) {
      searchConditions.push(...filterConditions);
    }

    const count = await prisma.fragrance.count({
      where: searchConditions.length > 0 ? { AND: searchConditions } : {}
    });

    return count;
  }

  /**
   * Build Prisma where conditions from filter object
   */
  private buildFilters(filters: any): any[] {
    if (!filters) return [];

    const conditions = [];

    // Brand filter
    if (filters.brand) {
      conditions.push({
        brand: { contains: filters.brand, mode: 'insensitive' }
      });
    }

    // Concentration filter
    if (filters.concentration) {
      conditions.push({
        concentration: { equals: filters.concentration, mode: 'insensitive' }
      });
    }

    // Year range filters
    if (filters.yearFrom) {
      conditions.push({
        year: { gte: filters.yearFrom }
      });
    }

    if (filters.yearTo) {
      conditions.push({
        year: { lte: filters.yearTo }
      });
    }

    // Verified filter
    if (filters.verified !== undefined) {
      conditions.push({
        verified: filters.verified
      });
    }

    // Season filter (if we add this field later)
    if (filters.season) {
      conditions.push({
        season: { equals: filters.season, mode: 'insensitive' }
      });
    }

    // Occasion filter (if we add this field later)
    if (filters.occasion) {
      conditions.push({
        occasion: { equals: filters.occasion, mode: 'insensitive' }
      });
    }

    // Mood filter (if we add this field later)
    if (filters.mood) {
      conditions.push({
        mood: { equals: filters.mood, mode: 'insensitive' }
      });
    }

    return conditions;
  }

  private isPopularSearchTerm(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return this.popularSearchTerms.some(term =>
      lowerQuery.includes(term) || term.includes(lowerQuery)
    );
  }

  private isHighQualityForPromotion(apiPerfume: any): boolean {
    // Check various quality indicators
    const hasGoodRating = apiPerfume.rating && apiPerfume.rating >= 4.0;
    const isPriorityBrand = this.getMarketPriority(apiPerfume.brand) >= 0.7;
    const hasCompleteProfile = apiPerfume.notes?.top?.length > 0 &&
                               apiPerfume.notes?.middle?.length > 0 &&
                               apiPerfume.notes?.base?.length > 0;
    const isPopular = apiPerfume.popularity && apiPerfume.popularity > 50;

    return hasGoodRating || isPriorityBrand || hasCompleteProfile || isPopular;
  }

  private async promoteToDatabase(apiFragrances: any[]): Promise<FragranceSearchResult[]> {
    const promoted: FragranceSearchResult[] = [];

    for (const apiFragrance of apiFragrances) {
      try {
        // Check if already exists
        const existing = await prisma.fragrance.findFirst({
          where: {
            OR: [
              { externalId: apiFragrance.pid },
              {
                AND: [
                  { name: { equals: apiFragrance.name, mode: 'insensitive' } },
                  { brand: { equals: apiFragrance.brand, mode: 'insensitive' } }
                ]
              }
            ]
          }
        });

        if (existing) {
          // Update with API data if missing
          const updated = await prisma.fragrance.update({
            where: { id: existing.id },
            data: {
              externalId: existing.externalId || apiFragrance.pid,
              perfumeroPid: existing.perfumeroPid || apiFragrance.pid,
              communityRating: existing.communityRating || apiFragrance.rating,
              lastEnhanced: new Date()
            }
          });

          promoted.push(this.mapToSearchResult(updated));
          continue;
        }

        // Only promote if it meets quality threshold
        if (this.isHighQualityForPromotion(apiFragrance)) {
          const marketPriority = this.getMarketPriority(apiFragrance.brand);
          const isTrending = this.isTrendingBrand(apiFragrance.brand);
          const targetDemographic = this.getTargetDemographic(apiFragrance.brand);
          const cleanName = this.cleanAPIName(apiFragrance.name, apiFragrance.brand);

          const newFragrance = await prisma.fragrance.create({
            data: {
              externalId: apiFragrance.pid,
              perfumeroPid: apiFragrance.pid,
              name: cleanName,
              brand: apiFragrance.brand,
              year: apiFragrance.year,
              concentration: apiFragrance.concentration,
              topNotes: apiFragrance.notes?.top || [],
              middleNotes: apiFragrance.notes?.middle || [],
              baseNotes: apiFragrance.notes?.base || [],
              communityRating: apiFragrance.rating,
              popularityScore: apiFragrance.popularity,
              marketPriority,
              trending: isTrending,
              targetDemographic,
              dataSource: 'perfumero_api_promoted',
              populatedAt: new Date(),
              promotedAt: new Date(),
              promotionReason: this.getPromotionReason(apiFragrance),
              dataQuality: this.calculateDataQuality(apiFragrance),
              hasRedundantName: cleanName !== apiFragrance.name,
              hasYearInName: /\b(19|20)\d{2}\b/.test(apiFragrance.name),
              hasConcentrationInName: /\b(EDT|EDP|Parfum|Cologne)\b/i.test(apiFragrance.name)
            }
          });

          promoted.push(this.mapToSearchResult(newFragrance));
          log.info(`⬆️ Promoted "${apiFragrance.brand} ${cleanName}" to database`);
        }

      } catch (error: any) {
        log.error(`❌ Error promoting fragrance:`, error.message);
      }
    }

    // Update population log
    this.populationLog.set(apiFragrances[0]?.brand || 'unknown', new Date());

    return promoted;
  }

  private formatAPIResults(apiFragrances: any[]): FragranceSearchResult[] {
    // Format API results for return without database storage
    return apiFragrances.map(perfume => ({
      id: `api_${perfume.pid}`,
      externalId: perfume.pid,
      name: this.cleanAPIName(perfume.name, perfume.brand),
      brand: perfume.brand,
      year: perfume.year,
      concentration: perfume.concentration,
      topNotes: perfume.notes?.top || [],
      middleNotes: perfume.notes?.middle || [],
      baseNotes: perfume.notes?.base || [],
      communityRating: perfume.rating,
      popularityScore: perfume.popularity,
      marketPriority: this.getMarketPriority(perfume.brand),
      trending: this.isTrendingBrand(perfume.brand),
      targetDemographic: this.getTargetDemographic(perfume.brand),
      dataSource: 'api_only',
      isApiOnly: true // Flag for UI to show differently
    }));
  }

  private mapToSearchResult(fragrance: any): FragranceSearchResult {
    return {
      id: fragrance.id,
      externalId: fragrance.externalId,
      name: fragrance.name,
      brand: fragrance.brand,
      year: fragrance.year,
      concentration: fragrance.concentration,
      topNotes: fragrance.topNotes,
      middleNotes: fragrance.middleNotes,
      baseNotes: fragrance.baseNotes,
      communityRating: fragrance.communityRating,
      popularityScore: fragrance.popularityScore,
      marketPriority: fragrance.marketPriority,
      trending: fragrance.trending,
      targetDemographic: fragrance.targetDemographic,
      dataSource: fragrance.dataSource,
      isApiOnly: false
    };
  }

  private getPromotionReason(perfume: any): string {
    if (this.getMarketPriority(perfume.brand) >= 0.8) return 'tier1_brand';
    if (perfume.rating >= 4.5) return 'high_rating';
    if (perfume.popularity > 100) return 'popular';
    if (this.isTrendingBrand(perfume.brand)) return 'trending';
    return 'quality_profile';
  }

  private getMarketPriority(brand: string): number {
    for (const [tier, config] of Object.entries(this.brandPriorities)) {
      if (config.brands.some((b: string) =>
        brand.toLowerCase().includes(b.toLowerCase()) ||
        b.toLowerCase().includes(brand.toLowerCase())
      )) {
        return config.weight;
      }
    }
    return 0.3; // Default low priority for unlisted brands
  }

  private isTrendingBrand(brand: string): boolean {
    const trendingBrands = [
      'Jean Paul Gaultier', 'Azzaro', 'Prada', 'Valentino', 'Viktor & Rolf',
      'Parfums de Marly', 'Diptyque', 'Ariana Grande', 'Billie Eilish', 'Lattafa'
    ];

    return trendingBrands.some(trending =>
      brand.toLowerCase().includes(trending.toLowerCase())
    );
  }

  private getTargetDemographic(brand: string): string {
    if (['Ariana Grande', 'Billie Eilish', 'Sabrina Carpenter'].some(b => brand.includes(b))) {
      return 'gen_z';
    }
    if (['Lattafa', 'Armaf', 'Dossier', 'ALT', 'Zara'].some(b => brand.includes(b))) {
      return 'budget_conscious';
    }
    if (['Parfums de Marly', 'Diptyque', 'Le Labo', 'Amouage'].some(b => brand.includes(b))) {
      return 'niche_enthusiast';
    }
    return 'mainstream';
  }

  private cleanAPIName(name: string, brand: string): string {
    if (!name || !brand) return name;

    let cleaned = name;

    // Remove brand from start: "Brand - Product" → "Product"
    cleaned = cleaned.replace(new RegExp(`^${this.escapeRegex(brand)}\\s*-\\s*`, 'i'), '');

    // Remove brand from end: "Product Brand" → "Product"
    cleaned = cleaned.replace(new RegExp(`\\s+${this.escapeRegex(brand)}$`, 'i'), '');

    // Remove redundant year
    cleaned = cleaned.replace(/\s+\b(19|20)\d{2}\b/g, '');

    // Remove redundant concentration
    cleaned = cleaned.replace(/\s+\b(EDT|EDP|Eau de Toilette|Eau de Parfum|Parfum|Cologne)\b/gi, '');

    return cleaned.trim();
  }

  private calculateDataQuality(perfume: any): number {
    let quality = 0.5; // Base quality

    if (perfume.rating && perfume.rating >= 4.0) quality += 0.1;
    if (perfume.notes?.top?.length > 0) quality += 0.1;
    if (perfume.notes?.middle?.length > 0) quality += 0.1;
    if (perfume.notes?.base?.length > 0) quality += 0.1;
    if (this.getMarketPriority(perfume.brand) >= 0.8) quality += 0.1;

    return Math.min(quality, 1.0);
  }

  private shouldUseAPI(query: string): boolean {
    const usage = this.perfumeroClient.getUsageStats();

    // Conservative API usage - stay well under 10% of monthly limit
    if (usage.remaining < 500) {
      log.warn(`⚠️ API limit approaching (${usage.remaining} remaining)`);
      return false;
    }

    // Don't API call for very short or nonsensical queries
    if (query.length < 3) return false;

    // Don't call if we just populated this query recently (24 hour cache)
    const lastPopulation = this.populationLog.get(query);
    if (lastPopulation) {
      const hoursSince = (Date.now() - lastPopulation.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) return false;
    }

    return true;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Enhanced monitoring with market intelligence
  async getPopulationStats() {
    const apiUsage = this.perfumeroClient.getUsageStats();
    const totalFragrances = await prisma.fragrance.count();
    const promotedToday = await prisma.fragrance.count({
      where: {
        promotedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    return {
      recentPopulations: Array.from(this.populationLog.entries())
        .sort(([,a], [,b]) => b.getTime() - a.getTime())
        .slice(0, 10),
      totalPopulations: this.populationLog.size,
      apiUsage: {
        ...apiUsage,
        percentage: ((10000 - apiUsage.remaining) / 10000 * 100).toFixed(1)
      },
      databaseStats: {
        total: totalFragrances,
        promotedToday
      },
      marketCoverage: await this.calculateMarketCoverage()
    };
  }

  private async calculateMarketCoverage() {
    const coverage: any = {};

    for (const [tier, config] of Object.entries(this.brandPriorities)) {
      const count = await prisma.fragrance.count({
        where: {
          OR: config.brands.map((brand: string) => ({
            brand: { contains: brand, mode: 'insensitive' }
          }))
        }
      });

      coverage[tier] = {
        brands: config.brands.length,
        fragrances: count,
        avgPerBrand: Math.round(count / config.brands.length)
      };
    }

    return coverage;
  }
}

// Export singleton instance
export const organicPopulationService = new OrganicPopulationService();
