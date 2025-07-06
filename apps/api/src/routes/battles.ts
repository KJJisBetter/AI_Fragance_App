import express from 'express';
import { prisma } from '@fragrance-battle/database';
import { BattleStatus } from '@fragrance-battle/database';
import {
  CreateBattleRequest,
  VoteBattleRequest,
  BattleWithItems,
  APIResponse
} from '@fragrance-battle/types';
import { validate, validateParams, schemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user's battles
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [battles, total] = await Promise.all([
    prisma.battle.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            fragrance: true
          },
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.battle.count({
      where: { userId }
    })
  ]);

  const response: APIResponse<{
    battles: BattleWithItems[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> = {
    success: true,
    data: {
      battles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Create new battle
router.post('/', authenticateToken, validate(schemas.createBattle), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const battleData: CreateBattleRequest = req.body;

  // Check if all fragrances exist
  const fragrances = await prisma.fragrance.findMany({
    where: {
      id: { in: battleData.fragranceIds }
    }
  });

  if (fragrances.length !== battleData.fragranceIds.length) {
    throw createError('Some fragrances not found', 404, 'NOT_FOUND');
  }

  // Create battle
  const battle = await prisma.battle.create({
    data: {
      userId,
      title: battleData.title,
      description: battleData.description,
      status: BattleStatus.ACTIVE
    }
  });

  // Create battle items
  const battleItems = await Promise.all(
    battleData.fragranceIds.map(async (fragranceId, index) => {
      return await prisma.battleItem.create({
        data: {
          battleId: battle.id,
          fragranceId,
          position: index + 1,
          votes: 0,
          winner: false
        },
        include: {
          fragrance: true
        }
      });
    })
  );

  const battleWithItems: BattleWithItems = {
    ...battle,
    items: battleItems
  };

  const response: APIResponse<BattleWithItems> = {
    success: true,
    data: battleWithItems
  };

  res.status(201).json(response);
}));

// Get battle by ID
router.get('/:id', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const battle = await prisma.battle.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: {
          fragrance: true
        },
        orderBy: { position: 'asc' }
      }
    }
  });

  if (!battle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  const response: APIResponse<BattleWithItems> = {
    success: true,
    data: battle
  };

  res.json(response);
}));

// Update battle
router.put('/:id', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { title, description } = req.body;

  // Check if battle exists and belongs to user
  const existingBattle = await prisma.battle.findFirst({
    where: { id, userId }
  });

  if (!existingBattle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  if (existingBattle.status !== BattleStatus.ACTIVE) {
    throw createError('Cannot update completed or cancelled battle', 400, 'INVALID_STATUS');
  }

  const updatedBattle = await prisma.battle.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description })
    },
    include: {
      items: {
        include: {
          fragrance: true
        },
        orderBy: { position: 'asc' }
      }
    }
  });

  const response: APIResponse<BattleWithItems> = {
    success: true,
    data: updatedBattle
  };

  res.json(response);
}));

// Delete battle
router.delete('/:id', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if battle exists and belongs to user
  const existingBattle = await prisma.battle.findFirst({
    where: { id, userId }
  });

  if (!existingBattle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  await prisma.battle.delete({
    where: { id }
  });

  const response: APIResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Battle deleted successfully'
    }
  };

  res.json(response);
}));

// Vote in battle
router.post('/:id/vote', authenticateToken, validateParams(schemas.id), validate(schemas.voteBattle), asyncHandler(async (req, res) => {
  const { id: battleId } = req.params;
  const userId = req.user!.id;
  const voteData: VoteBattleRequest = req.body;

  // Check if battle exists and belongs to user
  const battle = await prisma.battle.findFirst({
    where: { id: battleId, userId },
    include: {
      items: true
    }
  });

  if (!battle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  if (battle.status !== BattleStatus.ACTIVE) {
    throw createError('Cannot vote in completed or cancelled battle', 400, 'INVALID_STATUS');
  }

  // Check if fragrance is part of this battle
  const battleItem = battle.items.find(item => item.fragranceId === voteData.fragranceId);
  if (!battleItem) {
    throw createError('Fragrance not found in this battle', 404, 'NOT_FOUND');
  }

  // Increment vote count
  await prisma.battleItem.update({
    where: { id: battleItem.id },
    data: {
      votes: { increment: 1 }
    }
  });

  // Get updated battle
  const updatedBattle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: {
      items: {
        include: {
          fragrance: true
        },
        orderBy: { position: 'asc' }
      }
    }
  });

  const response: APIResponse<BattleWithItems> = {
    success: true,
    data: updatedBattle!
  };

  res.json(response);
}));

// Complete battle
router.post('/:id/complete', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id: battleId } = req.params;
  const userId = req.user!.id;

  // Check if battle exists and belongs to user
  const battle = await prisma.battle.findFirst({
    where: { id: battleId, userId },
    include: {
      items: true
    }
  });

  if (!battle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  if (battle.status !== BattleStatus.ACTIVE) {
    throw createError('Battle is already completed or cancelled', 400, 'INVALID_STATUS');
  }

  // Find the item with the most votes
  const maxVotes = Math.max(...battle.items.map(item => item.votes));
  const winners = battle.items.filter(item => item.votes === maxVotes);

  // Update battle status and completion time
  await prisma.battle.update({
    where: { id: battleId },
    data: {
      status: BattleStatus.COMPLETED,
      completedAt: new Date()
    }
  });

  // Mark winner(s)
  await Promise.all(
    winners.map(async (winner) => {
      await prisma.battleItem.update({
        where: { id: winner.id },
        data: { winner: true }
      });
    })
  );

  // Get updated battle
  const updatedBattle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: {
      items: {
        include: {
          fragrance: true
        },
        orderBy: { position: 'asc' }
      }
    }
  });

  const response: APIResponse<BattleWithItems> = {
    success: true,
    data: updatedBattle!
  };

  res.json(response);
}));

// Cancel battle
router.post('/:id/cancel', authenticateToken, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { id: battleId } = req.params;
  const userId = req.user!.id;

  // Check if battle exists and belongs to user
  const battle = await prisma.battle.findFirst({
    where: { id: battleId, userId }
  });

  if (!battle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  if (battle.status !== BattleStatus.ACTIVE) {
    throw createError('Battle is already completed or cancelled', 400, 'INVALID_STATUS');
  }

  // Update battle status
  const updatedBattle = await prisma.battle.update({
    where: { id: battleId },
    data: {
      status: BattleStatus.CANCELLED
    },
    include: {
      items: {
        include: {
          fragrance: true
        },
        orderBy: { position: 'asc' }
      }
    }
  });

  const response: APIResponse<BattleWithItems> = {
    success: true,
    data: updatedBattle
  };

  res.json(response);
}));

// Get public battles (for community voting)
router.get('/public/active', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [battles, total] = await Promise.all([
    prisma.battle.findMany({
      where: { status: BattleStatus.ACTIVE },
      include: {
        items: {
          include: {
            fragrance: {
              select: {
                id: true,
                name: true,
                brand: true,
                year: true,
                concentration: true,
                // Hide notes for blind testing
                topNotes: false,
                middleNotes: false,
                baseNotes: false,
                aiSeasons: true,
                aiOccasions: true,
                aiMoods: true,
                verified: true
              }
            }
          },
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.battle.count({
      where: { status: BattleStatus.ACTIVE }
    })
  ]);

  const response: APIResponse<{
    battles: typeof battles;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> = {
    success: true,
    data: {
      battles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

export default router;
