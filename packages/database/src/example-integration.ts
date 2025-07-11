import { HybridFragranceService, HybridConfig } from './services/hybrid-fragrance-service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Example integration showing how to use the HybridFragranceService
 * in a real application
 */
class FragranceApplicationService {
  private hybridService: HybridFragranceService;

  constructor() {
    // Configure the hybrid service
    const config: HybridConfig = {
      apiKey: process.env.PERFUMERO_API_KEY || '',
      baseURL: process.env.PERFUMERO_BASE_URL || 'https://perfumero1.p.rapidapi.com',
      monthlyLimit: parseInt(process.env.PERFUMERO_MONTHLY_LIMIT || '10000'),
      useApiThreshold: parseFloat(process.env.API_USAGE_THRESHOLD || '0.8'), // 80%
      dataFreshnessThreshold: parseInt(process.env.DATA_FRESHNESS_DAYS || '30'), // 30 days
      cacheDir: process.env.CACHE_DIR || undefined
    };

    this.hybridService = new HybridFragranceService(config);
  }

  /**
   * Search for fragrances with intelligent fallback
   */
  async searchFragrances(query: string, filters?: any) {
    try {
      console.log(`🔍 Searching for: "${query}"`);

      const results = await this.hybridService.searchFragrances(query, filters);

      console.log(`✅ Found ${results.length} results`);
      console.log(`📊 Service stats:`, this.hybridService.getStats());

      return results;
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Get detailed fragrance information
   */
  async getFragranceDetails(id: string) {
    try {
      console.log(`🔍 Getting details for fragrance: ${id}`);

      const details = await this.hybridService.getFragranceDetails(id);

      if (!details) {
        console.log(`❌ Fragrance not found: ${id}`);
        return null;
      }

      console.log(`✅ Retrieved details for: ${details.name} by ${details.brand}`);
      return details;
    } catch (error) {
      console.error('❌ Failed to get fragrance details:', error);
      throw error;
    }
  }

  /**
   * Get similar fragrances
   */
  async getSimilarFragrances(id: string, limit: number = 10) {
    try {
      console.log(`🔍 Finding similar fragrances for: ${id}`);

      const similar = await this.hybridService.getSimilarFragrances(id, limit);

      console.log(`✅ Found ${similar.length} similar fragrances`);
      return similar;
    } catch (error) {
      console.error('❌ Failed to get similar fragrances:', error);
      throw error;
    }
  }

  /**
   * Get popular fragrances
   */
  async getPopularFragrances(limit: number = 20) {
    try {
      console.log(`🔍 Getting popular fragrances (limit: ${limit})`);

      const popular = await this.hybridService.getPopularFragrances(limit);

      console.log(`✅ Retrieved ${popular.length} popular fragrances`);
      return popular;
    } catch (error) {
      console.error('❌ Failed to get popular fragrances:', error);
      throw error;
    }
  }

  /**
   * Get fragrances by brand
   */
  async getBrandFragrances(brand: string, limit: number = 50) {
    try {
      console.log(`🔍 Getting fragrances for brand: ${brand}`);

      const brandFragrances = await this.hybridService.getBrandFragrances(brand, limit);

      console.log(`✅ Retrieved ${brandFragrances.length} fragrances for ${brand}`);
      return brandFragrances;
    } catch (error) {
      console.error('❌ Failed to get brand fragrances:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return this.hybridService.getStats();
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.hybridService.clearCache();
    console.log('🧹 Cache cleared');
  }

  /**
   * Disconnect from services
   */
  async disconnect() {
    await this.hybridService.disconnect();
    console.log('🔌 Disconnected from services');
  }
}

/**
 * Example usage and testing
 */
async function demonstrateHybridService() {
  const app = new FragranceApplicationService();

  try {
    console.log('🚀 Starting Hybrid Fragrance Service Demo\n');

    // 1. Search for fragrances
    console.log('=== SEARCH DEMO ===');
    const searchResults = await app.searchFragrances('versace', { limit: 5 });
    console.log(`Top result: ${searchResults[0]?.name} by ${searchResults[0]?.brand}\n`);

    // 2. Get fragrance details
    if (searchResults.length > 0) {
      console.log('=== DETAILS DEMO ===');
      const details = await app.getFragranceDetails(searchResults[0].id);
      console.log(`Notes: Top: ${details?.topNotes.join(', ')}`);
      console.log(`Rating: ${details?.communityRating || 'N/A'}\n`);
    }

    // 3. Get similar fragrances
    if (searchResults.length > 0) {
      console.log('=== SIMILAR DEMO ===');
      const similar = await app.getSimilarFragrances(searchResults[0].id, 3);
      similar.forEach((frag, i) => {
        console.log(`${i + 1}. ${frag.name} by ${frag.brand} (similarity: ${frag.similarityScore?.toFixed(2)})`);
      });
      console.log('');
    }

    // 4. Get popular fragrances
    console.log('=== POPULAR DEMO ===');
    const popular = await app.getPopularFragrances(3);
    popular.forEach((frag, i) => {
      console.log(`${i + 1}. ${frag.name} by ${frag.brand} (rating: ${frag.communityRating || 'N/A'})`);
    });
    console.log('');

    // 5. Get brand fragrances
    console.log('=== BRAND DEMO ===');
    const brandFragrances = await app.getBrandFragrances('Chanel', 3);
    brandFragrances.forEach((frag, i) => {
      console.log(`${i + 1}. ${frag.name} (${frag.year || 'Unknown year'})`);
    });
    console.log('');

    // 6. Show service statistics
    console.log('=== SERVICE STATS ===');
    const stats = app.getServiceStats();
    console.log(`Total queries: ${stats.totalQueries}`);
    console.log(`Local hits: ${stats.localHits} (${((stats.localHits / stats.totalQueries) * 100).toFixed(1)}%)`);
    console.log(`Cache hits: ${stats.cacheHits} (${((stats.cacheHits / stats.totalQueries) * 100).toFixed(1)}%)`);
    console.log(`API calls: ${stats.apiCalls} (${((stats.apiCalls / stats.totalQueries) * 100).toFixed(1)}%)`);
    console.log(`API usage: ${stats.apiUsagePercentage.toFixed(1)}%`);
    console.log(`Avg response time: ${stats.avgResponseTime.toFixed(0)}ms`);

    console.log('\n✅ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await app.disconnect();
  }
}

/**
 * Example API endpoint handler (for Express.js)
 */
function createExpressRoutes(app: any, fragranceService: FragranceApplicationService) {
  // Search endpoint
  app.get('/api/fragrances/search', async (req: any, res: any) => {
    try {
      const { q, brand, year, concentration, limit } = req.query;

      const results = await fragranceService.searchFragrances(q, {
        brand,
        year: year ? parseInt(year) : undefined,
        concentration,
        limit: limit ? parseInt(limit) : undefined
      });

      res.json({
        success: true,
        data: results,
        stats: fragranceService.getServiceStats()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Details endpoint
  app.get('/api/fragrances/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;

      const details = await fragranceService.getFragranceDetails(id);

      if (!details) {
        return res.status(404).json({
          success: false,
          error: 'Fragrance not found'
        });
      }

      res.json({
        success: true,
        data: details
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Similar endpoint
  app.get('/api/fragrances/:id/similar', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { limit } = req.query;

      const similar = await fragranceService.getSimilarFragrances(
        id,
        limit ? parseInt(limit) : 10
      );

      res.json({
        success: true,
        data: similar
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Popular endpoint
  app.get('/api/fragrances/popular', async (req: any, res: any) => {
    try {
      const { limit } = req.query;

      const popular = await fragranceService.getPopularFragrances(
        limit ? parseInt(limit) : 20
      );

      res.json({
        success: true,
        data: popular
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Brand endpoint
  app.get('/api/brands/:brand/fragrances', async (req: any, res: any) => {
    try {
      const { brand } = req.params;
      const { limit } = req.query;

      const brandFragrances = await fragranceService.getBrandFragrances(
        brand,
        limit ? parseInt(limit) : 50
      );

      res.json({
        success: true,
        data: brandFragrances
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Stats endpoint
  app.get('/api/stats', (req: any, res: any) => {
    res.json({
      success: true,
      data: fragranceService.getServiceStats()
    });
  });

  // Cache management endpoints
  app.delete('/api/cache', (req: any, res: any) => {
    fragranceService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared'
    });
  });
}

/**
 * Example React hook for frontend integration
 */
const useFragranceService = () => {
  const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

  const searchFragrances = async (query: string, filters?: any) => {
    const params = new URLSearchParams({
      q: query,
      ...filters
    });

    const response = await fetch(`${baseURL}/api/fragrances/search?${params}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  };

  const getFragranceDetails = async (id: string) => {
    const response = await fetch(`${baseURL}/api/fragrances/${id}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  };

  const getSimilarFragrances = async (id: string, limit: number = 10) => {
    const response = await fetch(`${baseURL}/api/fragrances/${id}/similar?limit=${limit}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  };

  const getPopularFragrances = async (limit: number = 20) => {
    const response = await fetch(`${baseURL}/api/fragrances/popular?limit=${limit}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  };

  const getBrandFragrances = async (brand: string, limit: number = 50) => {
    const response = await fetch(`${baseURL}/api/brands/${encodeURIComponent(brand)}/fragrances?limit=${limit}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  };

  const getServiceStats = async () => {
    const response = await fetch(`${baseURL}/api/stats`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  };

  return {
    searchFragrances,
    getFragranceDetails,
    getSimilarFragrances,
    getPopularFragrances,
    getBrandFragrances,
    getServiceStats
  };
};

// Export for usage
export {
  FragranceApplicationService,
  demonstrateHybridService,
  createExpressRoutes,
  useFragranceService
};

// Run demo if called directly
if (require.main === module) {
  demonstrateHybridService();
}
