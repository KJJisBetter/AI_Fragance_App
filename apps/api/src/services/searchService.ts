/**
 * Modern Search Service
 * Using Fuse.js for intelligent fuzzy search and MeiliSearch for advanced capabilities
 * Replaces custom search implementation with battle-tested libraries
 */

import Fuse from 'fuse.js';
import { MeiliSearch } from 'meilisearch';
import NodeCache from 'node-cache';
import * as stringSimilarity from 'string-similarity';
import { distance } from 'leven';
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
  verified: boolean;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'partial' | 'brand' | 'ai';
  source: 'local' | 'meilisearch' | 'ai-fallback';
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  threshold?: number;
  includeMetadata?: boolean;
  forceRefresh?: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  duration: number;
  source: string;
  suggestions?: string[];
  metadata?: {
    strategy: string;
    cacheHit: boolean;
    searchEngines: string[];
  };
}

// ===== SEARCH ENGINES =====
class SearchService {
  private fuseEngine: Fuse<any> | null = null;
  private meilisearchClient: MeiliSearch | null = null;
  private cache: NodeCache;
  private fragranceDataCache: any[] = [];
  private lastIndexUpdate = 0;

  constructor() {
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: config.CACHE_TTL_SECONDS,
      checkperiod: 60, // Check for expired keys every minute
      useClones: false
    });

    // Initialize MeiliSearch if available
    if (features.meilisearch) {
      this.initializeMeiliSearch();
    }

    // Initialize Fuse.js
    this.initializeFuse();
  }

  // ===== MEILISEARCH SETUP =====
  private async initializeMeiliSearch() {
    try {
      this.meilisearchClient = new MeiliSearch({
        host: config.MEILISEARCH_URL,
        apiKey: config.MEILISEARCH_API_KEY
      });

      // Test connection
      await this.meilisearchClient.health();
      log.info('🔍 MeiliSearch connected successfully');

      // Setup index
      await this.setupMeiliSearchIndex();
    } catch (error) {
      log.warn('⚠️ MeiliSearch not available, falling back to Fuse.js', { error });
      this.meilisearchClient = null;
    }
  }

  private async setupMeiliSearchIndex() {
    if (!this.meilisearchClient) return;

    try {
      const index = this.meilisearchClient.index('fragrances');

      // Configure searchable attributes
      await index.updateSearchableAttributes([
        'name',
        'brand',
        'concentration',
        'year'
      ]);

      // Configure ranking rules
      await index.updateRankingRules([
        'words',
        'typo',
        'exactness',
        'attribute',
        'sort',
        'popularity:desc',
        'communityRating:desc'
      ]);

      // Configure synonyms for common abbreviations
      await index.updateSynonyms({
        'ysl': ['yves saint laurent', 'saint laurent'],
        'tf': ['tom ford'],
        'jpg': ['jean paul gaultier', 'gaultier'],
        'ck': ['calvin klein'],
        'dg': ['dolce gabbana', 'dolce & gabbana'],
        'chanel blue': ['bleu de chanel'],
        'blue chanel': ['bleu de chanel'],
        'sauvage': ['dior sauvage'],
        'aventus': ['creed aventus'],
        'adg': ['acqua di gio'],
        'one million': ['1 million'],
        'la nuit': ['la nuit de lhomme']
      });

      log.info('🔍 MeiliSearch index configured');
    } catch (error) {
      log.error('❌ Failed to configure MeiliSearch index', { error });
    }
  }

  // ===== FUSE.JS SETUP =====
  private async initializeFuse() {
    try {
      await this.refreshFragranceData();

      const fuseOptions: Fuse.IFuseOptions<any> = {
        keys: [
          { name: 'name', weight: 0.7 },
          { name: 'brand', weight: 0.3 },
          { name: 'concentration', weight: 0.1 }
        ],
        threshold: 0.4, // More strict - 40% similarity for quality matches
        distance: 100, // Reduced distance for better precision
        minMatchCharLength: 3, // Require at least 3 characters to match
        includeScore: true,
        includeMatches: true,
        ignoreLocation: true,
        useExtendedSearch: true,
        shouldSort: true,
        findAllMatches: true
      };

      this.fuseEngine = new Fuse(this.fragranceDataCache, fuseOptions);
      log.info('🔍 Fuse.js search engine initialized', {
        documents: this.fragranceDataCache.length
      });
    } catch (error) {
      log.error('❌ Failed to initialize Fuse.js', { error });
    }
  }

  private async refreshFragranceData() {
    const monitor = this.startPerformanceMonitor('refreshFragranceData');

    try {
      // Only refresh if data is stale (5 minutes)
      if (Date.now() - this.lastIndexUpdate < 300000) {
        return;
      }

      this.fragranceDataCache = await prisma.fragrance.findMany({
        select: {
          id: true,
          name: true,
          brand: true,
          year: true,
          concentration: true,
          communityRating: true,
          popularityScore: true,
          verified: true,
          createdAt: true
        },
        orderBy: [
          { popularityScore: 'desc' },
          { communityRating: 'desc' }
        ]
      });

      this.lastIndexUpdate = Date.now();
      log.info('📊 Fragrance data refreshed', {
        count: this.fragranceDataCache.length
      });
    } catch (error) {
      log.error('❌ Failed to refresh fragrance data', { error });
    } finally {
      monitor.end();
    }
  }

  // ===== MAIN SEARCH METHODS =====

  /**
   * Intelligent search that tries multiple strategies
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const monitor = this.startPerformanceMonitor(`search:${query}`);
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;

    try {
      // Check cache first
      if (!options.forceRefresh) {
        const cached = this.cache.get<SearchResponse>(cacheKey);
        if (cached) {
          log.search.cache(query, true);
          return { ...cached, duration: monitor.end() };
        }
      }

      log.search.cache(query, false);

      // Try MeiliSearch first (if available)
      if (this.meilisearchClient) {
        const meiliResult = await this.searchWithMeili(query, options);
        if (meiliResult.results.length > 0) {
          this.cache.set(cacheKey, meiliResult);
          log.search.query(query, meiliResult.results.length, monitor.end(), 'meilisearch');
          return meiliResult;
        }
      }

      // Fall back to Fuse.js
      const fuseResult = await this.searchWithFuse(query, options);

      // Cache result
      this.cache.set(cacheKey, fuseResult);

      log.search.query(query, fuseResult.results.length, monitor.end(), 'fuse');
      return fuseResult;

    } catch (error) {
      log.search.error(query, error as Error);
      throw error;
    } finally {
      monitor.end();
    }
  }

  /**
   * MeiliSearch implementation
   */
  private async searchWithMeili(query: string, options: SearchOptions): Promise<SearchResponse> {
    if (!this.meilisearchClient) {
      throw new Error('MeiliSearch not available');
    }

    const start = Date.now();
    const index = this.meilisearchClient.index('fragrances');

    const searchParams = {
      q: query,
      limit: options.limit || config.SEARCH_RESULTS_LIMIT,
      offset: options.offset || 0,
      attributesToRetrieve: ['*'],
      showMatchesPosition: true
    };

    const response = await index.search(query, searchParams);

    const results: SearchResult[] = response.hits.map((hit: any, index: number) => ({
      id: hit.id,
      name: hit.name,
      brand: hit.brand,
      year: hit.year,
      concentration: hit.concentration,
      communityRating: hit.communityRating || 0,
      popularityScore: hit.popularityScore || 0,
      verified: hit.verified || false,
      score: 1 - (hit._rankingScore || 0), // Convert to 0-1 scale
      matchType: this.determineMatchType(query, hit.name, hit.brand),
      source: 'meilisearch'
    }));

    return {
      results,
      total: response.totalHits || results.length,
      query,
      duration: Date.now() - start,
      source: 'meilisearch',
      suggestions: [], // MeiliSearch doesn't provide suggestions in this version
      metadata: {
        strategy: 'meilisearch',
        cacheHit: false,
        searchEngines: ['meilisearch']
      }
    };
  }

  /**
   * Fuse.js implementation with intelligent scoring
   */
  private async searchWithFuse(query: string, options: SearchOptions): Promise<SearchResponse> {
    if (!this.fuseEngine) {
      await this.initializeFuse();
    }

    const start = Date.now();
    await this.refreshFragranceData();

    // Extract key terms from query for progressive search
    const queryTerms = this.extractKeyTerms(query);
    let allResults: any[] = [];
    const seenIds = new Set<string>();

    // Progressive search strategy: exact → partial → brand → fuzzy → individual words
    const strategies = [
      // 1. Exact match - highest priority
      {
        queries: [`="${query}"`],
        weight: 1.0,
        type: 'exact',
        description: 'Exact match'
      },

      // 2. Partial matches - search for each key term
      {
        queries: queryTerms.map(term => `'${term}`),
        weight: 0.9,
        type: 'partial',
        description: 'Partial match on key terms'
      },

      // 3. Brand-based search - show all fragrances from matching brands
      {
        queries: this.generateBrandQueries(queryTerms),
        weight: 0.8,
        type: 'brand',
        description: 'Brand-based search'
      },

      // 4. Fuzzy search - typo-tolerant
      {
        queries: [query],
        weight: 0.7,
        type: 'fuzzy',
        description: 'Fuzzy search'
      },

      // 5. Individual words with OR operator
      {
        queries: [queryTerms.join(' | ')],
        weight: 0.6,
        type: 'words',
        description: 'Individual word search'
      },

      // 6. Expanded search - includes abbreviations and nicknames
      {
        queries: this.generateExpandedQueries(query),
        weight: 0.5,
        type: 'expanded',
        description: 'Expanded search with abbreviations'
      }
    ];

    for (const strategy of strategies) {
      for (const searchQuery of strategy.queries) {
        if (!searchQuery || searchQuery.length < 2) continue;

        try {
          const results = this.fuseEngine!.search(searchQuery, {
            limit: Math.min(100, (options.limit || config.SEARCH_RESULTS_LIMIT) * 2)
          });

          for (const result of results) {
            if (!seenIds.has(result.item.id)) {
              // Filter out irrelevant matches
              if (this.isRelevantMatch(query, result.item, result.score || 1)) {
                seenIds.add(result.item.id);
                allResults.push({
                  ...result,
                  adjustedScore: (result.score || 0) / strategy.weight,
                  matchType: strategy.type,
                  searchStrategy: strategy.description,
                  originalQuery: searchQuery
                });
              }
            }
          }
        } catch (error) {
          // Skip invalid queries
          continue;
        }
      }
    }

    // Sort by intelligent scoring
    allResults.sort((a, b) => {
      const scoreA = this.calculateIntelligentScore(query, a.item, a.adjustedScore);
      const scoreB = this.calculateIntelligentScore(query, b.item, b.adjustedScore);
      return scoreA - scoreB; // Lower score = better match
    });

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || config.SEARCH_RESULTS_LIMIT;
    const paginatedResults = allResults.slice(offset, offset + limit);

    const results: SearchResult[] = paginatedResults.map(result => ({
      id: result.item.id,
      name: result.item.name,
      brand: result.item.brand,
      year: result.item.year,
      concentration: result.item.concentration,
      communityRating: result.item.communityRating || 0,
      popularityScore: result.item.popularityScore || 0,
      verified: result.item.verified || false,
      score: 1 - result.adjustedScore, // Convert to 0-1 scale (1 = perfect match)
      matchType: this.determineMatchType(query, result.item.name, result.item.brand),
      source: 'local'
    }));

    // Generate suggestions for typos
    const suggestions = this.generateSuggestions(query);

    return {
      results,
      total: allResults.length,
      query,
      duration: Date.now() - start,
      source: 'fuse',
      suggestions,
      metadata: {
        strategy: 'progressive-search',
        cacheHit: false,
        searchEngines: ['fuse'],
        strategiesUsed: strategies.map(s => s.description)
      }
    };
  }

  // ===== HELPER METHODS =====

  private calculateIntelligentScore(query: string, item: any, fuseScore: number): number {
    let score = fuseScore;
    const lowerQuery = query.toLowerCase();
    const lowerName = item.name.toLowerCase();
    const lowerBrand = item.brand.toLowerCase();
    const queryTerms = this.extractKeyTerms(query);

    // Apply typo corrections before matching
    const correctedQuery = this.applyTypoCorrections(lowerQuery);

    // 1. Exact match bonus (highest priority)
    if (lowerName === correctedQuery || lowerBrand === correctedQuery) {
      return 0.001; // Best possible score
    }

    // 2. Exact query contained in name (very high priority)
    if (lowerName.includes(correctedQuery)) {
      score *= 0.01;
    }

    // 3. Progressive matching - key terms from query
    let keyTermMatches = 0;
    let partialMatches = 0;

    for (const term of queryTerms) {
      // Exact word match in name or brand
      if (lowerName.includes(term) || lowerBrand.includes(term)) {
        keyTermMatches++;

        // Extra bonus if it's the start of a word
        if (lowerName.startsWith(term) || lowerBrand.startsWith(term)) {
          score *= 0.05;
        }
      }

      // Partial match within words
      const nameWords = lowerName.split(/\s+/);
      const brandWords = lowerBrand.split(/\s+/);

      for (const word of [...nameWords, ...brandWords]) {
        if (word.includes(term) && word !== term) {
          partialMatches++;
        }
      }
    }

    // Apply key term match bonus
    if (keyTermMatches > 0) {
      const matchRatio = keyTermMatches / queryTerms.length;
      score *= 0.02 + (matchRatio * 0.08); // Between 0.02 and 0.1
    }

    // Apply partial match bonus
    if (partialMatches > 0) {
      score *= Math.max(0.15, 0.5 - (partialMatches * 0.1));
    }

    // 4. Brand family bonus - show all fragrances from same brand if brand matches
    const firstTerm = queryTerms[0];
    if (firstTerm && lowerBrand.includes(firstTerm)) {
      score *= 0.2; // Strong brand match bonus
    }

    // 5. Fragrance line bonus - if searching for "eros flame", prioritize all "eros" variants
    if (queryTerms.length > 1) {
      const baseTerm = queryTerms[0]; // "eros" from "eros flame"
      if (lowerName.includes(baseTerm)) {
        score *= 0.1; // Show all variants of the base fragrance
      }
    }

    // 6. Popular fragrance bonus
    if (item.popularityScore > 7) {
      score *= 0.85;
    } else if (item.popularityScore > 5) {
      score *= 0.9;
    }

    // 7. High rating bonus
    if (item.communityRating > 4.5) {
      score *= 0.9;
    } else if (item.communityRating > 4) {
      score *= 0.95;
    }

    // 8. Verified fragrance bonus
    if (item.verified) {
      score *= 0.95;
    }

    // 9. Recency bonus for newer fragrances (slight)
    if (item.year && item.year > 2020) {
      score *= 0.98;
    }

    return Math.max(score, 0.001); // Ensure minimum score
  }

  private applyTypoCorrections(query: string): string {
    const corrections = {
      'eors': 'eros',
      'sagave': 'sauvage',
      'savage': 'sauvage',
      'aventis': 'aventus',
      'chanell': 'chanel',
      'versachi': 'versace',
      'farenheit': 'fahrenheit',
      'blu': 'blue',
      'bleu': 'blue'
    };

    let corrected = query;
    for (const [typo, correct] of Object.entries(corrections)) {
      corrected = corrected.replace(new RegExp(typo, 'gi'), correct);
    }

    return corrected;
  }

  private determineMatchType(query: string, name: string, brand: string): SearchResult['matchType'] {
    const lowerQuery = query.toLowerCase();
    const lowerName = name.toLowerCase();
    const lowerBrand = brand.toLowerCase();

    if (lowerName === lowerQuery || lowerBrand === lowerQuery) {
      return 'exact';
    }

    if (lowerName.includes(lowerQuery) || lowerBrand.includes(lowerQuery)) {
      return 'partial';
    }

    if (lowerBrand.includes(lowerQuery.split(' ')[0])) {
      return 'brand';
    }

    return 'fuzzy';
  }

  private generateSuggestions(query: string): string[] {
    const suggestions: string[] = [];

    // Common typo corrections
    const typoMappings = {
      'sagave': 'sauvage',
      'savage': 'sauvage',
      'aventis': 'aventus',
      'chanell': 'chanel',
      'versachi': 'versace',
      'farenheit': 'fahrenheit',
      'aqua': 'acqua',
      'erose': 'eros',
      'flam': 'flame',
      'blu': 'blue',
      'bleu': 'blue'
    };

    const lowerQuery = query.toLowerCase();
    if (typoMappings[lowerQuery]) {
      suggestions.push(typoMappings[lowerQuery]);
    }

    // Find similar words using string similarity
    const commonTerms = ['chanel', 'dior', 'versace', 'creed', 'sauvage', 'aventus', 'bleu', 'eros', 'flame', 'acqua'];
    for (const term of commonTerms) {
      if (stringSimilarity.compareTwoStrings(lowerQuery, term) > 0.6) {
        suggestions.push(term);
      }
    }

    return [...new Set(suggestions)];
  }

  // Extract key terms from search query for progressive matching
  private extractKeyTerms(query: string): string[] {
    const cleaned = query.toLowerCase().trim();
    const terms = cleaned.split(/\s+/).filter(term => term.length > 1);

    // Remove common stop words that don't help with fragrance search
    const stopWords = new Set(['de', 'du', 'la', 'le', 'by', 'for', 'men', 'women', 'unisex', 'eau', 'parfum', 'toilette']);
    const keyTerms = terms.filter(term => !stopWords.has(term));

    return keyTerms.length > 0 ? keyTerms : terms;
  }

  // Generate brand-based search queries
  private generateBrandQueries(terms: string[]): string[] {
    const brandQueries: string[] = [];

    // Brand abbreviations and expansions
    const brandMappings = {
      'ysl': 'yves saint laurent',
      'tf': 'tom ford',
      'jpg': 'jean paul gaultier',
      'ck': 'calvin klein',
      'dg': 'dolce gabbana',
      'adg': 'acqua di gio',
      'versace': 'versace',
      'chanel': 'chanel',
      'dior': 'dior',
      'creed': 'creed'
    };

    for (const term of terms) {
      // Check if term matches a brand or brand abbreviation
      if (brandMappings[term]) {
        // Search for all fragrances from this brand
        brandQueries.push(`'${brandMappings[term]}`);
      }

      // Check if term could be part of a brand name
      Object.values(brandMappings).forEach(brandName => {
        if (brandName.includes(term) && term.length > 2) {
          brandQueries.push(`'${brandName}`);
        }
      });
    }

    // Add original terms as brand searches
    terms.forEach(term => {
      if (term.length > 2) {
        brandQueries.push(`'${term}`);
      }
    });

    return [...new Set(brandQueries)];
  }

  // Generate expanded queries with abbreviations and nicknames
  private generateExpandedQueries(query: string): string[] {
    const expanded: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Fragrance nickname expansions
    const fragranceNicknames = {
      'adg': 'acqua di gio',
      'blu': 'bleu de chanel',
      'blue chanel': 'bleu de chanel',
      'sauvage': 'dior sauvage',
      'aventus': 'creed aventus',
      'one million': '1 million',
      'la nuit': 'la nuit de lhomme',
      'eros': 'versace eros',
      'flame': 'eros flame'
    };

    // Check for nickname matches
    Object.entries(fragranceNicknames).forEach(([nickname, fullName]) => {
      if (lowerQuery.includes(nickname)) {
        expanded.push(fullName);
        expanded.push(`'${fullName}`);
      }
    });

    // Add partial matches for compound queries
    if (lowerQuery.includes(' ')) {
      const parts = lowerQuery.split(' ');
      parts.forEach(part => {
        if (part.length > 2) {
          expanded.push(`'${part}`);
        }
      });
    }

    return [...new Set(expanded)];
  }

  // Check if a search result is relevant to the query
  private isRelevantMatch(query: string, item: any, score: number): boolean {
    const lowerQuery = query.toLowerCase().trim();
    const lowerName = item.name.toLowerCase();
    const lowerBrand = item.brand.toLowerCase();
    const queryTerms = this.extractKeyTerms(query);

    // If score is too poor (> 0.7), reject unless it's an exact match
    if (score > 0.7) {
      // Allow only if there's an exact word match
      const hasExactWordMatch = queryTerms.some(term =>
        lowerName.includes(term) || lowerBrand.includes(term)
      );
      if (!hasExactWordMatch) {
        return false;
      }
    }

    // Reject if query and result share less than 50% of characters
    const queryChars = new Set(lowerQuery.replace(/\s/g, ''));
    const itemChars = new Set((lowerName + ' ' + lowerBrand).replace(/\s/g, ''));
    const sharedChars = [...queryChars].filter(char => itemChars.has(char));
    const sharedRatio = sharedChars.length / queryChars.size;

    if (sharedRatio < 0.5 && score > 0.5) {
      return false;
    }

    // Check for meaningful word overlap
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
    const itemWords = (lowerName + ' ' + lowerBrand).split(/\s+/).filter(w => w.length > 2);

    const hasWordOverlap = queryWords.some(qWord =>
      itemWords.some(iWord =>
        qWord.includes(iWord) ||
        iWord.includes(qWord) ||
        this.calculateSimilarity(qWord, iWord) > 0.7
      )
    );

    // For poor scores, require word overlap
    if (score > 0.5 && !hasWordOverlap) {
      return false;
    }

    // Special case: prevent completely unrelated matches
    // Example: "eros" should not match "kerosene"
    if (queryTerms.length === 1 && queryTerms[0].length <= 4) {
      const term = queryTerms[0];
      // Must have the term as a substring or very similar word
      const hasDirectMatch = lowerName.includes(term) || lowerBrand.includes(term);
      const hasSimilarWord = itemWords.some(word =>
        word.startsWith(term) ||
        term.startsWith(word) ||
        this.calculateSimilarity(term, word) > 0.8
      );

      if (!hasDirectMatch && !hasSimilarWord && score > 0.3) {
        return false;
      }
    }

    return true;
  }

  // Calculate string similarity (simple implementation)
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Calculate edit distance (Levenshtein distance)
  private getEditDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // ===== AUTO-COMPLETE =====

  async autocomplete(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const cacheKey = `autocomplete:${query}:${limit}`;
    const cached = this.cache.get<string[]>(cacheKey);
    if (cached) return cached;

    await this.refreshFragranceData();

    const results = this.fragranceDataCache
      .filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.brand.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit)
      .map(item => `${item.name} by ${item.brand}`);

    this.cache.set(cacheKey, results);
    return results;
  }

  // ===== UTILITIES =====

  private startPerformanceMonitor(operation: string) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          log.performance.slow(operation, duration, 1000);
        }
        return duration;
      }
    };
  }

  // ===== DATA INDEXING =====

  async indexFragrances(fragrances?: any[]): Promise<void> {
    if (!this.meilisearchClient) return;

    const monitor = this.startPerformanceMonitor('indexFragrances');

    try {
      const data = fragrances || this.fragranceDataCache;
      if (data.length === 0) {
        await this.refreshFragranceData();
      }

      const index = this.meilisearchClient.index('fragrances');
      await index.addDocuments(data);

      log.info('📊 Fragrances indexed in MeiliSearch', {
        count: data.length
      });
    } catch (error) {
      log.error('❌ Failed to index fragrances', { error });
    } finally {
      monitor.end();
    }
  }

  // ===== CACHE MANAGEMENT =====

  clearCache(): void {
    this.cache.flushAll();
    log.info('🗑️ Search cache cleared');
  }

  getCacheStats(): { hits: number; misses: number; keys: number } {
    return {
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      keys: this.cache.getStats().keys
    };
  }
}

// Export singleton instance
export const searchService = new SearchService();
export default searchService;
