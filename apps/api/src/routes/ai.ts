import express from 'express';
import { prisma } from '@fragrance-battle/database';
import { categorizeFragrance, checkAIHealth } from '@fragrance-battle/ai';
import {
  AICategorizationRequest,
  AICategorizationResponse,
  AICategorFeedbackRequest,
  APIResponse
} from '@fragrance-battle/types';
import { validate, validateParams, schemas } from '../middleware/validation';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

// Categorize fragrance using AI
router.post('/categorize', optionalAuth, validate(schemas.categorizeFragrance), asyncHandler(async (req, res) => {
  const categorizationRequest: AICategorizationRequest = req.body;

  try {
    // Use AI service to categorize fragrance
    const aiResponse = await categorizeFragrance(categorizationRequest);

    // If user is authenticated, check if this fragrance exists in database
    let fragrance = null;
    if (req.user) {
      fragrance = await prisma.fragrance.findFirst({
        where: {
          AND: [
            { name: { equals: categorizationRequest.name, mode: 'insensitive' } },
            { brand: { equals: categorizationRequest.brand, mode: 'insensitive' } }
          ]
        }
      });

      // Update existing fragrance with AI categorization if it exists
      if (fragrance) {
        await prisma.fragrance.update({
          where: { id: fragrance.id },
          data: {
            aiSeasons: aiResponse.categorization.seasons,
            aiOccasions: aiResponse.categorization.occasions,
            aiMoods: aiResponse.categorization.moods,
            updatedAt: new Date()
          }
        });
      }
    }

    const response: APIResponse<AICategorizationResponse & { fragranceId?: string }> = {
      success: true,
      data: {
        ...aiResponse,
        fragranceId: fragrance?.id
      }
    };

    res.json(response);
  } catch (error) {
    console.error('AI categorization error:', error);
    throw createError(
      'Failed to categorize fragrance. Please try again later.',
      500,
      'AI_SERVICE_ERROR'
    );
  }
}));

// Submit feedback for AI categorization
router.post('/feedback', authenticateToken, validate(schemas.aiFeedback), asyncHandler(async (req, res) => {
  const feedbackRequest: AICategorFeedbackRequest = req.body;
  const userId = req.user!.id;

  // Check if fragrance exists
  const fragrance = await prisma.fragrance.findUnique({
    where: { id: feedbackRequest.fragranceId }
  });

  if (!fragrance) {
    throw createError('Fragrance not found', 404, 'NOT_FOUND');
  }

  // Create feedback record
  const feedback = await prisma.aICategorFeedback.create({
    data: {
      userId,
      fragranceId: feedbackRequest.fragranceId,
      aiSuggestion: feedbackRequest.aiSuggestion,
      userCorrection: feedbackRequest.userCorrection,
      feedbackType: feedbackRequest.feedbackType
    }
  });

  // Update fragrance with corrected categorization
  const updateData: any = {};

  if (feedbackRequest.feedbackType === 'season' && feedbackRequest.userCorrection.seasons) {
    updateData.aiSeasons = feedbackRequest.userCorrection.seasons;
  }

  if (feedbackRequest.feedbackType === 'occasion' && feedbackRequest.userCorrection.occasions) {
    updateData.aiOccasions = feedbackRequest.userCorrection.occasions;
  }

  if (feedbackRequest.feedbackType === 'mood' && feedbackRequest.userCorrection.moods) {
    updateData.aiMoods = feedbackRequest.userCorrection.moods;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.fragrance.update({
      where: { id: feedbackRequest.fragranceId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
  }

  const response: APIResponse<{ message: string; feedbackId: string }> = {
    success: true,
    data: {
      message: 'Feedback submitted successfully',
      feedbackId: feedback.id
    }
  };

  res.status(201).json(response);
}));

// Get AI categorization for existing fragrance
router.get('/categorize/:fragranceId', optionalAuth, validateParams(schemas.id), asyncHandler(async (req, res) => {
  const { fragranceId } = req.params;

  const fragrance = await prisma.fragrance.findUnique({
    where: { id: fragranceId }
  });

  if (!fragrance) {
    throw createError('Fragrance not found', 404, 'NOT_FOUND');
  }

  // If fragrance doesn't have AI categorization, generate it
  if (fragrance.aiSeasons.length === 0 && fragrance.aiOccasions.length === 0 && fragrance.aiMoods.length === 0) {
    try {
      const aiResponse = await categorizeFragrance({
        name: fragrance.name,
        brand: fragrance.brand,
        topNotes: fragrance.topNotes,
        middleNotes: fragrance.middleNotes,
        baseNotes: fragrance.baseNotes,
        year: fragrance.year || undefined,
        concentration: fragrance.concentration || undefined
      });

      // Update fragrance with AI categorization
      const updatedFragrance = await prisma.fragrance.update({
        where: { id: fragranceId },
        data: {
          aiSeasons: aiResponse.categorization.seasons,
          aiOccasions: aiResponse.categorization.occasions,
          aiMoods: aiResponse.categorization.moods,
          updatedAt: new Date()
        }
      });

      const response: APIResponse<AICategorizationResponse & { fragrance: typeof updatedFragrance }> = {
        success: true,
        data: {
          ...aiResponse,
          fragrance: updatedFragrance
        }
      };

      return res.json(response);
    } catch (error) {
      console.error('AI categorization error:', error);
      throw createError(
        'Failed to categorize fragrance. Please try again later.',
        500,
        'AI_SERVICE_ERROR'
      );
    }
  }

  // Return existing categorization
  const response: APIResponse<{
    categorization: {
      seasons: string[];
      occasions: string[];
      moods: string[];
      confidence: number;
    };
    reasoning: string;
    fragrance: typeof fragrance;
  }> = {
    success: true,
    data: {
      categorization: {
        seasons: fragrance.aiSeasons,
        occasions: fragrance.aiOccasions,
        moods: fragrance.aiMoods,
        confidence: 85 // Default confidence for existing categorizations
      },
      reasoning: 'Previously categorized fragrance',
      fragrance
    }
  };

  res.json(response);
}));

// Get user's feedback history
router.get('/feedback', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [feedbacks, total] = await Promise.all([
    prisma.aICategorFeedback.findMany({
      where: { userId },
      include: {
        fragrance: {
          select: {
            id: true,
            name: true,
            brand: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.aICategorFeedback.count({
      where: { userId }
    })
  ]);

  const response: APIResponse<{
    feedbacks: typeof feedbacks;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> = {
    success: true,
    data: {
      feedbacks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Get AI service health
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const isHealthy = await checkAIHealth();

    const response: APIResponse<{
      status: string;
      healthy: boolean;
      timestamp: string;
    }> = {
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        healthy: isHealthy,
        timestamp: new Date().toISOString()
      }
    };

    res.status(isHealthy ? 200 : 503).json(response);
  } catch (error) {
    const response: APIResponse<{
      status: string;
      healthy: boolean;
      timestamp: string;
      error: string;
    }> = {
      success: false,
      data: {
        status: 'error',
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };

    res.status(503).json(response);
  }
}));

// Batch categorize fragrances
router.post('/categorize-batch', authenticateToken, asyncHandler(async (req, res) => {
  const { fragranceIds } = req.body;

  if (!Array.isArray(fragranceIds) || fragranceIds.length === 0) {
    throw createError('fragranceIds must be a non-empty array', 400, 'VALIDATION_ERROR');
  }

  if (fragranceIds.length > 10) {
    throw createError('Maximum 10 fragrances can be categorized at once', 400, 'VALIDATION_ERROR');
  }

  // Get fragrances
  const fragrances = await prisma.fragrance.findMany({
    where: {
      id: { in: fragranceIds }
    }
  });

  if (fragrances.length !== fragranceIds.length) {
    throw createError('Some fragrances not found', 404, 'NOT_FOUND');
  }

  // Categorize each fragrance
  const results = [];
  for (const fragrance of fragrances) {
    try {
      const aiResponse = await categorizeFragrance({
        name: fragrance.name,
        brand: fragrance.brand,
        topNotes: fragrance.topNotes,
        middleNotes: fragrance.middleNotes,
        baseNotes: fragrance.baseNotes,
        year: fragrance.year || undefined,
        concentration: fragrance.concentration || undefined
      });

      // Update fragrance with AI categorization
      await prisma.fragrance.update({
        where: { id: fragrance.id },
        data: {
          aiSeasons: aiResponse.categorization.seasons,
          aiOccasions: aiResponse.categorization.occasions,
          aiMoods: aiResponse.categorization.moods,
          updatedAt: new Date()
        }
      });

      results.push({
        fragranceId: fragrance.id,
        success: true,
        categorization: aiResponse.categorization
      });
    } catch (error) {
      console.error(`Failed to categorize fragrance ${fragrance.id}:`, error);
      results.push({
        fragranceId: fragrance.id,
        success: false,
        error: 'Failed to categorize fragrance'
      });
    }
  }

  const response: APIResponse<{
    results: typeof results;
    successful: number;
    failed: number;
  }> = {
    success: true,
    data: {
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  };

  res.json(response);
}));

export default router;
