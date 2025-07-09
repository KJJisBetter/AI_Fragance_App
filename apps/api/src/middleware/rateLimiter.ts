/**
 * Modern Rate Limiting System using Bottleneck
 * Replaces custom rate limiting with intelligent, distributed rate limiting
 */

import Bottleneck from 'bottleneck';
import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { log } from '../utils/logger';

// ===== RATE LIMITING STRATEGIES =====

// General API rate limiter
const generalLimiter = new Bottleneck({
  maxConcurrent: config.NODE_ENV === 'development' ? 50 : 10,
  minTime: config.NODE_ENV === 'development' ? 10 : 100, // Much faster in development
  reservoir: config.NODE_ENV === 'development' ? 10000 : config.RATE_LIMIT_MAX_REQUESTS, // Much higher in development
  reservoirRefreshAmount: config.NODE_ENV === 'development' ? 10000 : config.RATE_LIMIT_MAX_REQUESTS,
  reservoirRefreshInterval: config.RATE_LIMIT_WINDOW_MS
});

// Search-specific rate limiter (more restrictive)
const searchLimiter = new Bottleneck({
  maxConcurrent: config.NODE_ENV === 'development' ? 20 : 5,
  minTime: config.NODE_ENV === 'development' ? 20 : 200, // Much faster in development
  reservoir: config.NODE_ENV === 'development' ? 5000 : config.SEARCH_RATE_LIMIT_MAX, // Much higher in development
  reservoirRefreshAmount: config.NODE_ENV === 'development' ? 5000 : config.SEARCH_RATE_LIMIT_MAX,
  reservoirRefreshInterval: config.RATE_LIMIT_WINDOW_MS
});

// Authentication rate limiter (very restrictive)
const authLimiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 1000, // 1 second between auth requests
  reservoir: 10, // Only 10 auth attempts per window
  reservoirRefreshAmount: 10,
  reservoirRefreshInterval: config.RATE_LIMIT_WINDOW_MS
});

// External API rate limiter (for Perfumero, etc.)
const externalAPILimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 3000, // 3 seconds between external API calls
  reservoir: 100, // 100 API calls per day
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 24 * 60 * 60 * 1000 // 24 hours
});

// Heavy operation limiter (for AI processing, etc.)
const heavyOperationLimiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 2000, // 2 seconds between heavy operations
  reservoir: 20, // 20 heavy operations per window
  reservoirRefreshAmount: 20,
  reservoirRefreshInterval: config.RATE_LIMIT_WINDOW_MS
});

// ===== RATE LIMITING MIDDLEWARE =====

// Create rate limiting middleware for Fastify
function createRateLimitMiddleware(limiter: Bottleneck, name: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip rate limiting entirely in development
    if (config.NODE_ENV === 'development') {
      return;
    }

    const clientId = request.ip || request.socket.remoteAddress || 'unknown';
    const userId = (request as any).user?.id || 'anonymous';

    try {
      await limiter.schedule({ id: clientId }, async () => {
        // This function will be called when the request is allowed
        return Promise.resolve();
      });

      // Add rate limit headers
      reply.headers({
        'X-RateLimit-Limit': limiter.reservoir?.toString() || '0',
        'X-RateLimit-Remaining': limiter.reservoir?.toString() || '0',
        'X-RateLimit-Reset': new Date(Date.now() + config.RATE_LIMIT_WINDOW_MS).toISOString()
      });

    } catch (error) {
      log.info(`🚦 Rate limit exceeded for ${name}`, {
        clientId,
        userId,
        url: request.url,
        method: request.method
      });

      reply.status(429).send({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests to ${name}. Please try again later.`,
        retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
      });
    }
  };
}

// ===== EXPORTED MIDDLEWARES =====

export const rateLimiters = {
  general: createRateLimitMiddleware(generalLimiter, 'general API'),
  search: createRateLimitMiddleware(searchLimiter, 'search API'),
  auth: createRateLimitMiddleware(authLimiter, 'authentication'),
  heavy: createRateLimitMiddleware(heavyOperationLimiter, 'heavy operations')
};

// ===== EXTERNAL API RATE LIMITING =====

// Wrapper for external API calls
export const externalAPI = {
  // Perfumero API calls
  perfumero: {
    search: externalAPILimiter.wrap(async (params: any) => {
      log.info('🌐 External API call', { service: 'perfumero', endpoint: '/search', method: 'POST' });
      // The actual API call will be made by the calling function
      return params;
    }),

    getSimilar: externalAPILimiter.wrap(async (pid: string) => {
      log.info('🌐 External API call', { service: 'perfumero', endpoint: `/similar/${pid}`, method: 'GET' });
      return pid;
    }),

    getDetails: externalAPILimiter.wrap(async (pid: string) => {
      log.info('🌐 External API call', { service: 'perfumero', endpoint: `/perfume/${pid}`, method: 'GET' });
      return pid;
    })
  },

  // OpenAI API calls
  openai: {
    completion: heavyOperationLimiter.wrap(async (prompt: string) => {
      log.info('🤖 AI API call', { service: 'openai', endpoint: '/completions', method: 'POST' });
      return prompt;
    }),

    embedding: heavyOperationLimiter.wrap(async (text: string) => {
      log.info('🤖 AI API call', { service: 'openai', endpoint: '/embeddings', method: 'POST' });
      return text;
    })
  }
};

// ===== ADAPTIVE RATE LIMITING =====

// Adaptive rate limiter that adjusts based on system load
class AdaptiveRateLimiter {
  private limiter: Bottleneck;
  private baseReservoir: number;
  private currentLoad: number = 0;
  private lastAdjustment: number = Date.now();

  constructor(name: string, baseReservoir: number, minTime: number) {
    this.baseReservoir = baseReservoir;
    this.limiter = new Bottleneck({
      maxConcurrent: 5,
      minTime,
      reservoir: baseReservoir,
      reservoirRefreshAmount: baseReservoir,
      reservoirRefreshInterval: config.RATE_LIMIT_WINDOW_MS
    });

    // Monitor system load
    this.monitorSystemLoad();
  }

  private monitorSystemLoad() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsed = memUsage.heapUsed / memUsage.heapTotal;

      // Adjust rate limits based on memory usage
      if (heapUsed > 0.8) {
        this.adjustRateLimit(0.5); // Reduce to 50% if memory is high
      } else if (heapUsed > 0.6) {
        this.adjustRateLimit(0.7); // Reduce to 70% if memory is moderate
      } else {
        this.adjustRateLimit(1.0); // Normal rate limit
      }
    }, 30000); // Check every 30 seconds
  }

  private adjustRateLimit(factor: number) {
    const now = Date.now();
    if (now - this.lastAdjustment < 10000) return; // Don't adjust too frequently

    const newReservoir = Math.floor(this.baseReservoir * factor);
    this.limiter.updateSettings({
      reservoir: newReservoir,
      reservoirRefreshAmount: newReservoir
    });

    this.lastAdjustment = now;
    log.info(`🔄 Rate limit adjusted to ${Math.floor(factor * 100)}% of normal`, {
      memoryUsage: process.memoryUsage(),
      factor
    });
  }

  getMiddleware(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
    return createRateLimitMiddleware(this.limiter, 'adaptive');
  }
}

// ===== PERFORMANCE MONITORING =====

// Create adaptive rate limiter for high-load scenarios
export const adaptiveRateLimiter = new AdaptiveRateLimiter('adaptive', 100, 100);

// Export adaptive middleware
export const adaptiveMiddleware = adaptiveRateLimiter.getMiddleware();

// ===== INITIALIZATION =====

log.info('🚦 Rate limiting system initialized with Bottleneck', {
  strategies: ['general', 'search', 'auth', 'external', 'heavy', 'adaptive']
});
