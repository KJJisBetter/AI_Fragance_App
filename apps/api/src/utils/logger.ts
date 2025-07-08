/**
 * Structured Logging System using Winston
 * Replaces console.log with proper logging infrastructure
 */

import winston from 'winston';
import { config } from '../config';

// Custom log format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}] ${message}${stack ? `\n${stack}` : ''}${metaString}`;
  })
);

// Production format (structured JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: config.LOG_FORMAT === 'json' ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'fragrance-battle-api',
    environment: config.NODE_ENV
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      silent: config.NODE_ENV === 'test'
    }),

    // File transports for production
    ...(config.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ] : [])
  ]
});

// Custom log methods for different contexts
export const log = {
  // General logging
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),

  // API-specific logging
  api: {
    request: (method: string, path: string, userId?: string) =>
      logger.info(`API Request: ${method} ${path}`, { method, path, userId }),

    response: (method: string, path: string, status: number, duration: number) =>
      logger.info(`API Response: ${method} ${path} ${status} (${duration}ms)`,
        { method, path, status, duration }),

    error: (method: string, path: string, error: Error, userId?: string) =>
      logger.error(`API Error: ${method} ${path}`, {
        method, path, error: error.message, stack: error.stack, userId
      })
  },

  // Search-specific logging
  search: {
    query: (query: string, results: number, duration: number, strategy?: string) =>
      logger.info(`Search: "${query}" → ${results} results (${duration}ms)`,
        { query, results, duration, strategy }),

    intelligence: (original: string, strategy: any, results: number) =>
      logger.debug(`Search Intelligence: "${original}"`, { strategy, results }),

    cache: (query: string, hit: boolean) =>
      logger.debug(`Search Cache: "${query}" ${hit ? 'HIT' : 'MISS'}`, { query, hit }),

    error: (query: string, error: Error) =>
      logger.error(`Search Error: "${query}"`, { query, error: error.message })
  },

  // Database logging
  db: {
    query: (operation: string, table: string, duration: number) =>
      logger.debug(`DB Query: ${operation} ${table} (${duration}ms)`,
        { operation, table, duration }),

    error: (operation: string, table: string, error: Error) =>
      logger.error(`DB Error: ${operation} ${table}`, {
        operation, table, error: error.message
      })
  },

  // External API logging
  external: {
    request: (service: string, endpoint: string, method: string) =>
      logger.info(`External API: ${service} ${method} ${endpoint}`,
        { service, endpoint, method }),

    response: (service: string, endpoint: string, status: number, duration: number) =>
      logger.info(`External API Response: ${service} ${status} (${duration}ms)`,
        { service, endpoint, status, duration }),

    error: (service: string, endpoint: string, error: Error) =>
      logger.error(`External API Error: ${service} ${endpoint}`, {
        service, endpoint, error: error.message
      }),

    rateLimit: (service: string, remaining: number, resetTime: string) =>
      logger.warn(`Rate Limit: ${service} - ${remaining} remaining (resets ${resetTime})`,
        { service, remaining, resetTime })
  },

  // Performance logging
  performance: {
    slow: (operation: string, duration: number, threshold: number) =>
      logger.warn(`Slow Operation: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
        { operation, duration, threshold }),

    memory: (usage: NodeJS.MemoryUsage) =>
      logger.debug('Memory Usage', {
        heap: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
      })
  }
};

// Express middleware for request logging
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  const userId = req.user?.id;

  log.api.request(method, originalUrl, userId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    log.api.response(method, originalUrl, res.statusCode, duration);

    // Log slow requests
    if (duration > 1000) {
      log.performance.slow(method, duration, 1000);
    }
  });

  next();
};

// Error logging middleware
export const errorLogger = (error: Error, req: any, res: any, next: any) => {
  const { method, originalUrl } = req;
  const userId = req.user?.id;

  log.api.error(method, originalUrl, error, userId);
  next(error);
};

// Performance monitoring helper
export const performanceMonitor = {
  start: (operation: string) => {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        log.performance.slow(operation, duration, 500);
        return duration;
      }
    };
  }
};

// Startup logging
log.info('🚀 Logger initialized', {
  level: config.LOG_LEVEL,
  format: config.LOG_FORMAT,
  environment: config.NODE_ENV
});

export default logger;
