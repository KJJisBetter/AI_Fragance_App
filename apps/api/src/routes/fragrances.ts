/**
 * Fragrances API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@fragrance-battle/database';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { formatFragrance } from '../utils/formatting';
import { rateLimiters } from '../middleware/rateLimiter';
import { validateBody, validateQuery, validateParams, fragranceSchemas } from '../middleware/validation';
import { searchService } from '../services/searchService';
import { organicPopulationService } from '../services/organic-population-service';
import { config } from '../config';
import { log } from '../utils/logger';

export default async function fragrancesRoutes(app: FastifyInstance) {
  /**
   * Search fragrances with smart API population
   */
  app.post('/search', {
    preHandler: [rateLimiters.search, optionalAuth, validateBody(fragranceSchemas.search)]
  },
    async (request: FastifyRequest, reply: FastifyReply) => {
      console.log('🔍 Raw request body:', request.body);
      const { query, filters, page, limit, sortBy, sortOrder } = request.body as any;
      const userId = (request as any).userId;

      try {
        // Calculate pagination
        const offset = (page - 1) * limit;

        console.log('🔍 Search API - Pagination params:', { page, limit, offset });

        // Use organic population service for market-intelligent search with pagination
        const results = await organicPopulationService.searchWithOrganicPopulation(
          query || '',
          filters,
          { limit, offset }
        );

        console.log('🔍 Search API - Results:', { resultsCount: results.length, limit, offset });

        // Get total count for pagination (we need to do a separate count query)
        const totalCount = await organicPopulationService.getSearchCount(query || '', filters);
        const totalPages = Math.ceil(totalCount / limit);

        // Track search for analytics
        if (userId) {
          await searchService.trackUserSearch(userId, query, filters);
        }

        return reply.send({
          success: true,
          fragrances: results,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalCount: totalCount,
            totalPages: totalPages,
            hasMore: page < totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          },
          source: results.length > 0 ? 'hybrid' : 'not_found',
          populatedFromAPI: results.some(r => r.isApiOnly),
          marketIntelligence: {
            tier1Results: results.filter(r => (r.marketPriority || 0) >= 0.9).length,
            trendingResults: results.filter(r => r.trending).length,
            targetDemographics: [...new Set(results.map(r => r.targetDemographic).filter(Boolean))]
          }
        });

      } catch (error: any) {
        log.error('Search error:', error);
        throw createError(500, 'Search failed', { error: error.message });
      }
    }
  );

  /**
   * Get all fragrances
   */
  app.get('/', {
    preHandler: [rateLimiters.general, optionalAuth]
  }, async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
      // Filter parameters
      brand,
      concentration,
      verified,
      yearFrom,
      yearTo,
      season,
      occasion,
      mood
    } = request.query;

    // Convert strings to integers
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions from filters
    const whereConditions: any = {};

    if (brand) {
      whereConditions.brand = { contains: brand, mode: 'insensitive' };
    }

    if (concentration) {
      whereConditions.concentration = { equals: concentration, mode: 'insensitive' };
    }

    if (verified !== undefined) {
      whereConditions.verified = verified === 'true';
    }

    if (yearFrom) {
      whereConditions.year = { ...whereConditions.year, gte: parseInt(yearFrom as string, 10) };
    }

    if (yearTo) {
      whereConditions.year = { ...whereConditions.year, lte: parseInt(yearTo as string, 10) };
    }

    // Note: season, occasion, mood would need to be added to the database schema
    // For now, we'll ignore them but they're here for future implementation

    const orderBy: any = {};
    if (sortBy === 'rating') {
      orderBy.communityRating = sortOrder;
    } else if (sortBy === 'popularity') {
      orderBy.popularityScore = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [fragrances, totalCount] = await Promise.all([
      prisma.fragrance.findMany({
        where: whereConditions,
        orderBy,
        skip: offset,
        take: limitNum
      }),
      prisma.fragrance.count({
        where: whereConditions
      })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    reply.send({
      success: true,
      data: {
        fragrances: fragrances.map(formatFragrance),
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  });

  /**
   * Get filters
   */
  app.get('/filters', {
    preHandler: [rateLimiters.general, optionalAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const brands = await prisma.fragrance.groupBy({
      by: ['brand'],
      _count: { brand: true },
      orderBy: { _count: { brand: 'desc' } },
      take: 50
    });

    const concentrations = await prisma.fragrance.groupBy({
      by: ['concentration'],
      where: { concentration: { not: null } },
      _count: { concentration: true },
      orderBy: { _count: { concentration: 'desc' } }
    });

    reply.send({
      success: true,
      data: {
        brands: brands.map(b => ({ name: b.brand, count: b._count.brand })),
        concentrations: concentrations.map(c => ({
          name: c.concentration,
          count: c._count.concentration
        })),
        seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
        occasions: ['Casual', 'Formal', 'Date', 'Work', 'Party'],
        moods: ['Fresh', 'Warm', 'Mysterious', 'Elegant', 'Bold']
      }
    });
  });

  /**
   * Search brands for autocomplete
   */
  app.get('/brands/search', {
    preHandler: [rateLimiters.general, optionalAuth]
  }, async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    const { q: query, limit = 10 } = request.query;

    if (!query || typeof query !== 'string') {
      return reply.send({
        success: true,
        data: { brands: [] }
      });
    }

    try {
      const brands = await prisma.fragrance.groupBy({
        by: ['brand'],
        where: {
          brand: {
            contains: query,
            mode: 'insensitive'
          }
        },
        _count: { brand: true },
        orderBy: { _count: { brand: 'desc' } },
        take: parseInt(limit as string, 10) || 10
      });

      const formattedBrands = brands.map(brand => ({
        name: brand.brand,
        originalName: brand.brand, // Keep original for filtering
        count: brand._count.brand
      }));

      reply.send({
        success: true,
        data: { brands: formattedBrands }
      });
    } catch (error) {
      log.api.error('GET', '/fragrances/brands/search', error as Error);
      throw error;
    }
  });

  /**
   * Get fragrance by ID
   */
  app.get('/:id', {
    preHandler: [rateLimiters.general, optionalAuth, validateParams(fragranceSchemas.getById)]
  }, async (request: FastifyRequest<{ Params: any }>, reply: FastifyReply) => {
    const { id } = request.params;

    const fragrance = await prisma.fragrance.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            battleItems: true,
            collections: true
          }
        }
      }
    });

    if (!fragrance) {
      throw createError(404, 'Fragrance not found');
    }

    const formattedFragrance = {
      ...formatFragrance(fragrance),
      stats: {
        battlesParticipated: fragrance._count.battleItems,
        inCollections: fragrance._count.collections
      }
    };

    reply.send({
      success: true,
      data: formattedFragrance
    });
  });
}
