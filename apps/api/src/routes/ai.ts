import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@fragrance-battle/database';
import { categorizeFragrance, checkAIHealth } from '@fragrance-battle/ai';
import {
  AICategorizationRequest,
  AICategorizationResponse,
  AICategorFeedbackRequest,
  APIResponse
} from '@fragrance-battle/types';
import { validateBody, validateParams, aiSchemas, paramSchemas } from '../middleware/validation';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export default async function aiRoutes(app: FastifyInstance) {
  // Categorize fragrance using AI
  app.post('/categorize', {
    preHandler: [optionalAuth, validateBody(aiSchemas.categorizeFragrance)]
  }, async (request: FastifyRequest<{ Body: AICategorizationRequest }>, reply: FastifyReply) => {
    const categorizationRequest: AICategorizationRequest = request.body;

    try {
      // Use AI service to categorize fragrance
      const aiResponse = await categorizeFragrance(categorizationRequest);

      // If user is authenticated, check if this fragrance exists in database
      let fragrance = null;
      if (request.user) {
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

      reply.send(response);
    } catch (error) {
      console.error('AI categorization error:', error);
      throw createError(
        'Failed to categorize fragrance. Please try again later.',
        500,
        'AI_SERVICE_ERROR'
      );
    }
  });

  // Submit feedback for AI categorization
  app.post('/feedback', {
    preHandler: [authenticateToken, validateBody(aiSchemas.aiFeedback)]
  }, async (request: FastifyRequest<{ Body: AICategorFeedbackRequest }>, reply: FastifyReply) => {
    const feedbackRequest: AICategorFeedbackRequest = request.body;
    const userId = request.user!.id;

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

    reply.status(201).send(response);
  });

  // Get AI categorization for existing fragrance
  app.get('/categorize/:fragranceId', {
    preHandler: [optionalAuth, validateParams(paramSchemas.fragranceId)]
  }, async (request: FastifyRequest<{ Params: any }>, reply: FastifyReply) => {
    const { fragranceId } = request.params;

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

        return reply.send(response);
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
          confidence: 0.85 // Default confidence for existing data
        },
        reasoning: 'Previously categorized fragrance data',
        fragrance: fragrance
      }
    };

    reply.send(response);
  });

  // Get AI health status
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const health = await checkAIHealth();

      const response: APIResponse<typeof health> = {
        success: true,
        data: health
      };

      reply.send(response);
    } catch (error) {
      console.error('AI health check error:', error);
      throw createError(
        'Failed to check AI service health',
        500,
        'AI_SERVICE_ERROR'
      );
    }
  });

  // Get AI statistics
  app.get('/stats', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const [
      totalCategorizations,
      totalFeedback,
      recentCategorizations,
      feedbackByType
    ] = await Promise.all([
      prisma.fragrance.count({
        where: {
          OR: [
            { aiSeasons: { isEmpty: false } },
            { aiOccasions: { isEmpty: false } },
            { aiMoods: { isEmpty: false } }
          ]
        }
      }),
      prisma.aICategorFeedback.count(),
      prisma.fragrance.count({
        where: {
          AND: [
            { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Last 7 days
            {
              OR: [
                { aiSeasons: { isEmpty: false } },
                { aiOccasions: { isEmpty: false } },
                { aiMoods: { isEmpty: false } }
              ]
            }
          ]
        }
      }),
      prisma.aICategorFeedback.groupBy({
        by: ['feedbackType'],
        _count: { feedbackType: true }
      })
    ]);

    const response: APIResponse<{
      totalCategorizations: number;
      totalFeedback: number;
      recentCategorizations: number;
      feedbackByType: typeof feedbackByType;
    }> = {
      success: true,
      data: {
        totalCategorizations,
        totalFeedback,
        recentCategorizations,
        feedbackByType
      }
    };

    reply.send(response);
  });
}
