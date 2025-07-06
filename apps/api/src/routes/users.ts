import express from 'express';
import { prisma } from '@fragrance-battle/database';
import { UserAnalytics, APIResponse } from '@fragrance-battle/types';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user analytics
router.get('/analytics', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

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

  // Get favorite seasons (most common in collection)
  const seasonCounts: Record<string, number> = {};
  collectionItems.forEach(item => {
    item.fragrance.aiSeasons.forEach(season => {
      seasonCounts[season] = (seasonCounts[season] || 0) + 1;
    });
  });
  const favoriteSeasons = Object.entries(seasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([season]) => season);

  // Get favorite occasions
  const occasionCounts: Record<string, number> = {};
  collectionItems.forEach(item => {
    item.fragrance.aiOccasions.forEach(occasion => {
      occasionCounts[occasion] = (occasionCounts[occasion] || 0) + 1;
    });
  });
  const favoriteOccasions = Object.entries(occasionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([occasion]) => occasion);

  // Get most used brands
  const brandCounts: Record<string, number> = {};
  collectionItems.forEach(item => {
    const brand = item.fragrance.brand;
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });
  const mostUsedBrands = Object.entries(brandCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([brand]) => brand);

  const analytics: UserAnalytics = {
    totalFragrances,
    totalBattles,
    favoriteSeasons,
    favoriteOccasions,
    averageRating: Math.round(averageRating * 10) / 10,
    mostUsedBrands
  };

  const response: APIResponse<UserAnalytics> = {
    success: true,
    data: analytics
  };

  res.json(response);
}));

// Get user profile with extended info
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
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
      },
      battles: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          completedAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      feedbacks: {
        select: {
          id: true,
          feedbackType: true,
          createdAt: true,
          fragrance: {
            select: {
              name: true,
              brand: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404, 'NOT_FOUND');
  }

  const response: APIResponse<typeof user> = {
    success: true,
    data: user
  };

  res.json(response);
}));

// Update user profile
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { username, email } = req.body;

  // Validation
  if (username && (typeof username !== 'string' || username.length < 3)) {
    throw createError('Username must be at least 3 characters', 400, 'VALIDATION_ERROR');
  }

  if (email && (typeof email !== 'string' || !email.includes('@'))) {
    throw createError('Invalid email format', 400, 'VALIDATION_ERROR');
  }

  // Check if username/email already exists (excluding current user)
  if (username || email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              username ? { username } : {},
              email ? { email } : {}
            ].filter(condition => Object.keys(condition).length > 0)
          }
        ]
      }
    });

    if (existingUser) {
      throw createError(
        existingUser.username === username ? 'Username already exists' : 'Email already exists',
        400,
        'USER_EXISTS'
      );
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username && { username }),
      ...(email && { email })
    },
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const response: APIResponse<typeof updatedUser> = {
    success: true,
    data: updatedUser
  };

  res.json(response);
}));

// Get user's activity feed
router.get('/activity', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  // Get recent activities
  const [recentCollectionItems, recentBattles, recentFeedbacks] = await Promise.all([
    prisma.collectionItem.findMany({
      where: {
        collection: { userId }
      },
      include: {
        fragrance: {
          select: { name: true, brand: true }
        },
        collection: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.battle.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        completedAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.aICategorFeedback.findMany({
      where: { userId },
      include: {
        fragrance: {
          select: { name: true, brand: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  // Combine and sort activities
  const activities = [
    ...recentCollectionItems.map(item => ({
      type: 'collection_add',
      timestamp: item.createdAt,
      data: {
        fragrance: item.fragrance,
        collection: item.collection,
        rating: item.personalRating
      }
    })),
    ...recentBattles.map(battle => ({
      type: 'battle_created',
      timestamp: battle.createdAt,
      data: {
        battleId: battle.id,
        title: battle.title,
        status: battle.status,
        completedAt: battle.completedAt
      }
    })),
    ...recentFeedbacks.map(feedback => ({
      type: 'ai_feedback',
      timestamp: feedback.createdAt,
      data: {
        fragrance: feedback.fragrance,
        feedbackType: feedback.feedbackType
      }
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Paginate
  const startIndex = (page - 1) * limit;
  const paginatedActivities = activities.slice(startIndex, startIndex + limit);

  const response: APIResponse<{
    activities: typeof paginatedActivities;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> = {
    success: true,
    data: {
      activities: paginatedActivities,
      total: activities.length,
      page,
      limit,
      totalPages: Math.ceil(activities.length / limit)
    }
  };

  res.json(response);
}));

// Get user's favorite fragrances (highest rated)
router.get('/favorites', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const favorites = await prisma.collectionItem.findMany({
    where: {
      collection: { userId },
      personalRating: { gte: 8 } // High rated fragrances
    },
    include: {
      fragrance: true
    },
    orderBy: [
      { personalRating: 'desc' },
      { createdAt: 'desc' }
    ],
    take: limit
  });

  const response: APIResponse<typeof favorites> = {
    success: true,
    data: favorites
  };

  res.json(response);
}));

export default router;
