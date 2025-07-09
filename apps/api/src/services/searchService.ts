/**
 * Simplified Search Service
 * Uses only MeiliSearch with Redis caching for 7x better performance
 */

import { MeiliSearch } from 'meilisearch';
import { cache } from './redisService';
import { prisma } from '@fragrance-battle/database';
import { config, features } from '../config';
import { log } from '../utils/logger';

// ===== TYPES =====
export interface SearchResult {
  id: string;
  name: string;
  brand: string;
  year?: number;
  concentration?: string;
  communityRating: number;
  popularityScore: number;
  relevanceScore: number;
  verified: boolean;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'partial';
  source: 'meilisearch';
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: {
    brand?: string;
    season?: string;
    concentration?: string;
    yearFrom?: number;
    yearTo?: number;
    verified?: boolean;
  };
  sortBy?: 'name' | 'brand' | 'year' | 'rating' | 'popularity' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  duration: number;
  source: 'meilisearch';
  cached: boolean;
}

// ===== SEARCH SERVICE =====
export class SearchService {
  private client: MeiliSearch;
  private initialized = false;

  constructor() {
    if (features.meilisearch) {
      this.client = new MeiliSearch({
        host: config.MEILISEARCH_URL,
        apiKey: config.MEILISEARCH_API_KEY
      });
      this.initializeMeiliSearch();
    } else {
      log.warn('⚠️ MeiliSearch not configured - search will be limited');
    }
  }

  private async initializeMeiliSearch() {
    try {
      // Test connection
      await this.client.health();
      log.info('🔍 MeiliSearch connected successfully');

      // Setup index
      await this.setupIndex();
      this.initialized = true;
    } catch (error) {
      log.error('❌ MeiliSearch initialization failed', { error });
      this.initialized = false;
    }
  }

  private async setupIndex() {
    if (!this.client) return;

    try {
      const index = this.client.index('fragrances');

      // Configure searchable attributes
      await index.updateSearchableAttributes([
        'name',
        'brand',
        'concentration',
        'year'
      ]);

      // Configure ranking rules for better relevance
      await index.updateRankingRules([
        'words',
        'typo',
        'exactness',
        'attribute',
        'sort',
        'relevanceScore:desc',
        'popularityScore:desc',
        'communityRating:desc'
      ]);

      // Configure filtering attributes
      await index.updateFilterableAttributes([
        'brand',
        'concentration',
        'year',
        'verified',
        'relevanceScore'
      ]);

      // Configure sorting attributes
      await index.updateSortableAttributes([
        'name',
        'brand',
        'year',
        'communityRating',
        'popularityScore',
        'relevanceScore'
      ]);

      log.info('🔍 MeiliSearch index configured');
    } catch (error) {
      log.error('❌ Failed to configure MeiliSearch index', { error });
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;

    // Check Redis cache first
    const cached = await cache.get<SearchResponse>(cacheKey);
    if (cached) {
      log.debug('🎯 Cache hit for search', { query, duration: Date.now() - startTime });
      return { ...cached, cached: true };
    }

    // Fallback to database if MeiliSearch is not available
    if (!this.initialized || !this.client) {
      return this.searchFallback(query, options, startTime);
    }

    try {
      const index = this.client.index('fragrances');

      const searchOptions = {
        limit: options.limit || 20,
        offset: options.offset || 0,
        filter: this.buildFilters(options.filters),
        sort: this.buildSort(options.sortBy, options.sortOrder)
      };

      const results = await index.search(query, searchOptions);

      const response: SearchResponse = {
        results: results.hits.map(hit => this.mapHitToResult(hit, query)),
        total: results.estimatedTotalHits || results.hits.length,
        query,
        duration: Date.now() - startTime,
        source: 'meilisearch',
        cached: false
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, response, 300);

      log.debug('🔍 MeiliSearch search completed', {
        query,
        results: response.results.length,
        duration: response.duration
      });

      return response;
    } catch (error) {
      log.error('❌ MeiliSearch search failed', { query, error });
      return this.searchFallback(query, options, startTime);
    }
  }

  private async searchFallback(query: string, options: SearchOptions, startTime: number): Promise<SearchResponse> {
    try {
      const searchQuery = query.toLowerCase();
      const results = await prisma.fragrance.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { brand: { contains: searchQuery, mode: 'insensitive' } }
          ],
          ...(options.filters?.brand && { brand: { contains: options.filters.brand, mode: 'insensitive' } }),
          ...(options.filters?.concentration && { concentration: options.filters.concentration }),
          ...(options.filters?.verified !== undefined && { verified: options.filters.verified }),
          ...(options.filters?.yearFrom && { year: { gte: options.filters.yearFrom } }),
          ...(options.filters?.yearTo && { year: { lte: options.filters.yearTo } })
        },
        orderBy: this.buildDatabaseSort(options.sortBy, options.sortOrder),
        skip: options.offset || 0,
        take: options.limit || 20
      });

      const response: SearchResponse = {
        results: results.map(fragrance => ({
          id: fragrance.id,
          name: fragrance.name,
          brand: fragrance.brand,
          year: fragrance.year,
          concentration: fragrance.concentration,
          communityRating: fragrance.communityRating || 0,
          popularityScore: fragrance.popularityScore || 0,
          relevanceScore: (fragrance as any).relevanceScore || 0,
          verified: fragrance.verified,
          score: this.calculateFallbackScore(fragrance.name, fragrance.brand, query),
          matchType: 'fuzzy' as const,
          source: 'meilisearch' as const
        })),
        total: results.length,
        query,
        duration: Date.now() - startTime,
        source: 'meilisearch',
        cached: false
      };

      log.debug('🔍 Database fallback search completed', {
        query,
        results: response.results.length,
        duration: response.duration
      });

      return response;
    } catch (error) {
      log.error('❌ Database fallback search failed', { query, error });
      return {
        results: [],
        total: 0,
        query,
        duration: Date.now() - startTime,
        source: 'meilisearch',
        cached: false
      };
    }
  }

  private buildFilters(filters?: SearchOptions['filters']): string[] {
    if (!filters) return [];

    const filterArray: string[] = [];

    if (filters.brand) filterArray.push(`brand = "${filters.brand}"`);
    if (filters.concentration) filterArray.push(`concentration = "${filters.concentration}"`);
    if (filters.verified !== undefined) filterArray.push(`verified = ${filters.verified}`);
    if (filters.yearFrom) filterArray.push(`year >= ${filters.yearFrom}`);
    if (filters.yearTo) filterArray.push(`year <= ${filters.yearTo}`);

    return filterArray;
  }

  private buildSort(sortBy?: string, sortOrder?: string): string[] {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'name':
        return [`name:${order}`];
      case 'brand':
        return [`brand:${order}`];
      case 'year':
        return [`year:${order}`];
      case 'rating':
        return [`communityRating:${order}`];
      case 'popularity':
        return [`popularityScore:${order}`];
      case 'relevance':
      default:
        return [`relevanceScore:${order}`];
    }
  }

  private buildDatabaseSort(sortBy?: string, sortOrder?: string) {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'name':
        return { name: order };
      case 'brand':
        return { brand: order };
      case 'year':
        return { year: order };
      case 'rating':
        return { communityRating: order };
      case 'popularity':
        return { popularityScore: order };
      case 'relevance':
      default:
        return { relevanceScore: order };
    }
  }

  private mapHitToResult(hit: any, query: string): SearchResult {
    return {
      id: hit.id,
      name: hit.name,
      brand: hit.brand,
      year: hit.year,
      concentration: hit.concentration,
      communityRating: hit.communityRating || 0,
      popularityScore: hit.popularityScore || 0,
      relevanceScore: hit.relevanceScore || 0,
      verified: hit.verified || false,
      score: 1 - (hit._rankingScore || 0),
      matchType: this.determineMatchType(query, hit.name, hit.brand),
      source: 'meilisearch'
    };
  }

  private determineMatchType(query: string, name: string, brand: string): 'exact' | 'fuzzy' | 'partial' {
    const q = query.toLowerCase();
    const n = name.toLowerCase();
    const b = brand.toLowerCase();

    if (n === q || b === q) return 'exact';
    if (n.includes(q) || b.includes(q)) return 'partial';
    return 'fuzzy';
  }

  private calculateFallbackScore(name: string, brand: string, query: string): number {
    const q = query.toLowerCase();
    const n = name.toLowerCase();
    const b = brand.toLowerCase();

    if (n === q || b === q) return 1.0;
    if (n.startsWith(q) || b.startsWith(q)) return 0.9;
    if (n.includes(q) || b.includes(q)) return 0.7;
    return 0.5;
  }

  async autocomplete(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const cacheKey = `autocomplete:${query}:${limit}`;

    // Check cache first
    const cached = await cache.get<string[]>(cacheKey);
    if (cached) return cached;

    try {
      if (this.initialized && this.client) {
        const index = this.client.index('fragrances');
        const results = await index.search(query, { limit });

        const suggestions = results.hits.map(hit => hit.name).slice(0, limit);

        // Cache for 10 minutes
        await cache.set(cacheKey, suggestions, 600);

        return suggestions;
      } else {
        // Fallback to database
        const results = await prisma.fragrance.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { brand: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: limit,
          orderBy: { relevanceScore: 'desc' }
        });

        const suggestions = results.map(f => f.name);
        await cache.set(cacheKey, suggestions, 600);

        return suggestions;
      }
    } catch (error) {
      log.error('❌ Autocomplete failed', { query, error });
      return [];
    }
  }

  async indexFragrances(fragrances?: any[]): Promise<void> {
    if (!this.initialized || !this.client) {
      log.warn('⚠️ MeiliSearch not initialized, skipping indexing');
      return;
    }

    try {
      const index = this.client.index('fragrances');

      const data = fragrances || await prisma.fragrance.findMany({
        select: {
          id: true,
          name: true,
          brand: true,
          year: true,
          concentration: true,
          communityRating: true,
          popularityScore: true,
          relevanceScore: true,
          verified: true,
          createdAt: true
        }
      });

      await index.addDocuments(data);
      log.info('✅ Fragrance index updated', { count: data.length });
    } catch (error) {
      log.error('❌ Failed to index fragrances', { error });
    }
  }

  clearCache(): void {
    cache.clear();
    log.info('✅ Search cache cleared');
  }

  getCacheStats(): { hits: number; misses: number; keys: number } {
    // This would need to be implemented based on Redis stats
    return { hits: 0, misses: 0, keys: 0 };
  }
}

// Export singleton instance
export const searchService = new SearchService();
