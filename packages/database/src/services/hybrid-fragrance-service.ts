import { PrismaClient } from '@prisma/client';
import { PerfumeroService, PerfumeResult } from './perfumero-service';
import * as fs from 'fs';
import * as path from 'path';

interface HybridConfig {
  apiKey: string;
  baseURL: string;
  monthlyLimit: number;
  cacheDir?: string;
  useApiThreshold: number; // 0-1, percentage of API usage before being conservative
  dataFreshnessThreshold: number; // days
}

interface CacheItem {
  key: string;
  data: any;
  timestamp: Date;
  ttl: number; // seconds
}

interface HybridStats {
  localHits: number;
  apiCalls: number;
  cacheHits: number;
  totalQueries: number;
  apiUsagePercentage: number;
  avgResponseTime: number;
}

class HybridFragranceService {
  private prisma: PrismaClient;
  private perfumero: PerfumeroService;
  private config: HybridConfig;
  private cache: Map<string, CacheItem>;
  private stats: HybridStats;
  private logFile: string;

  constructor(config: HybridConfig) {
    this.config = config;
    this.prisma = new PrismaClient();
    this.perfumero = new PerfumeroService({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      monthlyLimit: config.monthlyLimit
    });

    this.cache = new Map();
    this.stats = {
      localHits: 0,
      apiCalls: 0,
      cacheHits: 0,
      totalQueries: 0,
      apiUsagePercentage: 0,
      avgResponseTime: 0
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `../logs/hybrid-service-${timestamp}.log`);

    // Load cache from disk
    this.loadCacheFromDisk();

    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Periodically clean cache and save to disk
    setInterval(() => {
      this.cleanExpiredCache();
      this.saveCacheToDisk();
    }, 60000); // Every minute
  }

  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    console.log(logMessage);

    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      // Fail silently if logging fails
    }
  }

  private getCacheKey(operation: string, params: any): string {
    return `${operation}:${JSON.stringify(params)}`;
  }

  private setCache(key: string, data: any, ttl: number = 3600): void {
    this.cache.set(key, {
      key,
      data,
      timestamp: new Date(),
      ttl
    });
  }

  private getCache(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = new Date();
    const expired = (now.getTime() - item.timestamp.getTime()) / 1000 > item.ttl;

    if (expired) {
      this.cache.delete(key);
      return null;
    }

    this.stats.cacheHits++;
    return item.data;
  }

  private cleanExpiredCache(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      const expired = (now.getTime() - item.timestamp.getTime()) / 1000 > item.ttl;
      if (expired) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  private saveCacheToDisk(): void {
    try {
      const cacheDir = this.config.cacheDir || path.join(__dirname, '../cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const cacheFile = path.join(cacheDir, 'hybrid-cache.json');
      const cacheData = Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        data: item.data,
        timestamp: item.timestamp.toISOString(),
        ttl: item.ttl
      }));

      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      this.log(`⚠️ Failed to save cache to disk: ${error}`, 'WARN');
    }
  }

  private loadCacheFromDisk(): void {
    try {
      const cacheDir = this.config.cacheDir || path.join(__dirname, '../cache');
      const cacheFile = path.join(cacheDir, 'hybrid-cache.json');

      if (fs.existsSync(cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

        for (const item of cacheData) {
          this.cache.set(item.key, {
            key: item.key,
            data: item.data,
            timestamp: new Date(item.timestamp),
            ttl: item.ttl
          });
        }

        this.log(`📦 Loaded ${cacheData.length} cache entries from disk`);
      }
    } catch (error) {
      this.log(`⚠️ Failed to load cache from disk: ${error}`, 'WARN');
    }
  }

  private shouldUseAPI(query: string): boolean {
    const usage = this.perfumero.getUsageStats();

    // Don't use API if we're over the threshold
    if (usage.percentage > this.config.useApiThreshold * 100) {
      this.log(`⚠️ API usage at ${usage.percentage}%, using local data only`);
      return false;
    }

    // Don't use API for very short queries (likely typos)
    if (query && query.length < 3) {
      return false;
    }

    return true;
  }

  private isDataFresh(lastEnhanced?: Date): boolean {
    if (!lastEnhanced) return false;

    const daysSinceEnhanced = (Date.now() - lastEnhanced.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceEnhanced < this.config.dataFreshnessThreshold;
  }

  private async enrichDataWithAPI(fragrance: any, source: 'search' | 'id'): Promise<any> {
    try {
      let apiData: PerfumeResult;

      if (source === 'search') {
        const searchResults = await this.perfumero.search({
          name: fragrance.name,
          brand: fragrance.brand,
          limit: 1
        });

        if (searchResults.perfumes.length === 0) {
          return fragrance;
        }

        apiData = searchResults.perfumes[0];
      } else {
        // For ID-based enrichment, we'd need an external ID field
        return fragrance;
      }

      // Merge API data with local data
      const enrichedData = {
        ...fragrance,
        // Only update if API data is better
        topNotes: apiData.topNotes && apiData.topNotes.length > fragrance.topNotes.length ? apiData.topNotes : fragrance.topNotes,
        middleNotes: apiData.heartNotes && apiData.heartNotes.length > fragrance.middleNotes.length ? apiData.heartNotes : fragrance.middleNotes,
        baseNotes: apiData.baseNotes && apiData.baseNotes.length > fragrance.baseNotes.length ? apiData.baseNotes : fragrance.baseNotes,
        communityRating: apiData.rating && !fragrance.communityRating ? apiData.rating : fragrance.communityRating,
        longevity: apiData.longevity && !fragrance.longevity ? apiData.longevity : fragrance.longevity,
        sillage: apiData.sillage && !fragrance.sillage ? apiData.sillage : fragrance.sillage,
        projection: apiData.projection && !fragrance.projection ? apiData.projection : fragrance.projection,
        year: apiData.year && !fragrance.year ? apiData.year : fragrance.year,
        concentration: apiData.concentration && !fragrance.concentration ? apiData.concentration : fragrance.concentration,
        lastEnhanced: new Date()
      };

      // Update in database
      await this.prisma.fragrance.update({
        where: { id: fragrance.id },
        data: {
          topNotes: enrichedData.topNotes,
          middleNotes: enrichedData.middleNotes,
          baseNotes: enrichedData.baseNotes,
          communityRating: enrichedData.communityRating,
          longevity: enrichedData.longevity,
          sillage: enrichedData.sillage,
          projection: enrichedData.projection,
          year: enrichedData.year,
          concentration: enrichedData.concentration,
          lastEnhanced: new Date()
        }
      });

      this.stats.apiCalls++;
      this.log(`📈 Enriched fragrance: ${fragrance.name} by ${fragrance.brand}`);

      return enrichedData;
    } catch (error) {
      this.log(`❌ Failed to enrich fragrance: ${error}`, 'ERROR');
      return fragrance;
    }
  }

  // Public API methods
  async searchFragrances(query: string, filters?: any): Promise<any[]> {
    const startTime = Date.now();
    this.stats.totalQueries++;

    const cacheKey = this.getCacheKey('search', { query, filters });

    // 1. Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) {
      this.log(`🚀 Cache hit for search: ${query}`);
      return cached;
    }

    // 2. Search local database
    const localResults = await this.searchLocal(query, filters);

    if (localResults.length > 0) {
      this.stats.localHits++;
      this.log(`💾 Local database hit: ${localResults.length} results for "${query}"`);

      // Cache for 30 minutes
      this.setCache(cacheKey, localResults, 1800);

      // Check if we need to enrich any results
      const staleResults = localResults.filter(r => !this.isDataFresh(r.lastEnhanced));
      if (staleResults.length > 0 && this.shouldUseAPI(query)) {
        // Enrich stale results in background
        this.enrichStaleResults(staleResults);
      }

      return localResults;
    }

    // 3. Last resort: API call (use carefully)
    if (this.shouldUseAPI(query)) {
      this.log(`🌐 Making API call for new data: ${query}`);

      try {
        const apiResults = await this.perfumero.search({
          name: query,
          ...filters,
          limit: 20
        });

        this.stats.apiCalls++;

        // Store in local database for future
        for (const result of apiResults.perfumes) {
          await this.createOrUpdateFragrance(result);
        }

        // Cache the results
        this.setCache(cacheKey, apiResults.perfumes, 3600);

        // Update response time
        const responseTime = Date.now() - startTime;
        this.stats.avgResponseTime = (this.stats.avgResponseTime + responseTime) / 2;

        return apiResults.perfumes;

      } catch (error) {
        this.log(`❌ API search failed: ${error}`, 'ERROR');
        return [];
      }
    }

    this.log(`❌ No results found for: ${query}`);
    return [];
  }

  async getFragranceDetails(id: string): Promise<any | null> {
    const startTime = Date.now();
    this.stats.totalQueries++;

    const cacheKey = this.getCacheKey('details', { id });

    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) {
      this.log(`🚀 Cache hit for details: ${id}`);
      return cached;
    }

    // Always try local first
    const local = await this.prisma.fragrance.findUnique({
      where: { id },
      include: {
        battleItems: {
          include: {
            battle: true
          }
        },
        collections: {
          include: {
            collection: true
          }
        }
      }
    });

    if (local) {
      this.stats.localHits++;

      // Cache for 1 hour
      this.setCache(cacheKey, local, 3600);

      // Enrich with API data if stale and we can use API
      if (!this.isDataFresh(local.lastEnhanced) && this.shouldUseAPI(local.name)) {
        const enriched = await this.enrichDataWithAPI(local, 'search');
        this.setCache(cacheKey, enriched, 3600);
        return enriched;
      }

      return local;
    }

    this.log(`❌ Fragrance not found: ${id}`);
    return null;
  }

  async getSimilarFragrances(id: string, limit: number = 10): Promise<any[]> {
    const startTime = Date.now();
    this.stats.totalQueries++;

    const cacheKey = this.getCacheKey('similar', { id, limit });

    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) {
      this.log(`🚀 Cache hit for similar: ${id}`);
      return cached;
    }

    // Get target fragrance
    const target = await this.prisma.fragrance.findUnique({
      where: { id }
    });

    if (!target) {
      return [];
    }

    // Use local database for similarity matching
    const similar = await this.prisma.fragrance.findMany({
      where: {
        AND: [
          { id: { not: id } },
          { brand: target.brand }, // Same brand first
          {
            OR: [
              { topNotes: { hasSome: target.topNotes } },
              { middleNotes: { hasSome: target.middleNotes } },
              { baseNotes: { hasSome: target.baseNotes } }
            ]
          }
        ]
      },
      take: limit * 2 // Get more to allow for sorting
    });

    // Sort by similarity score
    const sortedSimilar = similar
      .map(f => ({
        ...f,
        similarityScore: this.calculateSimilarity(target, f)
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    this.stats.localHits++;
    this.log(`💾 Found ${sortedSimilar.length} similar fragrances for ${target.name}`);

    // Cache for 2 hours
    this.setCache(cacheKey, sortedSimilar, 7200);

    return sortedSimilar;
  }

  async getPopularFragrances(limit: number = 20): Promise<any[]> {
    const cacheKey = this.getCacheKey('popular', { limit });

    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) {
      this.log(`🚀 Cache hit for popular fragrances`);
      return cached;
    }

    const popular = await this.prisma.fragrance.findMany({
      take: limit,
      orderBy: [
        { relevanceScore: 'desc' },
        { communityRating: 'desc' },
        { prestigeScore: 'desc' }
      ],
      where: {
        AND: [
          { communityRating: { not: null } },
          { topNotes: { not: { equals: [] } } }
        ]
      }
    });

    this.stats.localHits++;
    this.log(`💾 Retrieved ${popular.length} popular fragrances`);

    // Cache for 4 hours
    this.setCache(cacheKey, popular, 14400);

    return popular;
  }

  async getBrandFragrances(brand: string, limit: number = 50): Promise<any[]> {
    const cacheKey = this.getCacheKey('brand', { brand, limit });

    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) {
      this.log(`🚀 Cache hit for brand: ${brand}`);
      return cached;
    }

    const brandFragrances = await this.prisma.fragrance.findMany({
      where: { brand: { equals: brand, mode: 'insensitive' } },
      take: limit,
      orderBy: [
        { relevanceScore: 'desc' },
        { communityRating: 'desc' }
      ]
    });

    this.stats.localHits++;
    this.log(`💾 Retrieved ${brandFragrances.length} fragrances for brand: ${brand}`);

    // Cache for 2 hours
    this.setCache(cacheKey, brandFragrances, 7200);

    return brandFragrances;
  }

  // Private helper methods
  private async searchLocal(query: string, filters?: any): Promise<any[]> {
    const searchConditions = [];

    if (query) {
      searchConditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { topNotes: { hasSome: [query] } },
          { middleNotes: { hasSome: [query] } },
          { baseNotes: { hasSome: [query] } }
        ]
      });
    }

    if (filters) {
      if (filters.brand) {
        searchConditions.push({ brand: { equals: filters.brand, mode: 'insensitive' } });
      }
      if (filters.year) {
        searchConditions.push({ year: filters.year });
      }
      if (filters.concentration) {
        searchConditions.push({ concentration: { equals: filters.concentration, mode: 'insensitive' } });
      }
    }

    return await this.prisma.fragrance.findMany({
      where: searchConditions.length > 0 ? { AND: searchConditions } : {},
      take: 20,
      orderBy: [
        { relevanceScore: 'desc' },
        { communityRating: 'desc' }
      ]
    });
  }

  private calculateSimilarity(target: any, candidate: any): number {
    let score = 0;

    // Brand similarity (high weight)
    if (target.brand === candidate.brand) {
      score += 0.3;
    }

    // Note similarity
    const sharedTopNotes = target.topNotes.filter((note: string) =>
      candidate.topNotes.includes(note)
    ).length;
    const sharedMiddleNotes = target.middleNotes.filter((note: string) =>
      candidate.middleNotes.includes(note)
    ).length;
    const sharedBaseNotes = target.baseNotes.filter((note: string) =>
      candidate.baseNotes.includes(note)
    ).length;

    const totalSharedNotes = sharedTopNotes + sharedMiddleNotes + sharedBaseNotes;
    const totalTargetNotes = target.topNotes.length + target.middleNotes.length + target.baseNotes.length;

    if (totalTargetNotes > 0) {
      score += (totalSharedNotes / totalTargetNotes) * 0.5;
    }

    // Year similarity
    if (target.year && candidate.year) {
      const yearDiff = Math.abs(target.year - candidate.year);
      if (yearDiff <= 5) {
        score += 0.1 * (1 - yearDiff / 5);
      }
    }

    // Concentration similarity
    if (target.concentration === candidate.concentration) {
      score += 0.1;
    }

    return score;
  }

  private async enrichStaleResults(staleResults: any[]): Promise<void> {
    // Enrich in background, don't block main response
    setTimeout(async () => {
      for (const result of staleResults.slice(0, 5)) { // Only enrich first 5
        try {
          await this.enrichDataWithAPI(result, 'search');
        } catch (error) {
          this.log(`⚠️ Background enrichment failed: ${error}`, 'WARN');
        }
      }
    }, 100);
  }

  private async createOrUpdateFragrance(apiData: PerfumeResult): Promise<void> {
    try {
      const existing = await this.prisma.fragrance.findFirst({
        where: {
          AND: [
            { name: { equals: apiData.name, mode: 'insensitive' } },
            { brand: { equals: apiData.brand, mode: 'insensitive' } }
          ]
        }
      });

      const fragranceData = {
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
        await this.prisma.fragrance.update({
          where: { id: existing.id },
          data: fragranceData
        });
      } else {
        await this.prisma.fragrance.create({
          data: fragranceData
        });
      }
    } catch (error) {
      this.log(`❌ Failed to create/update fragrance: ${error}`, 'ERROR');
    }
  }

  // Utility methods
  getStats(): HybridStats {
    const usage = this.perfumero.getUsageStats();
    return {
      ...this.stats,
      apiUsagePercentage: usage.percentage
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.log('🧹 Cache cleared');
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export { HybridFragranceService, HybridConfig, HybridStats };
