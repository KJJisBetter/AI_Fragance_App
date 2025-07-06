import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

// Simple in-memory rate limiter
const requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Clean up old entries
    for (const [key, value] of requestCounts.entries()) {
      if (now > value.resetTime) {
        requestCounts.delete(key);
      }
    }

    // Get or create client entry
    let clientData = requestCounts.get(clientIp);
    if (!clientData || now > clientData.resetTime) {
      clientData = { count: 0, resetTime: now + windowMs };
      requestCounts.set(clientIp, clientData);
    }

    // Check if limit exceeded
    if (clientData.count >= maxRequests) {
      throw createError('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Increment count
    clientData.count++;

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - clientData.count).toString(),
      'X-RateLimit-Reset': Math.ceil(clientData.resetTime / 1000).toString(),
    });

    next();
  };
};

// Predefined rate limiters for different endpoints
export const searchRateLimiter = createRateLimiter(30, 60 * 1000); // 30 requests per minute
export const generalRateLimiter = createRateLimiter(100, 60 * 1000); // 100 requests per minute
