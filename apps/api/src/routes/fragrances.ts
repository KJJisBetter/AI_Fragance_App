import express from 'express';
import { prisma } from '@fragrance-battle/database';
import {
  CreateFragranceRequest,
  UpdateFragranceRequest,
  FragranceSearchRequest,
  FragranceSearchResponse,
  APIResponse,
  Fragrance
} from '@fragrance-battle/types';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validation';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

// Get all fragrances with optional filters
router.get('/', optionalAuth, validateQuery(schemas.pagination), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'asc',
    brand,
    season,
    occasion,
    mood,
    yearFrom,
    yearTo,
    concentration,
    verified
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  // Build where clause
  const where: any = {};

  if (brand) where.brand = { contains: brand as string, mode: 'insensitive' };
  if (season) where.aiSeasons = { has: season as string };
  if (occasion) where.aiOccasions = { has: occasion as string };
  if (mood) where.aiMoods = { has: mood as string };
  if (concentration) where.concentration = concentration as string;
  if (verified !== undefined) where.verified = verified === 'true';

  if (yearFrom || yearTo) {
    where.year = {};
    if (yearFrom) where.year.gte = Number(yearFrom);
    if (yearTo) where.year.lte = Number(yearTo);
  }

  // Build orderBy clause
  const orderBy: any = {};
  if (sortBy === 'rating') {
    orderBy.communityRating = sortOrder;
  } else {
    orderBy[sortBy as string] = sortOrder;
  }

  // Get fragrances and total count
  const [fragrances, total] = await Promise.all([
    prisma.fragrance.findMany({
      where,
      orderBy,
      skip,
      take: Number(limit)
    }),
    prisma.fragrance.count({ where })
  ]);

  const response: APIResponse<FragranceSearchResponse> = {
    success: true,
    data: {
      fragrances,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  };

  res.json(response);
}));

// Search fragrances
router.post('/search', optionalAuth, validate(schemas.searchFragrances), asyncHandler(async (req, res) => {
  const searchRequest: FragranceSearchRequest = req.body;
  const {
    query,
    filters = {},
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'asc'
  } = searchRequest;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  // Text search
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { brand: { contains: query, mode: 'insensitive' } },
      { topNotes: { hasSome: [query] } },
      { middleNotes: { hasSome: [query] } },
      { baseNotes: { hasSome: [query] } }
    ];
  }

  // Apply filters
  if (filters.brand) where.brand = { contains: filters.brand, mode: 'insensitive' };
  if (filters.season) where.aiSeasons = { has: filters.season };
  if (filters.occasion) where.aiOccasions = { has: filters.occasion };
  if (filters.mood) where.aiMoods = { has: filters.mood };
  if (filters.concentration) where.concentration = filters.concentration;
  if (filters.verified !== undefined) where.verified = filters.verified;

  if (filters.yearFrom || filters.yearTo) {
    where.year = {};
    if (filters.yearFrom) where.year.gte = filters.yearFrom;
    if (filters.yearTo) where.year.lte = filters.yearTo;
  }

  // Build orderBy clause
  const orderBy: any = {};
  if (sortBy === 'rating') {
    orderBy.communityRating = sortOrder;
  } else {
    orderBy[sortBy] = sortOrder;
  }

  // Get fragrances and total count
  const [fragrances, total] = await Promise.all([
    prisma.fragrance.findMany({
      where,
      orderBy,
      skip,
      take: limit
    }),
    prisma.fragrance.count({ where })
  ]);

  const response: APIResponse<FragranceSearchResponse> = {
    success: true,
    data: {
      fragrances,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Get fragrance by ID
router.get('/:id', optionalAuth, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const fragrance = await prisma.fragrance.findUnique({
    where: { id },
    include: {
      feedbacks: {
        select: {
          id: true,
          feedbackType: true,
          aiSuggestion: true,
          userCorrection: true,
          createdAt: true
        }
      }
    }
  });

  if (!fragrance) {
    throw createError('Fragrance not found', 404, 'NOT_FOUND');
  }

  const response: APIResponse<Fragrance> = {
    success: true,
    data: fragrance
  };

  res.json(response);
}));

// Create new fragrance
router.post('/', authenticateToken, validate(schemas.createFragrance), asyncHandler(async (req, res) => {
  const fragranceData: CreateFragranceRequest = req.body;

  // Check if fragrance already exists
  const existingFragrance = await prisma.fragrance.findFirst({
    where: {
      AND: [
        { name: { equals: fragranceData.name, mode: 'insensitive' } },
        { brand: { equals: fragranceData.brand, mode: 'insensitive' } }
      ]
    }
  });

  if (existingFragrance) {
    throw createError('Fragrance already exists', 400, 'FRAGRANCE_EXISTS');
  }

  // Create fragrance
  const fragrance = await prisma.fragrance.create({
    data: {
      ...fragranceData,
      aiSeasons: [],
      aiOccasions: [],
      aiMoods: [],
      fragranticaSeasons: [],
      verified: false
    }
  });

  const response: APIResponse<Fragrance> = {
    success: true,
    data: fragrance
  };

  res.status(201).json(response);
}));

// Update fragrance
router.put('/:id', authenticateToken, validateParams(schemas.id), validate(schemas.updateFragrance), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData: UpdateFragranceRequest = req.body;

  // Check if fragrance exists
  const existingFragrance = await prisma.fragrance.findUnique({
    where: { id }
  });

  if (!existingFragrance) {
    throw createError('Fragrance not found', 404, 'NOT_FOUND');
  }

  // Check if name/brand combination already exists (excluding current fragrance)
  if (updateData.name || updateData.brand) {
    const duplicateCheck = await prisma.fragrance.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            name: { equals: updateData.name || existingFragrance.name, mode: 'insensitive' },
            brand: { equals: updateData.brand || existingFragrance.brand, mode: 'insensitive' }
          }
        ]
      }
    });

    if (duplicateCheck) {
      throw createError('Fragrance with this name and brand already exists', 400, 'FRAGRANCE_EXISTS');
    }
  }

  // Update fragrance
  const updatedFragrance = await prisma.fragrance.update({
    where: { id },
    data: {
      ...updateData,
      updatedAt: new Date()
    }
  });

  const response: APIResponse<Fragrance> = {
    success: true,
    data: updatedFragrance
  };

  res.json(response);
}));

// Delete fragrance
router.delete('/:id', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if fragrance exists
  const existingFragrance = await prisma.fragrance.findUnique({
    where: { id }
  });

  if (!existingFragrance) {
    throw createError('Fragrance not found', 404, 'NOT_FOUND');
  }

  // Delete fragrance (cascade will handle related records)
  await prisma.fragrance.delete({
    where: { id }
  });

  const response: APIResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Fragrance deleted successfully'
    }
  };

  res.json(response);
}));

// Get popular fragrances
router.get('/popular/trending', optionalAuth, asyncHandler(async (req, res) => {
  const popularFragrances = await prisma.fragrance.findMany({
    where: {
      communityRating: { gt: 4.0 }
    },
    orderBy: [
      { communityRating: 'desc' },
      { createdAt: 'desc' }
    ],
    take: 10
  });

  const response: APIResponse<Fragrance[]> = {
    success: true,
    data: popularFragrances
  };

  res.json(response);
}));

// Get random fragrances
router.get('/random/discover', optionalAuth, asyncHandler(async (req, res) => {
  const count = Math.min(Number(req.query.count) || 6, 20);

  // Get total count
  const totalCount = await prisma.fragrance.count();

  // Get random fragrances
  const randomFragrances = await prisma.fragrance.findMany({
    skip: Math.floor(Math.random() * (totalCount - count)),
    take: count,
    orderBy: { createdAt: 'desc' }
  });

  const response: APIResponse<Fragrance[]> = {
    success: true,
    data: randomFragrances
  };

  res.json(response);
}));

// Get fragrances by brand
router.get('/brands/:brand', optionalAuth, validateParams({
  brand: schemas.id.extract('id')
}), asyncHandler(async (req, res) => {
  const { brand } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [fragrances, total] = await Promise.all([
    prisma.fragrance.findMany({
      where: {
        brand: { equals: brand, mode: 'insensitive' }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    }),
    prisma.fragrance.count({
      where: {
        brand: { equals: brand, mode: 'insensitive' }
      }
    })
  ]);

  const response: APIResponse<FragranceSearchResponse> = {
    success: true,
    data: {
      fragrances,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

export default router;
