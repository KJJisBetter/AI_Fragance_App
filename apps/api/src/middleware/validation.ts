/**
 * Modern Validation System using Zod
 * Replaces Joi validation with better TypeScript integration
 */

import { z } from 'zod';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createError } from './errorHandler';

// Helper function to validate CUID format
const cuidSchema = () => z.string().regex(/^c[a-z0-9]{24}$/, 'must be a valid CUID');

// ===== VALIDATION SCHEMAS =====

// Fragrance schemas
export const fragranceSchemas = {
  // Search fragrances
  search: z.object({
    query: z.string().min(1).max(100).optional(),
    filters: z.object({
      brand: z.string().max(50).optional(),
      season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
      occasion: z.enum(['casual', 'formal', 'date', 'work', 'party']).optional(),
      mood: z.enum(['fresh', 'warm', 'mysterious', 'elegant', 'bold']).optional(),
      concentration: z.enum(['parfum', 'edp', 'edt', 'edc', 'cologne']).optional(),
      verified: z.boolean().optional(),
      yearFrom: z.number().int().min(1900).max(2030).optional(),
      yearTo: z.number().int().min(1900).max(2030).optional()
    }).optional(),
    page: z.number().int().min(1).max(1000).default(1),
    limit: z.number().int().min(1).max(50).default(20),
    sortBy: z.enum(['name', 'brand', 'year', 'rating', 'popularity', 'relevance']).default('relevance'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  // Get fragrance by ID
  getById: z.object({
    id: cuidSchema()
  }),

  // Create fragrance
  create: z.object({
    name: z.string().min(1).max(200),
    brand: z.string().min(1).max(100),
    year: z.number().int().min(1900).max(2030).optional(),
    concentration: z.enum(['parfum', 'edp', 'edt', 'edc', 'cologne']).optional(),
    description: z.string().max(2000).optional(),
    notes: z.object({
      top: z.array(z.string().max(50)).max(10).optional(),
      middle: z.array(z.string().max(50)).max(10).optional(),
      base: z.array(z.string().max(50)).max(10).optional()
    }).optional(),
    verified: z.boolean().default(false)
  }),

  // Update fragrance
  update: z.object({
    name: z.string().min(1).max(200).optional(),
    brand: z.string().min(1).max(100).optional(),
    year: z.number().int().min(1900).max(2030).optional(),
    concentration: z.enum(['parfum', 'edp', 'edt', 'edc', 'cologne']).optional(),
    description: z.string().max(2000).optional(),
    notes: z.object({
      top: z.array(z.string().max(50)).max(10).optional(),
      middle: z.array(z.string().max(50)).max(10).optional(),
      base: z.array(z.string().max(50)).max(10).optional()
    }).optional(),
    verified: z.boolean().optional()
  }),

  // Auto-complete
  autocomplete: z.object({
    query: z.string().min(2).max(100),
    limit: z.number().int().min(1).max(20).default(10)
  })
};

// User schemas
export const userSchemas = {
  // Register
  register: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    username: z.string().min(2).max(100),
    preferences: z.object({
      favoriteSeasons: z.array(z.enum(['spring', 'summer', 'fall', 'winter'])).optional(),
      favoriteOccasions: z.array(z.enum(['casual', 'formal', 'date', 'work', 'party'])).optional(),
      favoriteMoods: z.array(z.enum(['fresh', 'warm', 'mysterious', 'elegant', 'bold'])).optional()
    }).optional()
  }),

  // Login
  login: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128)
  }),

  // Update profile
  updateProfile: z.object({
    username: z.string().min(2).max(100).optional(),
    bio: z.string().max(500).optional(),
    preferences: z.object({
      favoriteSeasons: z.array(z.enum(['spring', 'summer', 'fall', 'winter'])).optional(),
      favoriteOccasions: z.array(z.enum(['casual', 'formal', 'date', 'work', 'party'])).optional(),
      favoriteMoods: z.array(z.enum(['fresh', 'warm', 'mysterious', 'elegant', 'bold'])).optional()
    }).optional()
  })
};

// Collection schemas
export const collectionSchemas = {
  // Create collection
  create: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().default(true),
    fragranceIds: z.array(cuidSchema()).max(100).optional()
  }),

  // Update collection
  update: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().optional()
  }),

  // Add fragrance to collection
  addFragrance: z.object({
    fragranceId: cuidSchema(),
    notes: z.string().max(300).optional()
  }),

  // Get collection by ID
  getById: z.object({
    id: cuidSchema()
  })
};

// Battle schemas
export const battleSchemas = {
  // Create battle
  create: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    participantIds: z.array(cuidSchema()).min(2).max(8),
    isPublic: z.boolean().default(true),
    duration: z.number().int().min(1).max(168).default(24) // hours
  }),

  // Vote in battle
  vote: z.object({
    fragranceId: cuidSchema(),
    battleId: cuidSchema()
  }),

  // Get battle by ID
  getById: z.object({
    id: cuidSchema()
  })
};

// Query parameter schemas
export const querySchemas = {
  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).max(1000).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }),

  // Filtering
  filters: z.object({
    brand: z.string().max(50).optional(),
    season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
    occasion: z.enum(['casual', 'formal', 'date', 'work', 'party']).optional(),
    mood: z.enum(['fresh', 'warm', 'mysterious', 'elegant', 'bold']).optional(),
    concentration: z.enum(['parfum', 'edp', 'edt', 'edc', 'cologne']).optional(),
    verified: z.boolean().optional(),
    yearFrom: z.number().int().min(1900).max(2030).optional(),
    yearTo: z.number().int().min(1900).max(2030).optional(),
    sortBy: z.enum(['name', 'brand', 'year', 'rating', 'popularity', 'created']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  })
};

// AI schemas
export const aiSchemas = {
  // Categorize fragrance
  categorizeFragrance: z.object({
    name: z.string().min(1).max(200),
    brand: z.string().min(1).max(100),
    topNotes: z.array(z.string().max(50)).max(20).optional(),
    middleNotes: z.array(z.string().max(50)).max(20).optional(),
    baseNotes: z.array(z.string().max(50)).max(20).optional(),
    year: z.number().int().min(1900).max(2030).optional(),
    concentration: z.enum(['parfum', 'edp', 'edt', 'edc', 'cologne']).optional(),
    description: z.string().max(1000).optional()
  }),

  // AI feedback
  aiFeedback: z.object({
    fragranceId: cuidSchema(),
    aiSuggestion: z.record(z.any()),
    userCorrection: z.record(z.any()),
    feedbackType: z.enum(['season', 'occasion', 'mood', 'notes', 'description'])
  })
};

// Parameter schemas for URL params
export const paramSchemas = {
  // Fragrance ID parameter
  fragranceId: z.object({
    fragranceId: cuidSchema()
  }),

  // User ID parameter
  userId: z.object({
    userId: cuidSchema()
  }),

  // Collection ID parameter
  collectionId: z.object({
    id: cuidSchema()
  }),

  // Battle ID parameter
  battleId: z.object({
    id: cuidSchema()
  }),

  // Brand ID parameter
  brandId: z.object({
    id: cuidSchema()
  }),

  // Generic ID parameter
  id: z.object({
    id: cuidSchema()
  })
};

// ===== VALIDATION MIDDLEWARE =====

// Validate request body
export const validateBody = (schema: z.ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = schema.parse(request.body);
      request.body = result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createError('Request validation failed', 400, 'VALIDATION_ERROR', {
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        });
      }
      throw error;
    }
  };
};

// Validate query parameters
export const validateQuery = (schema: z.ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = schema.parse(request.query);
      request.query = result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createError('Query validation failed', 400, 'VALIDATION_ERROR', {
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        });
      }
      throw error;
    }
  };
};

// Validate route parameters
export const validateParams = (schema: z.ZodSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = schema.parse(request.params);
      request.params = result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createError('Parameter validation failed', 400, 'VALIDATION_ERROR', {
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        });
      }
      throw error;
    }
  };
};

// Combined validation middleware
export const validate = {
  body: validateBody,
  query: validateQuery,
  params: validateParams
};

// Export types for frontend
export type FragranceSearchInput = z.infer<typeof fragranceSchemas.search>;
export type FragranceCreateInput = z.infer<typeof fragranceSchemas.create>;
export type UserRegisterInput = z.infer<typeof userSchemas.register>;
export type UserLoginInput = z.infer<typeof userSchemas.login>;
