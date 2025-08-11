import { createClient, RedisClientType } from 'redis';
import { env } from '../types/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('rate-limit-service');

export class RateLimitService {
  private redis: RedisClientType;
  private connected = false;

  constructor() {
    this.redis = createClient({
      url: env.REDIS_URL,
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
      this.connected = true;
    });

    this.redis.on('error', (error: Error) => {
      logger.error('Redis connection error', { error });
      this.connected = false;
    });

    this.redis.on('end', () => {
      logger.warn('Redis connection closed');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.redis.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.redis.disconnect();
    }
  }

  /**
   * Check if request is within rate limits using sliding window
   */
  async checkRateLimit(params: {
    identifier: string; // IP address or user ID
    type: string; // 'ai_generation', 'api_calls', etc.
    limit: number; // Max requests per window
    windowMs: number; // Window size in milliseconds
  }): Promise<{
    allowed: boolean;
    current: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    try {
      await this.connect();

      const key = `rate_limit:${params.type}:${params.identifier}`;
      const now = Date.now();
      const windowStart = now - params.windowMs;

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.multi();

      // Remove expired entries (sliding window)
      pipeline.zRemRangeByScore(key, '-inf', windowStart);

      // Count current requests in window
      pipeline.zCard(key);

      // Add current request timestamp
      pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });

      // Set expiry for cleanup
      pipeline.expire(key, Math.ceil(params.windowMs / 1000) * 2);

      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline failed');
      }

      const currentCount = (results[1] as number) || 0;
      const allowed = currentCount < params.limit;
      const remaining = Math.max(0, params.limit - currentCount - 1);
      const resetTime = now + params.windowMs;

      let retryAfter: number | undefined;
      if (!allowed) {
        // Get the oldest request timestamp in the window
        const oldestRequestResult = await this.redis.zRangeWithScores(key, 0, 0);
        if (oldestRequestResult.length > 0) {
          const oldestTimestamp = oldestRequestResult[0].score;
          retryAfter = Math.ceil((oldestTimestamp + params.windowMs - now) / 1000);
        }
      }

      logger.debug('Rate limit check', {
        identifier: params.identifier,
        type: params.type,
        allowed,
        current: currentCount + (allowed ? 1 : 0),
        remaining,
        limit: params.limit,
        windowMs: params.windowMs,
        retryAfter,
      });

      return {
        allowed,
        current: currentCount + (allowed ? 1 : 0),
        remaining,
        resetTime,
        retryAfter,
      };

    } catch (error) {
      logger.error('Rate limit check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        identifier: params.identifier,
        type: params.type,
      });

      // Fail open on Redis errors (allow request but log error)
      return {
        allowed: true,
        current: 0,
        remaining: params.limit,
        resetTime: Date.now() + params.windowMs,
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier and type
   */
  async resetRateLimit(identifier: string, type: string): Promise<void> {
    try {
      await this.connect();
      const key = `rate_limit:${type}:${identifier}`;
      await this.redis.del(key);
      
      logger.info('Rate limit reset', { identifier, type });
    } catch (error) {
      logger.error('Failed to reset rate limit', {
        error: error instanceof Error ? error.message : 'Unknown error',
        identifier,
        type,
      });
    }
  }

  /**
   * Get current rate limit status without modifying
   */
  async getRateLimitStatus(params: {
    identifier: string;
    type: string;
    limit: number;
    windowMs: number;
  }): Promise<{
    current: number;
    remaining: number;
    resetTime: number;
  }> {
    try {
      await this.connect();

      const key = `rate_limit:${params.type}:${params.identifier}`;
      const now = Date.now();
      const windowStart = now - params.windowMs;

      // Clean up expired entries and count
      await this.redis.zRemRangeByScore(key, '-inf', windowStart);
      const current = await this.redis.zCard(key);
      
      const remaining = Math.max(0, params.limit - current);
      const resetTime = now + params.windowMs;

      return {
        current,
        remaining,
        resetTime,
      };

    } catch (error) {
      logger.error('Failed to get rate limit status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        identifier: params.identifier,
        type: params.type,
      });

      // Return safe defaults on error
      return {
        current: 0,
        remaining: params.limit,
        resetTime: Date.now() + params.windowMs,
      };
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    totalKeys: number;
    activeRateLimits: number;
  }> {
    try {
      await this.connect();
      
      const keys = await this.redis.keys('rate_limit:*');
      const activeKeys = await Promise.all(
        keys.map(async (key: string) => {
          const count = await this.redis.zCard(key);
          return count > 0 ? 1 : 0;
        })
      );

      return {
        connected: this.connected,
        totalKeys: keys.length,
        activeRateLimits: activeKeys.reduce((sum: number, active: number) => sum + active, 0),
      };

    } catch (error) {
      logger.error('Failed to get rate limit stats', { error });
      return {
        connected: false,
        totalKeys: 0,
        activeRateLimits: 0,
      };
    }
  }
}

// Singleton instance
export const rateLimitService = new RateLimitService();

/**
 * AI-specific rate limiting constants
 */
export const AI_RATE_LIMITS = {
  AI_GENERATION: {
    type: 'ai_generation',
    limit: 60, // 60 requests per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  AI_VARIATIONS: {
    type: 'ai_variations',
    limit: 40, // 40 variation requests per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  API_CALLS: {
    type: 'api_calls',
    limit: 1000, // 1000 API calls per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  BURST_PROTECTION: {
    type: 'burst',
    limit: 10, // 10 requests per minute
    windowMs: 60 * 1000, // 1 minute
  },
} as const;