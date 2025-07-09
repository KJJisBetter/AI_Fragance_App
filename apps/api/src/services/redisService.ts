/**
 * Redis Caching Service
 * Replaces node-cache with Redis for better performance and scalability
 */

import Redis from 'ioredis';
import { config } from '../config';
import { log } from '../utils/logger';

export class RedisCache {
  private client: Redis;
  private connected = false;

  constructor() {
    this.client = new Redis({
      host: config.REDIS_HOST || 'localhost',
      port: config.REDIS_PORT || 6379,
      password: config.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: 'fragrance-api:',
      connectTimeout: 5000,
      commandTimeout: 3000
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('connect', () => {
      this.connected = true;
      log.info('✅ Redis connected successfully');
    });

    this.client.on('error', (error) => {
      this.connected = false;
      log.error('❌ Redis connection error', { error: error.message });
    });

    this.client.on('close', () => {
      this.connected = false;
      log.warn('⚠️ Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      log.info('🔄 Redis reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      log.info('✅ Redis connection established');
    } catch (error) {
      log.error('❌ Failed to connect to Redis', { error });
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.connected) {
        return null;
      }

      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      log.error('❌ Redis GET error', { key, error });
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      if (!this.connected) {
        return;
      }

      await this.client.setex(key, ttl, JSON.stringify(value));
      log.debug('✅ Redis SET success', { key, ttl });
    } catch (error) {
      log.error('❌ Redis SET error', { key, error });
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.connected) {
        return;
      }

      await this.client.del(key);
      log.debug('✅ Redis DEL success', { key });
    } catch (error) {
      log.error('❌ Redis DEL error', { key, error });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.connected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      log.error('❌ Redis EXISTS error', { key, error });
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.connected) {
        return [];
      }

      const keys = await this.client.keys(pattern);
      return keys.map(key => key.replace('fragrance-api:', ''));
    } catch (error) {
      log.error('❌ Redis KEYS error', { pattern, error });
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.connected) {
        return;
      }

      await this.client.flushdb();
      log.info('✅ Redis cache cleared');
    } catch (error) {
      log.error('❌ Redis CLEAR error', { error });
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.connected || keys.length === 0) {
        return [];
      }

      const values = await this.client.mget(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      log.error('❌ Redis MGET error', { keys, error });
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Record<string, any>, ttl: number = 300): Promise<void> {
    try {
      if (!this.connected || Object.keys(keyValuePairs).length === 0) {
        return;
      }

      const pipeline = this.client.pipeline();

      Object.entries(keyValuePairs).forEach(([key, value]) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });

      await pipeline.exec();
      log.debug('✅ Redis MSET success', { count: Object.keys(keyValuePairs).length });
    } catch (error) {
      log.error('❌ Redis MSET error', { error });
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keys: number;
    hits: number;
    misses: number;
  }> {
    try {
      if (!this.connected) {
        return {
          connected: false,
          memory: '0MB',
          keys: 0,
          hits: 0,
          misses: 0
        };
      }

      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      const stats = await this.client.info('stats');

      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : '0MB';

      const keysMatch = keyspace.match(/keys=(\d+)/);
      const keys = keysMatch ? parseInt(keysMatch[1]) : 0;

      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;

      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      const misses = missesMatch ? parseInt(missesMatch[1]) : 0;

      return {
        connected: true,
        memory,
        keys,
        hits,
        misses
      };
    } catch (error) {
      log.error('❌ Redis stats error', { error });
      return {
        connected: false,
        memory: '0MB',
        keys: 0,
        hits: 0,
        misses: 0
      };
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.connected = false;
      log.info('✅ Redis disconnected gracefully');
    } catch (error) {
      log.error('❌ Redis disconnect error', { error });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Export singleton instance
export const cache = new RedisCache();

// Auto-connect when module is imported
if (config.NODE_ENV !== 'test') {
  cache.connect();
}
