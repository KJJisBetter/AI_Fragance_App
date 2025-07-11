/**
 * Modern Fragrance Battle AI API Server
 * Using Fastify for 2x better performance than Express
 */

import Fastify from 'fastify';
import { connectDatabase } from '@fragrance-battle/database';
import { config, features } from './config';
import { log } from './utils/logger';
import { searchService } from './services/searchService';

// Import routes
import authRoutes from './routes/auth';
import fragranceRoutes from './routes/fragrances';
import collectionRoutes from './routes/collections';
import battleRoutes from './routes/battles';
import aiRoutes from './routes/ai';
import userRoutes from './routes/users';
import brandRoutes from './routes/brands';
import adminRoutes from './routes/admin';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
});

// Extend Fastify Request interface to include startTime
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

// ===== HEALTH CHECK ENDPOINTS =====

fastify.get('/health', async (request, reply) => {
  const memUsage = process.memoryUsage();

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    features: {
      openAI: features.openAI,
      perfumero: features.perfumero,
      meilisearch: features.meilisearch,
      development: features.developmentMode
    },
    performance: {
      memory: {
        used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      searchCache: searchService.getCacheStats()
    }
  };
});

// Detailed health check for monitoring
fastify.get('/health/detailed', async (request, reply) => {
  const memUsage = process.memoryUsage();

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      environment: config.NODE_ENV,
      port: config.PORT,
      logLevel: config.LOG_LEVEL,
      searchLimit: config.SEARCH_RESULTS_LIMIT,
      cacheThrottle: config.CACHE_TTL_SECONDS
    },
    features,
    performance: {
      uptime: process.uptime(),
      memory: memUsage,
      searchEngine: 'MeiliSearch + Redis',
      caching: 'Redis'
    }
  };
});

// ===== API DOCUMENTATION =====

fastify.get('/api', async (request, reply) => {
  return {
    name: 'Fragrance Battle AI API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Modern API for fragrance battle AI application - now with Fastify!',
    environment: config.NODE_ENV,
    features: Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name),
    searchEngine: 'MeiliSearch + Redis',
    framework: 'Fastify',
    validation: 'Zod',
    logging: 'Pino',
    endpoints: {
      // Health & monitoring
      health: {
        'GET /health': 'Basic health check',
        'GET /health/detailed': 'Detailed system status'
      },

      // Authentication
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/me': 'Get current user info',
        'PUT /api/auth/me': 'Update user profile'
      },

      // Fragrances (intelligent search)
      fragrances: {
        'GET /api/fragrances': 'Get all fragrances with filters',
        'POST /api/fragrances/search': 'Intelligent search with MeiliSearch',
        'POST /api/fragrances/autocomplete': 'Smart auto-complete suggestions',
        'GET /api/fragrances/:id': 'Get fragrance by ID',
        'POST /api/fragrances': 'Create new fragrance',
        'PUT /api/fragrances/:id': 'Update fragrance',
        'DELETE /api/fragrances/:id': 'Delete fragrance'
      },

      // Collections
      collections: {
        'GET /api/collections': 'Get user collections',
        'POST /api/collections': 'Create collection',
        'GET /api/collections/:id': 'Get collection details',
        'PUT /api/collections/:id': 'Update collection',
        'DELETE /api/collections/:id': 'Delete collection'
      },

      // Battles
      battles: {
        'GET /api/battles': 'Get user battles',
        'POST /api/battles': 'Create battle',
        'GET /api/battles/:id': 'Get battle details',
        'PUT /api/battles/:id': 'Update battle',
        'DELETE /api/battles/:id': 'Delete battle'
      },

      // AI Features
      ai: {
        'POST /api/ai/categorize': 'AI categorization of fragrances',
        'POST /api/ai/recommend': 'AI-powered recommendations',
        'POST /api/ai/analyze': 'AI analysis of user preferences'
      },

      // Users
      users: {
        'GET /api/users/me': 'Get current user profile',
        'PUT /api/users/me': 'Update user profile',
        'GET /api/users/:id': 'Get user by ID'
      },

      // Brands
      brands: {
        'GET /api/brands': 'Get all brands',
        'GET /api/brands/:id': 'Get brand details',
        'GET /api/brands/search': 'Search brands'
      },

      // Admin (Protected)
      admin: {
        'GET /api/admin/population-stats': 'Get database population statistics',
        'GET /api/admin/market-coverage': 'Get market coverage report',
        'GET /api/admin/data-quality': 'Get data quality metrics',
        'POST /api/admin/purge/dry-run': 'Simulate database purge (dry run)'
      }
    }
  };
});

// ===== CONFIGURATION VALIDATION =====

const validateConfiguration = () => {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
  }

  if (features.openAI && !process.env.OPENAI_API_KEY) {
    log.warn('⚠️ OpenAI API key not found - AI features will be disabled');
  }

  if (features.meilisearch && !process.env.MEILISEARCH_URL) {
    log.warn('⚠️ MeiliSearch URL not found - search will use fallback');
  }

  log.info('✅ Configuration validated successfully');
};

// ===== SERVER STARTUP =====

const startServer = async () => {
  try {
    // Validate configuration
    log.info('🔧 Validating configuration...');
    validateConfiguration();

    // Connect to database
    log.info('🔌 Connecting to database...');
    await connectDatabase();
    log.info('✅ Database connected successfully');

    // Initialize search service
    log.info('🔍 Initializing search service...');
    // Search service initializes automatically in constructor

    // Register plugins
    log.info('🔌 Registering Fastify plugins...');

    // Register CORS plugin
    await fastify.register(import('@fastify/cors'), {
      origin: features.corsEnabled ? true : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      credentials: true
    });

    // Register security plugin
    await fastify.register(import('@fastify/helmet'), {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.openai.com", config.PERFUMERO_BASE_URL],
        },
      },
      crossOriginEmbedderPolicy: false
    });

    // Register rate limiting plugin
    await fastify.register(import('@fastify/rate-limit'), {
      max: config.RATE_LIMIT_MAX_REQUESTS,
      timeWindow: config.RATE_LIMIT_WINDOW_MS,
      allowList: config.NODE_ENV === 'development' ? ['127.0.0.1'] : undefined
    });

    // Add middleware hooks
    fastify.addHook('onRequest', async (request, reply) => {
      const start = Date.now();
      request.startTime = start;

      log.info(`${request.method} ${request.url}`, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
    });

    fastify.addHook('onResponse', async (request, reply) => {
      const duration = Date.now() - (request.startTime || 0);

      log.info(`${request.method} ${request.url} - ${reply.statusCode}`, {
        duration,
        statusCode: reply.statusCode
      });

      // Log slow requests
      if (duration > 1000) {
        log.warn('Slow request detected', {
          method: request.method,
          url: request.url,
          duration,
          threshold: 1000
        });
      }
    });

    fastify.addHook('onError', async (request, reply, error) => {
      log.error('Request error', {
        method: request.method,
        url: request.url,
        error: error.message,
        stack: error.stack
      });
    });

    log.info('✅ Fastify plugins registered successfully');

    // Register route plugins
    log.info('🔌 Registering API routes...');
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(fragranceRoutes, { prefix: '/api/fragrances' });
    await fastify.register(brandRoutes, { prefix: '/api/brands' });
    await fastify.register(collectionRoutes, { prefix: '/api/collections' });
    await fastify.register(battleRoutes, { prefix: '/api/battles' });
    await fastify.register(aiRoutes, { prefix: '/api/ai' });
    await fastify.register(userRoutes, { prefix: '/api/users' });
    await fastify.register(adminRoutes, { prefix: '/api/admin' });
    log.info('✅ API routes registered successfully');

    // Start Fastify server
    log.info('🚀 Starting Fastify server...');
    await fastify.listen({
      port: config.PORT,
      host: config.NODE_ENV === 'development' ? 'localhost' : '0.0.0.0'
    });

    log.info('🚀 Fastify server started successfully', {
      port: config.PORT,
      environment: config.NODE_ENV,
      features: Object.entries(features)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
    });

    log.info('📖 API documentation available', {
      url: `http://localhost:${config.PORT}/api`
    });

    log.info('🏥 Health check available', {
      url: `http://localhost:${config.PORT}/health`
    });

    if (features.openAI) {
      log.info('🤖 AI endpoints available', {
        url: `http://localhost:${config.PORT}/api/ai/*`
      });
    }

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      log.info(`🛑 ${signal} received, shutting down gracefully...`);

      try {
        await fastify.close();
        log.info('✅ Fastify server closed');

        // Clear search cache
        searchService.clearCache();

        log.info('🔄 Cleanup completed');
        process.exit(0);
      } catch (error) {
        log.error('❌ Error during shutdown', {
          error: error.message,
          stack: error.stack,
          name: error.name
        });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    log.error('❌ Failed to start server', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    console.error('Raw error object:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
