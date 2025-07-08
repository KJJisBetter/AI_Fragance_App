/**
 * Configuration Management System
 * Centralized, type-safe configuration with proper defaults
 */

import dotenv from 'dotenv-safe';
import path from 'path';

// Load environment variables with validation
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  example: path.resolve(process.cwd(), '.env.example'),
  allowEmptyValues: true
});

export interface Config {
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // Database
  DATABASE_URL: string;

  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRY: string;

  // APIs
  OPENAI_API_KEY?: string;
  PERFUMERO_API_KEY?: string;
  PERFUMERO_BASE_URL: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  SEARCH_RATE_LIMIT_MAX: number;

  // Search & Performance
  SEARCH_RESULTS_LIMIT: number;
  SEARCH_TIMEOUT_MS: number;
  CACHE_TTL_SECONDS: number;

  // MeiliSearch
  MEILISEARCH_URL: string;
  MEILISEARCH_API_KEY?: string;

  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  LOG_FORMAT: 'json' | 'simple';

  // Development
  DEV_SEARCH_LIMIT: number;
  DEV_ENABLE_CORS: boolean;
}

// Parse and validate configuration
function parseConfig(): Config {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // Environment
    NODE_ENV: (process.env.NODE_ENV as Config['NODE_ENV']) || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),

    // Database
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/fragrance_battle',

    // Authentication
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key',
    JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',

    // APIs
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PERFUMERO_API_KEY: process.env.PERFUMERO_API_KEY,
    PERFUMERO_BASE_URL: process.env.PERFUMERO_BASE_URL || 'https://perfumero.p.rapidapi.com',

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (isDevelopment ? '1000' : '100'), 10), // Much higher in dev
    SEARCH_RATE_LIMIT_MAX: parseInt(process.env.SEARCH_RATE_LIMIT_MAX || (isDevelopment ? '500' : '50'), 10), // Much higher in dev

    // Search & Performance
    SEARCH_RESULTS_LIMIT: isDevelopment ? 15 : 50,
    SEARCH_TIMEOUT_MS: isDevelopment ? 5000 : 10000,
    CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10), // 5 minutes

    // MeiliSearch
    MEILISEARCH_URL: process.env.MEILISEARCH_URL || 'http://localhost:7700',
    MEILISEARCH_API_KEY: process.env.MEILISEARCH_API_KEY,

    // Logging
    LOG_LEVEL: (process.env.LOG_LEVEL as Config['LOG_LEVEL']) || (isDevelopment ? 'debug' : 'info'),
    LOG_FORMAT: (process.env.LOG_FORMAT as Config['LOG_FORMAT']) || (isDevelopment ? 'simple' : 'json'),

    // Development
    DEV_SEARCH_LIMIT: 15,
    DEV_ENABLE_CORS: isDevelopment
  };
}

// Validate critical configuration
function validateConfig(config: Config): void {
  const errors: string[] = [];

  if (!config.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (!config.JWT_SECRET || config.JWT_SECRET === 'dev-secret-key') {
    if (config.NODE_ENV === 'production') {
      errors.push('JWT_SECRET must be set in production');
    }
  }

  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Export singleton config
export const config = parseConfig();
validateConfig(config);

// Export helpers
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Feature flags based on configuration
export const features = {
  openAI: !!config.OPENAI_API_KEY,
  perfumero: !!config.PERFUMERO_API_KEY,
  meilisearch: !!config.MEILISEARCH_URL,
  developmentMode: isDevelopment,
  corsEnabled: config.DEV_ENABLE_CORS
};

console.log('🔧 Configuration loaded:', {
  environment: config.NODE_ENV,
  port: config.PORT,
  features: Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
    .join(', ') || 'none'
});
