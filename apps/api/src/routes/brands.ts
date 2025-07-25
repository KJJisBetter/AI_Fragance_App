/**
 * Brands API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@fragrance-battle/database';
import { optionalAuth } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { rateLimiters } from '../middleware/rateLimiter';
import { log } from '../utils/logger';

export default async function brandsRoutes(app: FastifyInstance) {
  /**
   * Get all brands organized alphabetically
   */
  app.get('/', {
    preHandler: [rateLimiters.general, optionalAuth]
  }, async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    const { letter } = request.query;

    try {
      // Get all brands with fragrance counts
      const brands = await prisma.fragrance.groupBy({
        by: ['brand'],
        _count: { brand: true },
        orderBy: { brand: 'asc' },
        where: letter ? {
          brand: {
            startsWith: letter.toUpperCase(),
            mode: 'insensitive'
          }
        } : undefined
      });

      // Organize by first letter
      const brandsByLetter: { [key: string]: Array<{ name: string; count: number }> } = {};
      const letters = new Set<string>();

      brands.forEach(brand => {
        const firstLetter = brand.brand.charAt(0).toUpperCase();
        letters.add(firstLetter);

        if (!brandsByLetter[firstLetter]) {
          brandsByLetter[firstLetter] = [];
        }

        brandsByLetter[firstLetter].push({
          name: brand.brand,
          count: brand._count.brand
        });
      });

      // Sort letters
      const sortedLetters = Array.from(letters).sort();

      reply.send({
        success: true,
        data: {
          brands: brandsByLetter,
          letters: sortedLetters,
          totalBrands: brands.length,
          filtered: !!letter,
          filterLetter: letter?.toUpperCase() || null
        }
      });
    } catch (error) {
      log.api.error('GET', '/brands', error as Error);
      throw error;
    }
  });

  /**
   * Get brand details with fragrances
   */
  app.get('/:brandName', {
    preHandler: [rateLimiters.general, optionalAuth]
  }, async (request: FastifyRequest<{ Params: any; Querystring: any }>, reply: FastifyReply) => {
    const { brandName } = request.params;
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = request.query;

    const offset = (page - 1) * limit;

    try {
      // Get brand fragrances
      const [fragrances, totalCount] = await Promise.all([
        prisma.fragrance.findMany({
          where: {
            brand: { equals: brandName, mode: 'insensitive' }
          },
          orderBy: { [sortBy]: sortOrder },
          skip: offset,
          take: limit
        }),
        prisma.fragrance.count({
          where: {
            brand: { equals: brandName, mode: 'insensitive' }
          }
        })
      ]);

      if (totalCount === 0) {
        throw createError(404, 'Brand not found');
      }

      const totalPages = Math.ceil(totalCount / limit);

      // Get brand statistics
      const brandStats = await prisma.fragrance.aggregate({
        where: {
          brand: { equals: brandName, mode: 'insensitive' }
        },
        _avg: {
          communityRating: true,
          popularityScore: true
        },
        _count: {
          id: true
        }
      });

      // Get top rated fragrances from this brand
      const topRated = await prisma.fragrance.findMany({
        where: {
          brand: { equals: brandName, mode: 'insensitive' },
          communityRating: { gt: 0 }
        },
        orderBy: { communityRating: 'desc' },
        take: 5
      });

      reply.send({
        success: true,
        data: {
          brand: {
            name: brandName,
            totalFragrances: brandStats._count.id,
            averageRating: brandStats._avg.communityRating,
            averagePopularity: brandStats._avg.popularityScore,
            topRated: topRated.map(f => ({
              id: f.id,
              name: f.name,
              year: f.year,
              communityRating: f.communityRating,
              popularityScore: f.popularityScore
            }))
          },
          fragrances: fragrances.map(f => ({
            id: f.id,
            name: f.name,
            brand: f.brand,
            year: f.year,
            concentration: f.concentration,
            communityRating: f.communityRating,
            popularityScore: f.popularityScore,
            verified: f.verified
          })),
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      log.api.error('GET', `/brands/${brandName}`, error as Error);
      throw error;
    }
  });
}
