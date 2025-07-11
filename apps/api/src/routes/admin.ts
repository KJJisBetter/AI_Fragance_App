/**
 * Admin API Routes
 *
 * Protected routes for system administration and monitoring
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@fragrance-battle/database';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { organicPopulationService } from '../services/organic-population-service';
import { log } from '../utils/logger';

export default async function adminRoutes(app: FastifyInstance) {
  // All admin routes require authentication
  app.addHook('preHandler', authenticateToken);

  /**
   * Get population statistics
   */
  app.get('/population-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await organicPopulationService.getPopulationStats();

      // Get additional database statistics
      const dbStats = await prisma.fragrance.aggregate({
        _count: true,
        _avg: {
          marketPriority: true,
          dataQuality: true,
          communityRating: true
        }
      });

      const growthStats = await prisma.fragrance.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      const purgeStats = await prisma.archivedFragrance.count();

      return reply.send({
        success: true,
        data: {
          ...stats,
          database: {
            totalFragrances: dbStats._count,
            avgMarketPriority: dbStats._avg.marketPriority?.toFixed(2),
            avgDataQuality: dbStats._avg.dataQuality?.toFixed(2),
            avgRating: dbStats._avg.communityRating?.toFixed(1),
            growthToday: growthStats,
            archivedCount: purgeStats
          }
        }
      });
    } catch (error: any) {
      log.error('Failed to get population stats:', error);
      throw createError(500, 'Failed to get statistics');
    }
  });

  /**
   * Get market coverage report
   */
  app.get('/market-coverage', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Detailed market coverage by brand tier
      const tier1Coverage = await prisma.fragrance.groupBy({
        by: ['brand'],
        where: {
          marketPriority: { gte: 0.9 }
        },
        _count: true,
        orderBy: {
          _count: {
            brand: 'desc'
          }
        }
      });

      const trendingBrands = await prisma.fragrance.groupBy({
        by: ['brand'],
        where: {
          trending: true
        },
        _count: true,
        orderBy: {
          _count: {
            brand: 'desc'
          }
        }
      });

      const demographicBreakdown = await prisma.fragrance.groupBy({
        by: ['targetDemographic'],
        _count: true,
        _avg: {
          marketPriority: true,
          communityRating: true
        }
      });

      return reply.send({
        success: true,
        data: {
          tier1Brands: tier1Coverage.map(b => ({
            brand: b.brand,
            count: b._count
          })),
          trendingBrands: trendingBrands.map(b => ({
            brand: b.brand,
            count: b._count
          })),
          demographics: demographicBreakdown.map(d => ({
            segment: d.targetDemographic || 'unassigned',
            count: d._count,
            avgPriority: d._avg.marketPriority?.toFixed(2),
            avgRating: d._avg.communityRating?.toFixed(1)
          }))
        }
      });
    } catch (error: any) {
      log.error('Failed to get market coverage:', error);
      throw createError(500, 'Failed to get market coverage');
    }
  });

  /**
   * Trigger manual purge (dry run)
   */
  app.post('/purge/dry-run', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { executePurge } = await import('../scripts/execute-purge');
      const stats = await executePurge(true); // Dry run

      return reply.send({
        success: true,
        data: {
          dryRun: true,
          ...stats
        }
      });
    } catch (error: any) {
      log.error('Dry run failed:', error);
      throw createError(500, 'Purge dry run failed');
    }
  });

  /**
   * Get data quality report
   */
  app.get('/data-quality', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const qualityStats = await prisma.fragrance.aggregate({
        where: {
          dataQuality: { gt: 0 }
        },
        _count: true,
        _avg: {
          dataQuality: true
        }
      });

      const namingIssues = await prisma.fragrance.count({
        where: {
          OR: [
            { hasRedundantName: true },
            { hasYearInName: true },
            { hasConcentrationInName: true }
          ]
        }
      });

      const highQuality = await prisma.fragrance.count({
        where: {
          dataQuality: { gte: 0.8 }
        }
      });

      const apiPromoted = await prisma.fragrance.count({
        where: {
          dataSource: 'perfumero_api_promoted'
        }
      });

      return reply.send({
        success: true,
        data: {
          overall: {
            count: qualityStats._count,
            avgQuality: qualityStats._avg.dataQuality?.toFixed(2)
          },
          highQualityCount: highQuality,
          namingIssuesCount: namingIssues,
          apiPromotedCount: apiPromoted,
          qualityPercentage: ((highQuality / qualityStats._count) * 100).toFixed(1)
        }
      });
    } catch (error: any) {
      log.error('Failed to get data quality report:', error);
      throw createError(500, 'Failed to get data quality report');
    }
  });
}
