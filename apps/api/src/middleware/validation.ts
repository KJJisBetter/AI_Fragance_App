/**
 * Modern Validation System using Joi
 * Replaces custom validation with battle-tested library
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

// Helper function to validate CUID format
const cuidSchema = () => Joi.string().pattern(/^c[a-z0-9]{24}$/).message('must be a valid CUID');

// ===== VALIDATION SCHEMAS =====

// Fragrance schemas
export const fragranceSchemas = {
  // Search fragrances
  search: Joi.object({
    query: Joi.string().min(1).max(100).optional(),
    filters: Joi.object({
      brand: Joi.string().max(50).optional(),
      season: Joi.string().valid('spring', 'summer', 'fall', 'winter').optional(),
      occasion: Joi.string().valid('casual', 'formal', 'date', 'work', 'party').optional(),
      mood: Joi.string().valid('fresh', 'warm', 'mysterious', 'elegant', 'bold').optional(),
      concentration: Joi.string().valid('parfum', 'edp', 'edt', 'edc', 'cologne').optional(),
      verified: Joi.boolean().optional(),
      yearFrom: Joi.number().integer().min(1900).max(2030).optional(),
      yearTo: Joi.number().integer().min(1900).max(2030).optional()
    }).optional(),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sortBy: Joi.string().valid('name', 'brand', 'year', 'rating', 'popularity', 'relevance').default('relevance'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Get fragrance by ID
  getById: Joi.object({
    id: cuidSchema().required()
  }),

  // Create fragrance
  create: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    brand: Joi.string().min(1).max(100).required(),
    year: Joi.number().integer().min(1900).max(2030).optional(),
    concentration: Joi.string().valid('parfum', 'edp', 'edt', 'edc', 'cologne').optional(),
    description: Joi.string().max(2000).optional(),
    notes: Joi.object({
      top: Joi.array().items(Joi.string().max(50)).max(10).optional(),
      middle: Joi.array().items(Joi.string().max(50)).max(10).optional(),
      base: Joi.array().items(Joi.string().max(50)).max(10).optional()
    }).optional(),
    verified: Joi.boolean().default(false)
  }),

  // Update fragrance
  update: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    brand: Joi.string().min(1).max(100).optional(),
    year: Joi.number().integer().min(1900).max(2030).optional(),
    concentration: Joi.string().valid('parfum', 'edp', 'edt', 'edc', 'cologne').optional(),
    description: Joi.string().max(2000).optional(),
    notes: Joi.object({
      top: Joi.array().items(Joi.string().max(50)).max(10).optional(),
      middle: Joi.array().items(Joi.string().max(50)).max(10).optional(),
      base: Joi.array().items(Joi.string().max(50)).max(10).optional()
    }).optional(),
    verified: Joi.boolean().optional()
  }),

  // Auto-complete
  autocomplete: Joi.object({
    query: Joi.string().min(2).max(100).required(),
    limit: Joi.number().integer().min(1).max(20).default(10)
  })
};

// User schemas
export const userSchemas = {
  // Register
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    username: Joi.string().min(2).max(100).required(),
    preferences: Joi.object({
      favoriteSeasons: Joi.array().items(Joi.string().valid('spring', 'summer', 'fall', 'winter')).optional(),
      favoriteOccasions: Joi.array().items(Joi.string().valid('casual', 'formal', 'date', 'work', 'party')).optional(),
      favoriteMoods: Joi.array().items(Joi.string().valid('fresh', 'warm', 'mysterious', 'elegant', 'bold')).optional()
    }).optional()
  }),

  // Login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required()
  }),

  // Update profile
  updateProfile: Joi.object({
    username: Joi.string().min(2).max(100).optional(),
    bio: Joi.string().max(500).optional(),
    preferences: Joi.object({
      favoriteSeasons: Joi.array().items(Joi.string().valid('spring', 'summer', 'fall', 'winter')).optional(),
      favoriteOccasions: Joi.array().items(Joi.string().valid('casual', 'formal', 'date', 'work', 'party')).optional(),
      favoriteMoods: Joi.array().items(Joi.string().valid('fresh', 'warm', 'mysterious', 'elegant', 'bold')).optional()
    }).optional()
  })
};

// Collection schemas
export const collectionSchemas = {
  // Create collection
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    isPublic: Joi.boolean().default(true),
    fragranceIds: Joi.array().items(cuidSchema()).max(100).optional()
  }),

  // Update collection
  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    isPublic: Joi.boolean().optional()
  }),

  // Add fragrance to collection
  addFragrance: Joi.object({
    fragranceId: cuidSchema().required(),
    notes: Joi.string().max(300).optional()
  }),

  // Get collection by ID
  getById: Joi.object({
    id: cuidSchema().required()
  })
};

// Battle schemas
export const battleSchemas = {
  // Create battle
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    participantIds: Joi.array().items(cuidSchema()).min(2).max(8).required(),
    isPublic: Joi.boolean().default(true),
    duration: Joi.number().integer().min(1).max(168).default(24) // hours
  }),

  // Vote in battle
  vote: Joi.object({
    fragranceId: cuidSchema().required(),
    battleId: cuidSchema().required()
  }),

  // Get battle by ID
  getById: Joi.object({
    id: cuidSchema().required()
  })
};

// Query parameter schemas
export const querySchemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  // Filtering
  filters: Joi.object({
    brand: Joi.string().max(50).optional(),
    season: Joi.string().valid('spring', 'summer', 'fall', 'winter').optional(),
    occasion: Joi.string().valid('casual', 'formal', 'date', 'work', 'party').optional(),
    mood: Joi.string().valid('fresh', 'warm', 'mysterious', 'elegant', 'bold').optional(),
    concentration: Joi.string().valid('parfum', 'edp', 'edt', 'edc', 'cologne').optional(),
    verified: Joi.boolean().optional(),
    yearFrom: Joi.number().integer().min(1900).max(2030).optional(),
    yearTo: Joi.number().integer().min(1900).max(2030).optional(),
    sortBy: Joi.string().valid('name', 'brand', 'year', 'rating', 'popularity', 'created').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  })
};

// AI schemas
export const aiSchemas = {
  // Categorize fragrance
  categorizeFragrance: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    brand: Joi.string().min(1).max(100).required(),
    topNotes: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    middleNotes: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    baseNotes: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    year: Joi.number().integer().min(1900).max(2030).optional(),
    concentration: Joi.string().valid('parfum', 'edp', 'edt', 'edc', 'cologne').optional(),
    description: Joi.string().max(1000).optional()
  }),

  // AI feedback
  aiFeedback: Joi.object({
    fragranceId: cuidSchema().required(),
    aiSuggestion: Joi.object({
      seasons: Joi.array().items(Joi.string().valid('spring', 'summer', 'fall', 'winter')).optional(),
      occasions: Joi.array().items(Joi.string().valid('casual', 'formal', 'date', 'work', 'party')).optional(),
      moods: Joi.array().items(Joi.string().valid('fresh', 'warm', 'mysterious', 'elegant', 'bold')).optional()
    }).required(),
    userCorrection: Joi.object({
      seasons: Joi.array().items(Joi.string().valid('spring', 'summer', 'fall', 'winter')).optional(),
      occasions: Joi.array().items(Joi.string().valid('casual', 'formal', 'date', 'work', 'party')).optional(),
      moods: Joi.array().items(Joi.string().valid('fresh', 'warm', 'mysterious', 'elegant', 'bold')).optional()
    }).required(),
    feedbackType: Joi.string().valid('season', 'occasion', 'mood', 'general').required(),
    comments: Joi.string().max(500).optional()
  })
};

// Parameter schemas
export const paramSchemas = {
  // ID parameter
  id: Joi.object({
    id: cuidSchema().required()
  }),

  // Fragrance ID parameter
  fragranceId: Joi.object({
    fragranceId: cuidSchema().required()
  })
};

// ===== VALIDATION MIDDLEWARE =====

// Validate request body
export const validateBody = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: ''
        }
      }
    });

    if (error) {
      log.api.error(req.method, req.originalUrl, new Error(`Validation failed: ${error.message}`), req.user?.id);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    req.body = value;
    next();
  };
};

// Validate query parameters
export const validateQuery = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: ''
        }
      }
    });

    if (error) {
      log.api.error(req.method, req.originalUrl, new Error(`Query validation failed: ${error.message}`), req.user?.id);

      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    req.query = value;
    next();
  };
};

// Validate URL parameters
export const validateParams = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: ''
        }
      }
    });

    if (error) {
      log.api.error(req.method, req.originalUrl, new Error(`Params validation failed: ${error.message}`), req.user?.id);

      return res.status(400).json({
        success: false,
        error: 'Parameter validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    req.params = value;
    next();
  };
};

// Combined validation middleware
export const validate = {
  body: validateBody,
  query: validateQuery,
  params: validateParams
};

// Legacy export for backward compatibility
export { fragranceSchemas as schemas };

// Common validation helpers
export const validationHelpers = {
  // Check if UUID is valid
  isValidUUID: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // Sanitize search query
  sanitizeQuery: (query: string): string => {
    return query
      .trim()
      .replace(/[<>]/g, '') // Remove potentially dangerous characters
      .substring(0, 100); // Limit length
  },

  // Validate file upload
  validateFileUpload: (file: any): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    return allowedTypes.includes(file.mimetype) && file.size <= maxSize;
  }
};

log.info('✅ Validation system initialized with Joi');
