import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { APIError } from '@fragrance-battle/types';
import { AuthError } from './auth';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: Record<string, any>;
}

export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: Record<string, any>
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  error.code = code;
  error.details = details;
  return error;
};

export const handleError = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  // Handle AuthError specifically
  if (error instanceof AuthError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        message: error.message,
        code: error.code
      }
    });
  }

  // Handle validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.validation
      }
    });
  }

  // Handle known application errors
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        message: error.message,
        code: (error as AppError).code || 'CLIENT_ERROR'
      }
    });
  }

  // Handle internal server errors
  request.log.error(error);
  return reply.status(500).send({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
};

// Helper function for async route handlers
export const asyncHandler = (fn: Function) => async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    return await fn(request, reply);
  } catch (error) {
    return handleError(error as FastifyError, request, reply);
  }
};
