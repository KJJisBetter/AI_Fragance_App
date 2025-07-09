import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '@fragrance-battle/database';
import { createContext } from './context';
import { searchService } from '../services/searchService';
import { formatFragrance } from '../utils/formatting';
import {
  fragranceSchemas,
  userSchemas,
  collectionSchemas,
  battleSchemas,
  aiSchemas
} from '../middleware/validation';

// Initialize tRPC
const t = initTRPC.context<typeof createContext>().create();

// Create reusable pieces
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    });
  }
  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Auth router
const authRouter = router({
  // Get current user
  me: protectedProcedure
    .query(async ({ ctx }) => {
      return { user: ctx.user };
    }),

  // Login
  login: publicProcedure
    .input(userSchemas.login)
    .mutation(async ({ input }) => {
      // Implementation would go here - for now return mock
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Login via tRPC not yet implemented'
      });
    }),
});

// Fragrances router
const fragrancesRouter = router({
  // Search fragrances
  search: publicProcedure
    .input(fragranceSchemas.search)
    .query(async ({ input, ctx }) => {
      const results = await searchService.search(input, ctx.user?.id);
      return {
        results: results.results.map(formatFragrance),
        total: results.total,
        query: input.query,
        filters: input.filters
      };
    }),

  // Get all fragrances with pagination
  getAll: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20),
      sortBy: z.enum(['name', 'brand', 'year', 'rating', 'popularity']).default('name'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }))
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

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
          orderBy,
          skip: offset,
          take: limit
        }),
        prisma.fragrance.count()
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        fragrances: fragrances.map(formatFragrance),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    }),

  // Get fragrance by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const fragrance = await prisma.fragrance.findUnique({
        where: { id: input.id },
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Fragrance not found'
        });
      }

      return {
        ...formatFragrance(fragrance),
        stats: {
          battlesParticipated: fragrance._count.battleItems,
          inCollections: fragrance._count.collections
        }
      };
    }),

  // Get popular fragrances
  getPopular: publicProcedure
    .input(z.object({
      limit: z.number().max(50).default(20)
    }))
    .query(async ({ input }) => {
      const fragrances = await prisma.fragrance.findMany({
        where: {
          relevanceScore: { gte: 60 }
        },
        orderBy: [
          { relevanceScore: 'desc' },
          { popularityScore: 'desc' },
          { communityRating: 'desc' }
        ],
        take: input.limit
      });

      return fragrances.map(formatFragrance);
    }),

  // Get random fragrances
  getRandom: publicProcedure
    .input(z.object({
      count: z.number().max(20).default(5)
    }))
    .query(async ({ input }) => {
      const totalCount = await prisma.fragrance.count();
      const randomSkip = Math.floor(Math.random() * Math.max(0, totalCount - input.count));

      const fragrances = await prisma.fragrance.findMany({
        skip: randomSkip,
        take: input.count,
        orderBy: { createdAt: 'desc' }
      });

      return fragrances.map(formatFragrance);
    }),

  // Get filters for fragrance search
  getFilters: publicProcedure
    .query(async () => {
      const [brands, years, concentrations] = await Promise.all([
        prisma.fragrance.findMany({
          select: { brand: true },
          distinct: ['brand'],
          orderBy: { brand: 'asc' }
        }),
        prisma.fragrance.findMany({
          select: { year: true },
          where: { year: { not: null } },
          distinct: ['year'],
          orderBy: { year: 'desc' }
        }),
        prisma.fragrance.findMany({
          select: { concentration: true },
          where: { concentration: { not: null } },
          distinct: ['concentration'],
          orderBy: { concentration: 'asc' }
        })
      ]);

      return {
        brands: brands.map(b => b.brand),
        years: years.map(y => y.year).filter(Boolean),
        concentrations: concentrations.map(c => c.concentration).filter(Boolean)
      };
    }),
});

// Collections router
const collectionsRouter = router({
  // Get user's collections
  getAll: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20)
    }))
    .query(async ({ input, ctx }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [collections, total] = await Promise.all([
        prisma.collection.findMany({
          where: { userId: ctx.user.id },
          include: {
            items: {
              include: {
                fragrance: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.collection.count({
          where: { userId: ctx.user.id }
        })
      ]);

      return {
        collections,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }),

  // Get collection by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const collection = await prisma.collection.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          items: {
            include: {
              fragrance: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found'
        });
      }

      return collection;
    }),

  // Create collection
  create: protectedProcedure
    .input(collectionSchemas.create)
    .mutation(async ({ input, ctx }) => {
      const collection = await prisma.collection.create({
        data: {
          userId: ctx.user.id,
          ...input
        },
        include: {
          items: {
            include: {
              fragrance: true
            }
          }
        }
      });

      return collection;
    }),
});

// Users router
const usersRouter = router({
  // Get user analytics
  getAnalytics: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      // Get user's collection count
      const totalFragrances = await prisma.collectionItem.count({
        where: {
          collection: {
            userId
          }
        }
      });

      // Get user's battle count
      const totalBattles = await prisma.battle.count({
        where: { userId }
      });

      // Get user's fragrance ratings
      const collectionItems = await prisma.collectionItem.findMany({
        where: {
          collection: {
            userId
          },
          personalRating: { not: null }
        },
        select: {
          personalRating: true,
          fragrance: {
            select: {
              brand: true,
              aiSeasons: true,
              aiOccasions: true
            }
          }
        }
      });

      // Calculate average rating
      const averageRating = collectionItems.length > 0
        ? collectionItems.reduce((sum, item) => sum + (item.personalRating || 0), 0) / collectionItems.length
        : 0;

      return {
        totalFragrances,
        totalBattles,
        averageRating,
        totalRatings: collectionItems.length
      };
    }),

  // Get user profile
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true,
          updatedAt: true,
          collections: {
            select: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
              _count: {
                select: {
                  items: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      return user;
    }),

  // Update profile
  updateProfile: protectedProcedure
    .input(z.object({
      username: z.string().optional(),
      email: z.string().email().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const updatedUser = await prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return updatedUser;
    }),

  // Get user favorites
  getFavorites: protectedProcedure
    .input(z.object({
      limit: z.number().max(50).default(10)
    }))
    .query(async ({ input, ctx }) => {
      const favorites = await prisma.collectionItem.findMany({
        where: {
          collection: { userId: ctx.user.id },
          personalRating: { gte: 8 }
        },
        include: {
          fragrance: true
        },
        orderBy: [
          { personalRating: 'desc' },
          { createdAt: 'desc' }
        ],
        take: input.limit
      });

      return favorites;
    }),
});

// Main app router
export const appRouter = router({
  auth: authRouter,
  fragrances: fragrancesRouter,
  collections: collectionsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
