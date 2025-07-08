/**
 * Perfumero API Integration Service
 *
 * Strategic API Usage:
 * - Search enhancement when local results are insufficient
 * - Similar fragrance recommendations
 * - Data enhancement for popular fragrances
 * - Real-time discovery of new releases
 *
 * Rate Limiting: 10,000 requests/month = ~333 requests/day
 */

import axios, { AxiosResponse } from 'axios';
import { prisma } from '@fragrance-battle/database';

// ===== TYPES =====
export interface PerfumeroSearchParams {
  name?: string;
  brand?: string;
  page?: number;
  limit?: number;
}

export interface PerfumeroFragrance {
  pid: string;
  name: string;
  brand: string;
  year?: number;
  concentration?: string;
  notes?: {
    top?: string[];
    middle?: string[];
    base?: string[];
  };
  rating?: number;
  popularity?: number;
  similar?: string[];
  image?: string;
  description?: string;
}

export interface PerfumeroResponse {
  success: boolean;
  data: PerfumeroFragrance[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SimilarPerfumesResponse {
  success: boolean;
  data: {
    pid: string;
    similar: PerfumeroFragrance[];
  };
}

// ===== API CLIENT =====
class PerfumeroAPIClient {
  private baseURL = process.env.PERFUMERO_BASE_URL || 'https://perfumero.p.rapidapi.com';
  private apiKey = process.env.PERFUMERO_API_KEY;
  private requestCount = 0;
  private dailyLimit = 333; // 10k/month ≈ 333/day
  private lastResetDate = new Date().toDateString();

  constructor() {
    if (!this.apiKey) {
      console.warn('⚠️  Perfumero API key not configured - API features will be disabled');
    }
  }

  // ===== RATE LIMITING =====
  private checkRateLimit(): boolean {
    const currentDate = new Date().toDateString();

    // Reset counter daily
    if (currentDate !== this.lastResetDate) {
      this.requestCount = 0;
      this.lastResetDate = currentDate;
    }

    return this.requestCount < this.dailyLimit;
  }

  private incrementRequestCount(): void {
    this.requestCount++;
    console.log(`🔄 Perfumero API usage: ${this.requestCount}/${this.dailyLimit} today`);
  }

  // ===== CORE API METHODS =====

  /**
   * Search for fragrances - Use sparingly, only when local search fails
   */
  async search(params: PerfumeroSearchParams): Promise<PerfumeroResponse> {
    if (!this.apiKey) {
      throw new Error('Perfumero API key not configured');
    }

    if (!this.checkRateLimit()) {
      throw new Error('Daily API rate limit exceeded');
    }

    try {
      this.incrementRequestCount();

      const response: AxiosResponse<PerfumeroResponse> = await axios.get(`${this.baseURL}/search`, {
        params,
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'perfumero.p.rapidapi.com'
        },
        timeout: 10000 // 10 second timeout
      });

      console.log(`✅ Perfumero search successful: ${response.data.data.length} results`);
      return response.data;
    } catch (error) {
      console.error('❌ Perfumero API search failed:', error);
      throw error;
    }
  }

  /**
   * Get similar fragrances by Perfumero ID
   */
  async getSimilar(pid: string): Promise<SimilarPerfumesResponse> {
    if (!this.apiKey) {
      throw new Error('Perfumero API key not configured');
    }

    if (!this.checkRateLimit()) {
      throw new Error('Daily API rate limit exceeded');
    }

    try {
      this.incrementRequestCount();

      const response: AxiosResponse<SimilarPerfumesResponse> = await axios.get(`${this.baseURL}/similar/${pid}`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'perfumero.p.rapidapi.com'
        },
        timeout: 10000
      });

      console.log(`✅ Perfumero similar fragrances: ${response.data.data.similar.length} results`);
      return response.data;
    } catch (error) {
      console.error('❌ Perfumero similar fragrances failed:', error);
      throw error;
    }
  }

  /**
   * Get fragrance details by Perfumero ID
   */
  async getFragranceDetails(pid: string): Promise<PerfumeroFragrance> {
    if (!this.apiKey) {
      throw new Error('Perfumero API key not configured');
    }

    if (!this.checkRateLimit()) {
      throw new Error('Daily API rate limit exceeded');
    }

    try {
      this.incrementRequestCount();

      const response: AxiosResponse<{ success: boolean; data: PerfumeroFragrance }> = await axios.get(`${this.baseURL}/perfume/${pid}`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'perfumero.p.rapidapi.com'
        },
        timeout: 10000
      });

      console.log(`✅ Perfumero fragrance details: ${response.data.data.name}`);
      return response.data.data;
    } catch (error) {
      console.error('❌ Perfumero fragrance details failed:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if API is available and configured
   */
  isAvailable(): boolean {
    return !!this.apiKey && this.checkRateLimit();
  }

  /**
   * Get current API usage stats
   */
  getUsageStats(): { used: number; limit: number; remaining: number; resetDate: string } {
    return {
      used: this.requestCount,
      limit: this.dailyLimit,
      remaining: this.dailyLimit - this.requestCount,
      resetDate: this.lastResetDate
    };
  }
}

// ===== STRATEGIC API USAGE FUNCTIONS =====

/**
 * Enhance search results with Perfumero API when local results are insufficient
 */
export async function enhanceSearchWithAPI(
  query: string,
  localResults: any[],
  minResults: number = 5
): Promise<any[]> {
  if (localResults.length >= minResults) {
    return localResults; // Local results sufficient
  }

  if (!perfumeroClient.isAvailable()) {
    console.log('⚠️  Perfumero API not available, using local results only');
    return localResults;
  }

  try {
    console.log(`🔍 Enhancing search "${query}" with Perfumero API`);

    // Extract brand and name from query
    const queryParts = query.split(' ');
    const searchParams: PerfumeroSearchParams = {
      name: query,
      limit: 10
    };

    // If query contains known brand, separate it
    const knownBrands = ['chanel', 'dior', 'ysl', 'tom ford', 'creed', 'versace'];
    const brandInQuery = knownBrands.find(brand =>
      query.toLowerCase().includes(brand.toLowerCase())
    );

    if (brandInQuery) {
      searchParams.brand = brandInQuery;
      searchParams.name = query.replace(new RegExp(brandInQuery, 'i'), '').trim();
    }

    const apiResponse = await perfumeroClient.search(searchParams);

    // Convert API results to match our format
    const enhancedResults = apiResponse.data.map(apiFragrance => ({
      id: `perfumero_${apiFragrance.pid}`,
      name: apiFragrance.name,
      brand: apiFragrance.brand,
      year: apiFragrance.year,
      concentration: apiFragrance.concentration,
      communityRating: apiFragrance.rating || 0,
      popularityScore: apiFragrance.popularity || 0,
      verified: false,
      _searchScore: 75, // API results get moderate score
      _searchType: 'api',
      _apiSource: 'perfumero',
      _perfumeroPid: apiFragrance.pid
    }));

    // Merge with local results, prioritizing local
    const combined = [...localResults, ...enhancedResults];
    const unique = new Map();

    combined.forEach(fragrance => {
      const key = `${fragrance.name}_${fragrance.brand}`.toLowerCase();
      if (!unique.has(key) || fragrance._searchScore > unique.get(key)._searchScore) {
        unique.set(key, fragrance);
      }
    });

    const finalResults = Array.from(unique.values());
    console.log(`✅ Enhanced search results: ${localResults.length} local + ${enhancedResults.length} API = ${finalResults.length} total`);

    return finalResults;
  } catch (error) {
    console.error('❌ Failed to enhance search with API:', error);
    return localResults; // Fallback to local results
  }
}

/**
 * Get similar fragrance recommendations using Perfumero API
 */
export async function getSimilarRecommendations(
  fragranceId: string,
  limit: number = 5
): Promise<any[]> {
  if (!perfumeroClient.isAvailable()) {
    console.log('⚠️  Perfumero API not available for similar recommendations');
    return [];
  }

  try {
    // First, try to find Perfumero ID for this fragrance
    const fragrance = await prisma.fragrance.findUnique({
      where: { id: fragranceId },
      select: { name: true, brand: true, perfumeroPid: true }
    });

    if (!fragrance) {
      return [];
    }

    let perfumeroPid = fragrance.perfumeroPid;

    // If no Perfumero ID stored, try to search for it
    if (!perfumeroPid) {
      const searchResult = await perfumeroClient.search({
        name: fragrance.name,
        brand: fragrance.brand,
        limit: 1
      });

      if (searchResult.data.length > 0) {
        perfumeroPid = searchResult.data[0].pid;

        // Store the Perfumero ID for future use
        await prisma.fragrance.update({
          where: { id: fragranceId },
          data: { perfumeroPid }
        });
      }
    }

    if (!perfumeroPid) {
      console.log(`⚠️  No Perfumero ID found for ${fragrance.name}`);
      return [];
    }

    // Get similar fragrances from API
    const similarResponse = await perfumeroClient.getSimilar(perfumeroPid);

    const recommendations = similarResponse.data.similar.slice(0, limit).map(apiFragrance => ({
      id: `perfumero_${apiFragrance.pid}`,
      name: apiFragrance.name,
      brand: apiFragrance.brand,
      year: apiFragrance.year,
      concentration: apiFragrance.concentration,
      communityRating: apiFragrance.rating || 0,
      popularityScore: apiFragrance.popularity || 0,
      verified: false,
      _apiSource: 'perfumero',
      _perfumeroPid: apiFragrance.pid,
      _similarity: 'high'
    }));

    console.log(`✅ Similar recommendations: ${recommendations.length} from Perfumero API`);
    return recommendations;
  } catch (error) {
    console.error('❌ Failed to get similar recommendations:', error);
    return [];
  }
}

/**
 * Data enhancement pipeline for popular fragrances
 */
export async function enhancePopularFragrances(batchSize: number = 10): Promise<void> {
  if (!perfumeroClient.isAvailable()) {
    console.log('⚠️  Perfumero API not available for data enhancement');
    return;
  }

  try {
    console.log('🔄 Starting data enhancement for popular fragrances...');

    // Get popular fragrances without Perfumero data
    const popularFragrances = await prisma.fragrance.findMany({
      where: {
        AND: [
          { popularityScore: { gt: 5 } },
          { OR: [{ perfumeroPid: null }, { perfumeroPid: '' }] }
        ]
      },
      select: {
        id: true,
        name: true,
        brand: true,
        popularityScore: true
      },
      orderBy: { popularityScore: 'desc' },
      take: batchSize
    });

    console.log(`Found ${popularFragrances.length} popular fragrances to enhance`);

    for (const fragrance of popularFragrances) {
      try {
        // Search for fragrance in Perfumero
        const searchResult = await perfumeroClient.search({
          name: fragrance.name,
          brand: fragrance.brand,
          limit: 1
        });

        if (searchResult.data.length > 0) {
          const perfumeroData = searchResult.data[0];

          // Update fragrance with enhanced data
          await prisma.fragrance.update({
            where: { id: fragrance.id },
            data: {
              perfumeroPid: perfumeroData.pid,
              // Only update if our data is missing or lower quality
              communityRating: perfumeroData.rating || fragrance.communityRating,
              year: perfumeroData.year || fragrance.year,
              concentration: perfumeroData.concentration || fragrance.concentration,
              // Add enhanced data timestamp
              lastEnhanced: new Date()
            }
          });

          console.log(`✅ Enhanced: ${fragrance.name} by ${fragrance.brand}`);
        }

        // Rate limiting: 1 request per 3 seconds to stay well within limits
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`❌ Failed to enhance ${fragrance.name}:`, error);
      }
    }

    console.log('✅ Data enhancement batch completed');
  } catch (error) {
    console.error('❌ Data enhancement failed:', error);
  }
}

// ===== SINGLETON INSTANCE =====
export const perfumeroClient = new PerfumeroAPIClient();

// ===== SCHEDULED TASKS =====
export function startDataEnhancementSchedule(): void {
  // Run data enhancement daily at 3 AM
  const schedule = require('node-cron');

  schedule.schedule('0 3 * * *', async () => {
    console.log('🌅 Starting scheduled data enhancement...');
    await enhancePopularFragrances(20); // Enhance 20 fragrances daily
  });

  console.log('⏰ Data enhancement schedule started');
}

// ===== UTILITY FUNCTIONS =====
export function getAPIUsageStats() {
  return perfumeroClient.getUsageStats();
}
