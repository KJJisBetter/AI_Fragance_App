import express from 'express';
import { prisma } from '@fragrance-battle/database';
import {
  CreateCollectionRequest,
  AddToCollectionRequest,
  CollectionWithItems,
  APIResponse
} from '@fragrance-battle/types';
import { validate, validateParams, schemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user's collections
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [collections, total] = await Promise.all([
    prisma.collection.findMany({
      where: { userId },
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
      where: { userId }
    })
  ]);

  const response: APIResponse<{
    collections: CollectionWithItems[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> = {
    success: true,
    data: {
      collections,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Create new collection
router.post('/', authenticateToken, validate(schemas.createCollection), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const collectionData: CreateCollectionRequest = req.body;

  const collection = await prisma.collection.create({
    data: {
      userId,
      ...collectionData
    },
    include: {
      items: {
        include: {
          fragrance: true
        }
      }
    }
  });

  const response: APIResponse<CollectionWithItems> = {
    success: true,
    data: collection
  };

  res.status(201).json(response);
}));

// Get collection by ID
router.get('/:id', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const collection = await prisma.collection.findFirst({
    where: { id, userId },
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
    throw createError('Collection not found', 404, 'NOT_FOUND');
  }

  const response: APIResponse<CollectionWithItems> = {
    success: true,
    data: collection
  };

  res.json(response);
}));

// Update collection
router.put('/:id', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { name, description } = req.body;

  // Check if collection exists and belongs to user
  const existingCollection = await prisma.collection.findFirst({
    where: { id, userId }
  });

  if (!existingCollection) {
    throw createError('Collection not found', 404, 'NOT_FOUND');
  }

  const updatedCollection = await prisma.collection.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description })
    },
    include: {
      items: {
        include: {
          fragrance: true
        }
      }
    }
  });

  const response: APIResponse<CollectionWithItems> = {
    success: true,
    data: updatedCollection
  };

  res.json(response);
}));

// Delete collection
router.delete('/:id', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if collection exists and belongs to user
  const existingCollection = await prisma.collection.findFirst({
    where: { id, userId }
  });

  if (!existingCollection) {
    throw createError('Collection not found', 404, 'NOT_FOUND');
  }

  await prisma.collection.delete({
    where: { id }
  });

  const response: APIResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Collection deleted successfully'
    }
  };

  res.json(response);
}));

// Add fragrance to collection
router.post('/:id/items', authenticateToken, validateParams(schemas.id), validate(schemas.addToCollection), asyncHandler(async (req, res) => {
  const { id: collectionId } = req.params;
  const userId = req.user!.id;
  const itemData: AddToCollectionRequest = req.body;

  // Check if collection exists and belongs to user
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId }
  });

  if (!collection) {
    throw createError('Collection not found', 404, 'NOT_FOUND');
  }

  // Check if fragrance exists
  const fragrance = await prisma.fragrance.findUnique({
    where: { id: itemData.fragranceId }
  });

  if (!fragrance) {
    throw createError('Fragrance not found', 404, 'NOT_FOUND');
  }

  // Check if fragrance is already in collection
  const existingItem = await prisma.collectionItem.findUnique({
    where: {
      collectionId_fragranceId: {
        collectionId,
        fragranceId: itemData.fragranceId
      }
    }
  });

  if (existingItem) {
    throw createError('Fragrance already in collection', 400, 'DUPLICATE_ITEM');
  }

  // Add fragrance to collection
  const collectionItem = await prisma.collectionItem.create({
    data: {
      collectionId,
      fragranceId: itemData.fragranceId,
      personalRating: itemData.personalRating,
      personalNotes: itemData.personalNotes,
      bottleSize: itemData.bottleSize
    },
    include: {
      fragrance: true
    }
  });

  const response: APIResponse<typeof collectionItem> = {
    success: true,
    data: collectionItem
  };

  res.status(201).json(response);
}));

// Update collection item
router.put('/:id/items/:itemId', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id: collectionId, itemId } = req.params;
  const userId = req.user!.id;
  const { personalRating, personalNotes, bottleSize } = req.body;

  // Check if collection exists and belongs to user
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId }
  });

  if (!collection) {
    throw createError('Collection not found', 404, 'NOT_FOUND');
  }

  // Check if item exists in collection
  const existingItem = await prisma.collectionItem.findFirst({
    where: {
      id: itemId,
      collectionId
    }
  });

  if (!existingItem) {
    throw createError('Collection item not found', 404, 'NOT_FOUND');
  }

  // Update item
  const updatedItem = await prisma.collectionItem.update({
    where: { id: itemId },
    data: {
      ...(personalRating !== undefined && { personalRating }),
      ...(personalNotes !== undefined && { personalNotes }),
      ...(bottleSize !== undefined && { bottleSize })
    },
    include: {
      fragrance: true
    }
  });

  const response: APIResponse<typeof updatedItem> = {
    success: true,
    data: updatedItem
  };

  res.json(response);
}));

// Remove fragrance from collection
router.delete('/:id/items/:itemId', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id: collectionId, itemId } = req.params;
  const userId = req.user!.id;

  // Check if collection exists and belongs to user
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId }
  });

  if (!collection) {
    throw createError('Collection not found', 404, 'NOT_FOUND');
  }

  // Check if item exists in collection
  const existingItem = await prisma.collectionItem.findFirst({
    where: {
      id: itemId,
      collectionId
    }
  });

  if (!existingItem) {
    throw createError('Collection item not found', 404, 'NOT_FOUND');
  }

  // Remove item from collection
  await prisma.collectionItem.delete({
    where: { id: itemId }
  });

  const response: APIResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Fragrance removed from collection'
    }
  };

  res.json(response);
}));

export default router;
