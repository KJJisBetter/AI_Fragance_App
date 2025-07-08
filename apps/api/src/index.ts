/**
 * Modern Fragrance Battle AI API Server
 * Using proper configuration, logging, rate limiting, and search services
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDatabase } from '@fragrance-battle/database';
import { config, features, isDevelopment } from './config';
import { log, requestLogger, errorLogger } from './utils/logger';
import { rateLimiters, rateLimitMonitor } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { searchService } from './services/searchService';

// Import routes
import authRoutes from './routes/auth';
import fragranceRoutes from './routes/fragrances';
import collectionRoutes from './routes/collections';
import battleRoutes from './routes/battles';
import aiRoutes from './routes/ai';
import userRoutes from './routes/users';
import brandRoutes from './routes/brands';

const app = express();

// ===== SECURITY & PERFORMANCE MIDDLEWARE =====
app.use(helmet({
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
}));

// ===== CORS CONFIGURATION =====
app.use(cors({
  origin: features.corsEnabled ? true : [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// ===== REQUEST PROCESSING =====
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Log large payloads
    if (buf.length > 1024 * 1024) { // > 1MB
      log.warn('Large request payload detected', {
        size: `${Math.round(buf.length / 1024)}KB`,
        endpoint: req.path
      });
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== LOGGING MIDDLEWARE =====
app.use(requestLogger);

// ===== GLOBAL RATE LIMITING =====
app.use('/api', rateLimiters.general);

// ===== HEALTH CHECK ENDPOINTS =====
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const rateLimitStats = rateLimitMonitor.getStats();

  res.json({
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
      rateLimits: rateLimitStats,
      searchCache: searchService.getCacheStats()
    }
  });
});

// Detailed health check for monitoring
app.get('/health/detailed', (req, res) => {
  const memUsage = process.memoryUsage();

  res.json({
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
      rateLimits: rateLimitMonitor.getStats(),
      searchEngine: 'Fuse.js + MeiliSearch',
      caching: 'node-cache'
    }
  });
});

// ===== API ROUTES =====
app.use('/api/auth', rateLimiters.auth, authRoutes);
app.use('/api/fragrances', fragranceRoutes); // Rate limiting handled in routes
app.use('/api/brands', brandRoutes); // Brands directory
app.use('/api/collections', collectionRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/ai', rateLimiters.heavy, aiRoutes);
app.use('/api/users', userRoutes);

// ===== API DOCUMENTATION =====
app.get('/api', (req, res) => {
  res.json({
    name: 'Fragrance Battle AI API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Modern API for fragrance battle AI application',
    environment: config.NODE_ENV,
    features: Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name),
    searchEngine: 'Fuse.js + MeiliSearch',
    rateLimiting: 'Bottleneck',
    validation: 'Joi',
    logging: 'Winston',
    endpoints: {
      // Health & monitoring
      health: {
        'GET /health': 'Basic health check',
        'GET /health/detailed': 'Detailed system status'
      },

      // Authentication (rate limited)
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/me': 'Get current user info',
        'PUT /api/auth/me': 'Update user profile'
      },

      // Fragrances (intelligent search)
      fragrances: {
        'GET /api/fragrances': 'Get all fragrances with filters',
        'POST /api/fragrances/search': 'Intelligent search with Fuse.js/MeiliSearch',
        'POST /api/fragrances/autocomplete': 'Smart auto-complete suggestions',
        'GET /api/fragrances/:id': 'Get fragrance by ID',
        'POST /api/fragrances': 'Create new fragrance',
        'PUT /api/fragrances/:id': 'Update fragrance',
        'DELETE /api/fragrances/:id': 'Delete fragrance',
        'GET /api/fragrances/analytics/search': 'Search analytics',
        'POST /api/fragrances/analytics/clear-cache': 'Clear search cache (admin)'
      },

      // Collections
      collections: {
        'GET /api/collections': 'Get user collections',
        'POST /api/collections': 'Create collection',
        'GET /api/collections/:id': 'Get collection details',
        'PUT /api/collections/:id': 'Update collection',
        'DELETE /api/collections/:id': 'Delete collection',
        'POST /api/collections/:id/items': 'Add fragrance to collection',
        'DELETE /api/collections/:id/items/:itemId': 'Remove from collection'
      },

      // Battles
      battles: {
        'GET /api/battles': 'Get user battles',
        'POST /api/battles': 'Create battle',
        'GET /api/battles/:id': 'Get battle details',
        'PUT /api/battles/:id': 'Update battle',
        'DELETE /api/battles/:id': 'Delete battle',
        'POST /api/battles/:id/vote': 'Vote in battle',
        'POST /api/battles/:id/complete': 'Complete battle'
      },

      // AI Services (rate limited)
      ai: {
        'POST /api/ai/categorize': 'AI fragrance categorization',
        'GET /api/ai/categorize/:fragranceId': 'Get AI categories for fragrance',
        'POST /api/ai/categorize-batch': 'Batch AI categorization',
        'POST /api/ai/feedback': 'Submit AI feedback',
        'GET /api/ai/health': 'AI service health'
      },

      // User management
      users: {
        'GET /api/users/analytics': 'User analytics',
        'GET /api/users/profile': 'User profile',
        'PUT /api/users/profile': 'Update profile'
      }
    },
    documentation: {
      search: {
        intelligence: 'Typo-tolerant, synonym-aware, intelligent ranking',
        engines: ['Fuse.js', 'MeiliSearch (when available)'],
        features: ['auto-complete', 'suggestions', 'caching', 'analytics']
      },
      rateLimiting: {
        general: `${config.RATE_LIMIT_MAX_REQUESTS} req/${config.RATE_LIMIT_WINDOW_MS}ms`,
        search: `${config.SEARCH_RATE_LIMIT_MAX} req/${config.RATE_LIMIT_WINDOW_MS}ms`,
        auth: '10 req/15min',
        ai: '20 req/15min'
      },
      validation: 'Joi schemas with detailed error messages',
      logging: 'Structured logging with Winston'
    }
  });
});

// ===== ERROR HANDLING =====
app.use(notFoundHandler);
app.use(errorLogger);
app.use(errorHandler);

// ===== CONFIGURATION VALIDATION =====
const validateConfiguration = () => {
  const errors: string[] = [];

  if (!config.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (!config.JWT_SECRET || config.JWT_SECRET === 'dev-secret-key') {
    if (config.NODE_ENV === 'production') {
      errors.push('JWT_SECRET must be set in production');
    } else {
      log.warn('⚠️ Using default JWT secret in development');
    }
  }

  if (errors.length > 0) {
    log.error('❌ Configuration validation failed', { errors });
    process.exit(1);
  }

  // Log feature availability
  if (!features.openAI) {
    log.warn('⚠️ OpenAI API not configured - AI features disabled');
  }

  if (!features.perfumero) {
    log.warn('⚠️ Perfumero API not configured - external search disabled');
  }

  if (!features.meilisearch) {
    log.info('ℹ️ MeiliSearch not configured - using Fuse.js only');
  }
};

// ===== SERVER STARTUP =====
const startServer = async () => {
  try {
    // Validate configuration
    validateConfiguration();

    // Connect to database
    log.info('🔌 Connecting to database...');
    await connectDatabase();
    log.info('✅ Database connected successfully');

    // Initialize search service
    log.info('🔍 Initializing search service...');
    // Search service initializes automatically in constructor

    // Start HTTP server
    const server = app.listen(config.PORT, () => {
      log.info('🚀 Server started successfully', {
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
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      log.info(`🛑 ${signal} received, shutting down gracefully...`);

      server.close(() => {
        log.info('✅ HTTP server closed');

        // Clear rate limiters
        rateLimitMonitor.clearAll();

        // Clear search cache
        searchService.clearCache();

        log.info('🔄 Cleanup completed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        log.error('❌ Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    log.error('❌ Failed to start server', { error });
    process.exit(1);
  }
};

// ===== PERFORMANCE MONITORING =====
if (isDevelopment) {
  // Log memory usage every 30 seconds in development
  setInterval(() => {
    log.performance.memory(process.memoryUsage());
  }, 30000);
}

// Start the server
startServer();

export default app;
