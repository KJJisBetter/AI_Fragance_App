import express from 'express';
import { prisma } from '@fragrance-battle/database';
import { BattleStatus } from '@fragrance-battle/database';
import {
  CreateBattleRequest,
  VoteBattleRequest,
  BattleWithItems,
  APIResponse
} from '@fragrance-battle/types';
import { validateBody, validateParams, battleSchemas } from '../middleware/validation';
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
router.post('/', authenticateToken, validateBody(battleSchemas.create), asyncHandler(async (req, res) => {
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
router.get('/:id', authenticateToken, validateParams(battleSchemas.getById), asyncHandler(async (req, res) => {
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
router.put('/:id', authenticateToken, validateParams(battleSchemas.getById), asyncHandler(async (req, res) => {
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
router.delete('/:id', authenticateToken, validateParams(battleSchemas.getById), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if battle exists and belongs to user
  const existingBattle = await prisma.battle.findFirst({
    where: { id, userId }
  });

  if (!existingBattle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  // Delete battle (this will cascade delete battle items)
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
router.post('/:id/vote', authenticateToken, validateParams(battleSchemas.getById), validateBody(battleSchemas.vote), asyncHandler(async (req, res) => {
  const { id: battleId } = req.params;
  const userId = req.user!.id;
  const voteData: VoteBattleRequest = req.body;

  // Check if battle exists and belongs to user
  const battle = await prisma.battle.findFirst({
    where: { id: battleId, userId }
  });

  if (!battle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  if (battle.status !== BattleStatus.ACTIVE) {
    throw createError('Cannot vote in completed or cancelled battle', 400, 'INVALID_STATUS');
  }

  // Check if fragrance is part of this battle
  const battleItem = await prisma.battleItem.findFirst({
    where: {
      battleId,
      fragranceId: voteData.fragranceId
    }
  });

  if (!battleItem) {
    throw createError('Fragrance not found in this battle', 404, 'NOT_FOUND');
  }

  // Check if user has already voted
  const existingVote = await prisma.vote.findFirst({
    where: {
      userId,
      battleId
    }
  });

  if (existingVote) {
    throw createError('User has already voted in this battle', 400, 'ALREADY_VOTED');
  }

  // Create vote
  const vote = await prisma.vote.create({
    data: {
      userId,
      battleId,
      fragranceId: voteData.fragranceId
    }
  });

  // Update battle item vote count
  await prisma.battleItem.update({
    where: { id: battleItem.id },
    data: {
      votes: {
        increment: 1
      }
    }
  });

  const response: APIResponse<typeof vote> = {
    success: true,
    data: vote
  };

  res.json(response);
}));

// Get battle results
router.get('/:id/results', authenticateToken, validateParams(battleSchemas.getById), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const battle = await prisma.battle.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: {
          fragrance: true
        },
        orderBy: { votes: 'desc' }
      }
    }
  });

  if (!battle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  // Get vote details
  const votes = await prisma.vote.findMany({
    where: { battleId: id },
    include: {
      user: {
        select: {
          id: true,
          username: true
        }
      },
      fragrance: {
        select: {
          id: true,
          name: true,
          brand: true
        }
      }
    }
  });

  const response: APIResponse<{
    battle: BattleWithItems;
    votes: typeof votes;
    totalVotes: number;
  }> = {
    success: true,
    data: {
      battle,
      votes,
      totalVotes: votes.length
    }
  };

  res.json(response);
}));

// Complete battle
router.patch('/:id/complete', authenticateToken, validateParams(battleSchemas.getById), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if battle exists and belongs to user
  const battle = await prisma.battle.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: {
          fragrance: true
        },
        orderBy: { votes: 'desc' }
      }
    }
  });

  if (!battle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  if (battle.status !== BattleStatus.ACTIVE) {
    throw createError('Battle is not active', 400, 'INVALID_STATUS');
  }

  // Find winner (item with most votes)
  const winner = battle.items[0];
  if (winner) {
    // Update winner
    await prisma.battleItem.update({
      where: { id: winner.id },
      data: { winner: true }
    });
  }

  // Update battle status
  const updatedBattle = await prisma.battle.update({
    where: { id },
    data: {
      status: BattleStatus.COMPLETED,
      completedAt: new Date()
    },
    include: {
      items: {
        include: {
          fragrance: true
        },
        orderBy: { votes: 'desc' }
      }
    }
  });

  const response: APIResponse<BattleWithItems> = {
    success: true,
    data: updatedBattle
  };

  res.json(response);
}));

// Get battle statistics
router.get('/:id/stats', authenticateToken, validateParams(battleSchemas.getById), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if battle exists and belongs to user
  const battle = await prisma.battle.findFirst({
    where: { id, userId }
  });

  if (!battle) {
    throw createError('Battle not found', 404, 'NOT_FOUND');
  }

  const [
    totalVotes,
    participantCount,
    itemStats
  ] = await Promise.all([
    prisma.vote.count({
      where: { battleId: id }
    }),
    prisma.vote.groupBy({
      by: ['userId'],
      where: { battleId: id },
      _count: { userId: true }
    }).then(result => result.length),
    prisma.battleItem.findMany({
      where: { battleId: id },
      include: {
        fragrance: {
          select: {
            id: true,
            name: true,
            brand: true
          }
        }
      },
      orderBy: { votes: 'desc' }
    })
  ]);

  const response: APIResponse<{
    totalVotes: number;
    participantCount: number;
    itemStats: typeof itemStats;
  }> = {
    success: true,
    data: {
      totalVotes,
      participantCount,
      itemStats
    }
  };

  res.json(response);
}));

export default router;
