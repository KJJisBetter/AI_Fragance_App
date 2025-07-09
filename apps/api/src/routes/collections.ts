import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@fragrance-battle/database';
import {
  CreateCollectionRequest,
  AddToCollectionRequest,
  CollectionWithItems,
  APIResponse
} from '@fragrance-battle/types';
import { validateBody, validateParams, collectionSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export default async function collectionsRoutes(app: FastifyInstance) {
  // Get user's collections
  app.get('/', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    const userId = request.user!.id;
    const page = Number(request.query.page) || 1;
    const limit = Math.min(Number(request.query.limit) || 20, 100);
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

    reply.send(response);
  });

  // Create new collection
  app.post('/', {
    preHandler: [authenticateToken, validateBody(collectionSchemas.create)]
  }, async (request: FastifyRequest<{ Body: CreateCollectionRequest }>, reply: FastifyReply) => {
    const userId = request.user!.id;
    const collectionData: CreateCollectionRequest = request.body;

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

    reply.status(201).send(response);
  });

  // Get collection by ID
  app.get('/:id', {
    preHandler: [authenticateToken, validateParams(collectionSchemas.getById)]
  }, async (request: FastifyRequest<{ Params: any }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user!.id;

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

    reply.send(response);
  });

  // Update collection
  app.put('/:id', {
    preHandler: [authenticateToken, validateParams(collectionSchemas.getById)]
  }, async (request: FastifyRequest<{ Params: any; Body: any }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user!.id;
    const { name, description } = request.body;

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

    reply.send(response);
  });

  // Delete collection
  app.delete('/:id', {
    preHandler: [authenticateToken, validateParams(collectionSchemas.getById)]
  }, async (request: FastifyRequest<{ Params: any }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user!.id;

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

    reply.send(response);
  });

  // Add fragrance to collection
  app.post('/:id/items', {
    preHandler: [authenticateToken, validateParams(collectionSchemas.getById), validateBody(collectionSchemas.addFragrance)]
  }, async (request: FastifyRequest<{ Params: any; Body: AddToCollectionRequest }>, reply: FastifyReply) => {
    const { id: collectionId } = request.params;
    const userId = request.user!.id;
    const itemData: AddToCollectionRequest = request.body;

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
    const existingItem = await prisma.collectionItem.findFirst({
      where: {
        collectionId,
        fragranceId: itemData.fragranceId
      }
    });

    if (existingItem) {
      throw createError('Fragrance already in collection', 400, 'ALREADY_EXISTS');
    }

    // Add to collection
    const collectionItem = await prisma.collectionItem.create({
      data: {
        collectionId,
        fragranceId: itemData.fragranceId,
        notes: itemData.notes
      },
      include: {
        fragrance: true
      }
    });

    const response: APIResponse<typeof collectionItem> = {
      success: true,
      data: collectionItem
    };

    reply.status(201).send(response);
  });

  // Remove fragrance from collection
  app.delete('/:id/items/:itemId', {
    preHandler: [authenticateToken, validateParams(collectionSchemas.getById)]
  }, async (request: FastifyRequest<{ Params: any }>, reply: FastifyReply) => {
    const { id: collectionId, itemId } = request.params;
    const userId = request.user!.id;

    // Check if collection exists and belongs to user
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, userId }
    });

    if (!collection) {
      throw createError('Collection not found', 404, 'NOT_FOUND');
    }

    // Check if item exists in collection
    const collectionItem = await prisma.collectionItem.findFirst({
      where: {
        id: itemId,
        collectionId
      }
    });

    if (!collectionItem) {
      throw createError('Item not found in collection', 404, 'NOT_FOUND');
    }

    // Remove from collection
    await prisma.collectionItem.delete({
      where: { id: itemId }
    });

    const response: APIResponse<{ message: string }> = {
      success: true,
      data: {
        message: 'Fragrance removed from collection'
      }
    };

    reply.send(response);
  });

  // Update collection item notes
  app.put('/:id/items/:itemId', {
    preHandler: [authenticateToken, validateParams(collectionSchemas.getById)]
  }, async (request: FastifyRequest<{ Params: any; Body: any }>, reply: FastifyReply) => {
    const { id: collectionId, itemId } = request.params;
    const userId = request.user!.id;
    const { notes } = request.body;

    // Check if collection exists and belongs to user
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, userId }
    });

    if (!collection) {
      throw createError('Collection not found', 404, 'NOT_FOUND');
    }

    // Check if item exists in collection
    const collectionItem = await prisma.collectionItem.findFirst({
      where: {
        id: itemId,
        collectionId
      }
    });

    if (!collectionItem) {
      throw createError('Item not found in collection', 404, 'NOT_FOUND');
    }

    // Update item notes
    const updatedItem = await prisma.collectionItem.update({
      where: { id: itemId },
      data: { notes },
      include: {
        fragrance: true
      }
    });

    const response: APIResponse<typeof updatedItem> = {
      success: true,
      data: updatedItem
    };

    reply.send(response);
  });

  // Get collection statistics
  app.get('/:id/stats', {
    preHandler: [authenticateToken, validateParams(collectionSchemas.getById)]
  }, async (request: FastifyRequest<{ Params: any }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user!.id;

    // Check if collection exists and belongs to user
    const collection = await prisma.collection.findFirst({
      where: { id, userId }
    });

    if (!collection) {
      throw createError('Collection not found', 404, 'NOT_FOUND');
    }

    const [
      totalItems,
      brandStats,
      yearStats,
      concentrationStats
    ] = await Promise.all([
      prisma.collectionItem.count({
        where: { collectionId: id }
      }),
      prisma.collectionItem.groupBy({
        by: ['fragranceId'],
        where: { collectionId: id },
        _count: true
      }).then(async (items) => {
        const fragranceIds = items.map(item => item.fragranceId);
        const fragrances = await prisma.fragrance.findMany({
          where: { id: { in: fragranceIds } },
          select: { id: true, brand: true }
        });

        const brandCounts: Record<string, number> = {};
        fragrances.forEach(fragrance => {
          brandCounts[fragrance.brand] = (brandCounts[fragrance.brand] || 0) + 1;
        });

        return Object.entries(brandCounts).map(([brand, count]) => ({
          brand,
          count
        }));
      }),
      prisma.collectionItem.groupBy({
        by: ['fragranceId'],
        where: { collectionId: id },
        _count: true
      }).then(async (items) => {
        const fragranceIds = items.map(item => item.fragranceId);
        const fragrances = await prisma.fragrance.findMany({
          where: { id: { in: fragranceIds } },
          select: { id: true, year: true }
        });

        const yearCounts: Record<string, number> = {};
        fragrances.forEach(fragrance => {
          if (fragrance.year) {
            const decade = Math.floor(fragrance.year / 10) * 10;
            const yearRange = `${decade}s`;
            yearCounts[yearRange] = (yearCounts[yearRange] || 0) + 1;
          }
        });

        return Object.entries(yearCounts).map(([year, count]) => ({
          year,
          count
        }));
      }),
      prisma.collectionItem.groupBy({
        by: ['fragranceId'],
        where: { collectionId: id },
        _count: true
      }).then(async (items) => {
        const fragranceIds = items.map(item => item.fragranceId);
        const fragrances = await prisma.fragrance.findMany({
          where: { id: { in: fragranceIds } },
          select: { id: true, concentration: true }
        });

        const concentrationCounts: Record<string, number> = {};
        fragrances.forEach(fragrance => {
          if (fragrance.concentration) {
            concentrationCounts[fragrance.concentration] = (concentrationCounts[fragrance.concentration] || 0) + 1;
          }
        });

        return Object.entries(concentrationCounts).map(([concentration, count]) => ({
          concentration,
          count
        }));
      })
    ]);

    const response: APIResponse<{
      totalItems: number;
      brandStats: Array<{ brand: string; count: number }>;
      yearStats: Array<{ year: string; count: number }>;
      concentrationStats: Array<{ concentration: string; count: number }>;
    }> = {
      success: true,
      data: {
        totalItems,
        brandStats,
        yearStats,
        concentrationStats
      }
    };

    reply.send(response);
  });
}
