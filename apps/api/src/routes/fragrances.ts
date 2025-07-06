import express, { Request, Response } from 'express';
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
import { formatFragrance, formatBrandName } from '../utils/formatting';
import { searchRateLimiter, generalRateLimiter } from '../middleware/rateLimiter';
import { generateSearchVariations, normalizeSearchTerm, buildSmartSearchQuery } from '../utils/searchNormalization';

const router = express.Router();

// Simple in-memory cache for filter options
let filterOptionsCache: any = null;
let filterOptionsCacheTime = 0;
const FILTER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get all fragrances with optional filters
router.get('/', generalRateLimiter, optionalAuth, validateQuery(schemas.fragranceFilters), asyncHandler(async (req: Request, res: Response) => {
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
  const [rawFragrances, total] = await Promise.all([
    prisma.fragrance.findMany({
      where,
      orderBy,
      skip,
      take: Number(limit)
    }),
    prisma.fragrance.count({ where })
  ]);

  // Format the fragrances
  const fragrances = rawFragrances.map(formatFragrance);

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
router.post('/search', searchRateLimiter, optionalAuth, validate(schemas.searchFragrances), asyncHandler(async (req: Request, res: Response) => {
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

  // Get all brands for smart abbreviation generation
  const allBrandsResult = await prisma.fragrance.findMany({
    select: { brand: true },
    distinct: ['brand']
  });
  const allBrands = allBrandsResult.map(item => item.brand);

  // Smart search with variations
  if (query && typeof query === 'string') {
    const smartConditions = buildSmartSearchQuery(query, allBrands);
    where.OR = smartConditions;
  } else if (query === '') {
    // Handle empty query gracefully - return error but don't crash
    const response = {
      success: false,
      error: 'Search query cannot be empty'
    };
    return res.status(400).json(response);
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
  const [rawFragrances, total] = await Promise.all([
    prisma.fragrance.findMany({
      where,
      orderBy,
      skip,
      take: limit
    }),
    prisma.fragrance.count({ where })
  ]);

  // Format the fragrances
  const fragrances = rawFragrances.map(formatFragrance);

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

// Get available filter options from database
router.get('/filters', generalRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  try {
    // Check cache first
    const now = Date.now();
    if (filterOptionsCache && now - filterOptionsCacheTime < FILTER_CACHE_DURATION) {
      return res.json({
        success: true,
        data: filterOptionsCache
      });
    }

    // Get all fragrances to extract unique filter values
    const fragrances = await prisma.fragrance.findMany({
      select: {
        brand: true,
        aiSeasons: true,
        aiOccasions: true,
        aiMoods: true,
        concentration: true,
        year: true
      }
    });

    // Extract unique values
    const brands = new Set<string>();
    const seasons = new Set<string>();
    const occasions = new Set<string>();
    const moods = new Set<string>();
    const concentrations = new Set<string>();
    let minYear = Infinity;
    let maxYear = -Infinity;

    fragrances.forEach(f => {
      if (f.brand) brands.add(f.brand);
      if (f.aiSeasons) f.aiSeasons.forEach(s => seasons.add(s));
      if (f.aiOccasions) f.aiOccasions.forEach(o => occasions.add(o));
      if (f.aiMoods) f.aiMoods.forEach(m => moods.add(m));
      if (f.concentration) concentrations.add(f.concentration);
      if (f.year) {
        minYear = Math.min(minYear, f.year);
        maxYear = Math.max(maxYear, f.year);
      }
    });

    // Sort brands by frequency (get top brands for initial display)
    const brandCounts = await prisma.fragrance.groupBy({
      by: ['brand'],
      _count: { brand: true },
      orderBy: { _count: { brand: 'desc' } },
      take: 20 // Reduced to 20 for initial display
    });

    // Format brand names
    const formattedBrands = brandCounts.map(b => formatBrandName(b.brand));

    const filterData = {
      brands: formattedBrands,
      seasons: [...seasons].sort(),
      occasions: [...occasions].sort(),
      moods: [...moods].sort(),
      concentrations: [...concentrations].sort(),
      yearRange: {
        min: minYear === Infinity ? 1900 : minYear,
        max: maxYear === -Infinity ? new Date().getFullYear() : maxYear
      }
    };

    // Cache the results
    filterOptionsCache = filterData;
    filterOptionsCacheTime = now;

    const response: APIResponse<typeof filterData> = {
      success: true,
      data: filterData
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting filter options:', error);
    throw createError('Failed to get filter options', 500, 'INTERNAL_ERROR');
  }
}));

// Search brands dynamically
router.get('/brands/search', searchRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { q: query, limit = 10 } = req.query;

  if (!query || typeof query !== 'string') {
    return res.json({
      success: true,
      data: { brands: [] }
    });
  }

  try {
    // Search for brands that contain the query string
    const brands = await prisma.fragrance.groupBy({
      by: ['brand'],
      _count: { brand: true },
      where: {
        brand: {
          contains: query,
          mode: 'insensitive'
        }
      },
      orderBy: [
        { _count: { brand: 'desc' } }, // Most popular first
        { brand: 'asc' } // Then alphabetical
      ],
      take: Number(limit)
    });

    // Format brand names but keep original for filtering
    const formattedBrands = brands.map(b => ({
      name: formatBrandName(b.brand),
      originalName: b.brand, // Keep original for filtering
      count: b._count.brand
    }));

    const response: APIResponse<{
      brands: Array<{ name: string; originalName: string; count: number }>;
    }> = {
      success: true,
      data: {
        brands: formattedBrands
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error searching brands:', error);
    throw createError('Failed to search brands', 500, 'INTERNAL_ERROR');
  }
}));

// Test smart search normalization (development only)
router.get('/test-search-normalization', asyncHandler(async (req: Request, res: Response) => {
  const { query: searchTerm } = req.query;

  if (!searchTerm || typeof searchTerm !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Query parameter required'
    });
  }

  const variations = generateSearchVariations(searchTerm);
  const normalized = normalizeSearchTerm(searchTerm);

  const response = {
    success: true,
    data: {
      original: searchTerm,
      normalized,
      variations,
      searchWould: {
        variations: variations.length,
        conditions: variations.length * 2 // Each variation searches name + brand
      }
    }
  };

  res.json(response);
}));

// Get fragrance by ID
router.get('/:id', optionalAuth, validateParams(schemas.id), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const rawFragrance = await prisma.fragrance.findUnique({
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

  if (!rawFragrance) {
    throw createError('Fragrance not found', 404, 'NOT_FOUND');
  }

  // Format the fragrance
  const fragrance = formatFragrance(rawFragrance);

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
