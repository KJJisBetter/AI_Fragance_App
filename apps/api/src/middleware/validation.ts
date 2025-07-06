import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './errorHandler';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(createError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        { details }
      ));
    }

    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params);

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(createError(
        'Parameter validation failed',
        400,
        'VALIDATION_ERROR',
        { details }
      ));
    }

    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query);

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(createError(
        'Query validation failed',
        400,
        'VALIDATION_ERROR',
        { details }
      ));
    }

    next();
  };
};

// Common validation schemas
export const schemas = {
  // Auth schemas
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().min(3).max(30).alphanum().required(),
    password: Joi.string().min(6).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Fragrance schemas
  createFragrance: Joi.object({
    name: Joi.string().required(),
    brand: Joi.string().required(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    concentration: Joi.string().optional(),
    topNotes: Joi.array().items(Joi.string()).required(),
    middleNotes: Joi.array().items(Joi.string()).required(),
    baseNotes: Joi.array().items(Joi.string()).required()
  }),

  updateFragrance: Joi.object({
    name: Joi.string().optional(),
    brand: Joi.string().optional(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    concentration: Joi.string().optional(),
    topNotes: Joi.array().items(Joi.string()).optional(),
    middleNotes: Joi.array().items(Joi.string()).optional(),
    baseNotes: Joi.array().items(Joi.string()).optional()
  }),

  // Collection schemas
  createCollection: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional()
  }),

  addToCollection: Joi.object({
    fragranceId: Joi.string().required(),
    personalRating: Joi.number().integer().min(1).max(10).optional(),
    personalNotes: Joi.string().optional(),
    bottleSize: Joi.string().optional()
  }),

  // Battle schemas
  createBattle: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    fragranceIds: Joi.array().items(Joi.string()).min(2).max(10).required()
  }),

  voteBattle: Joi.object({
    fragranceId: Joi.string().required()
  }),

  // AI schemas
  categorizeFragrance: Joi.object({
    name: Joi.string().required(),
    brand: Joi.string().required(),
    topNotes: Joi.array().items(Joi.string()).required(),
    middleNotes: Joi.array().items(Joi.string()).required(),
    baseNotes: Joi.array().items(Joi.string()).required(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    concentration: Joi.string().optional()
  }),

  aiFeedback: Joi.object({
    fragranceId: Joi.string().required(),
    aiSuggestion: Joi.object().required(),
    userCorrection: Joi.object().required(),
    feedbackType: Joi.string().valid('season', 'occasion', 'mood').required()
  }),

  // Search schemas
  searchFragrances: Joi.object({
    query: Joi.string().optional(),
    filters: Joi.object({
      brand: Joi.string().optional(),
      season: Joi.string().optional(),
      occasion: Joi.string().optional(),
      mood: Joi.string().optional(),
      yearFrom: Joi.number().integer().min(1900).optional(),
      yearTo: Joi.number().integer().min(1900).optional(),
      concentration: Joi.string().optional(),
      verified: Joi.boolean().optional()
    }).optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().valid('name', 'brand', 'year', 'rating', 'createdAt').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional()
  }),

  // Parameter schemas
  id: Joi.object({
    id: Joi.string().required()
  }),

  // Query schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional()
  })
};
