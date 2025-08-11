import { FastifyRequest, FastifyReply, FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { rateLimitService, AI_RATE_LIMITS } from '../services/rateLimit';
import { createLogger } from '../utils/logger';

const logger = createLogger('rate-limit-middleware');

interface RateLimitOptions {
  type: keyof typeof AI_RATE_LIMITS;
  getIdentifier?: (request: FastifyRequest) => string;
  skip?: (request: FastifyRequest) => boolean;
  onLimitReached?: (request: FastifyRequest, reply: FastifyReply) => void;
}

/**
 * Rate limiting middleware plugin
 */
const rateLimitPlugin: FastifyPluginCallback<RateLimitOptions> = (fastify, options, done) => {
  const rateLimitConfig = AI_RATE_LIMITS[options.type];
  
  const getIdentifier = options.getIdentifier || ((request) => {
    // Use user ID if authenticated, otherwise IP address
    return request.user?.id || request.ip || 'unknown';
  });

  const skip = options.skip || (() => false);

  const middleware = async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip rate limiting if condition met
    if (skip(request)) {
      return;
    }

    const identifier = getIdentifier(request);
    
    try {
      const result = await rateLimitService.checkRateLimit({
        identifier,
        type: rateLimitConfig.type,
        limit: rateLimitConfig.limit,
        windowMs: rateLimitConfig.windowMs,
      });

      // Add rate limit headers
      reply.headers({
        'X-RateLimit-Limit': rateLimitConfig.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        'X-RateLimit-Window': Math.ceil(rateLimitConfig.windowMs / 1000).toString(),
      });

      if (!result.allowed) {
        // Add retry after header
        if (result.retryAfter) {
          reply.header('Retry-After', result.retryAfter.toString());
        }

        logger.warn('Rate limit exceeded', {
          identifier,
          type: rateLimitConfig.type,
          current: result.current,
          limit: rateLimitConfig.limit,
          path: request.url,
          method: request.method,
        });

        // Call custom handler if provided
        if (options.onLimitReached) {
          options.onLimitReached(request, reply);
          return;
        }

        // Default rate limit response
        return reply.code(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Maximum ${rateLimitConfig.limit} requests per ${Math.ceil(rateLimitConfig.windowMs / 1000 / 60)} minutes.`,
          limit: rateLimitConfig.limit,
          current: result.current,
          remaining: result.remaining,
          resetTime: new Date(result.resetTime).toISOString(),
          retryAfter: result.retryAfter,
          type: rateLimitConfig.type,
        });
      }

      logger.debug('Rate limit check passed', {
        identifier,
        type: rateLimitConfig.type,
        current: result.current,
        remaining: result.remaining,
        path: request.url,
      });

    } catch (error) {
      logger.error('Rate limit middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        identifier,
        type: rateLimitConfig.type,
        path: request.url,
      });

      // Fail open - allow request to proceed if rate limiting fails
    }
  };

  // Register the middleware
  fastify.addHook('preHandler', middleware);
  
  done();
};

/**
 * AI Generation rate limiting decorator
 */
export const aiGenerationRateLimit = fp(async (fastify) => {
  fastify.decorate('rateLimitAI', async (request: FastifyRequest, reply: FastifyReply) => {
    const identifier = request.user?.id || request.ip || 'unknown';
    
    try {
      const result = await rateLimitService.checkRateLimit({
        identifier,
        type: AI_RATE_LIMITS.AI_GENERATION.type,
        limit: AI_RATE_LIMITS.AI_GENERATION.limit,
        windowMs: AI_RATE_LIMITS.AI_GENERATION.windowMs,
      });

      // Add headers
      reply.headers({
        'X-RateLimit-Limit': AI_RATE_LIMITS.AI_GENERATION.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      if (!result.allowed) {
        if (result.retryAfter) {
          reply.header('Retry-After', result.retryAfter.toString());
        }

        logger.warn('AI generation rate limit exceeded', {
          identifier,
          current: result.current,
          limit: AI_RATE_LIMITS.AI_GENERATION.limit,
          path: request.url,
        });

        return reply.code(429).send({
          error: 'AI_RATE_LIMIT_EXCEEDED',
          message: 'AI generation rate limit exceeded. Maximum 60 requests per hour.',
          limit: AI_RATE_LIMITS.AI_GENERATION.limit,
          current: result.current,
          remaining: result.remaining,
          resetTime: new Date(result.resetTime).toISOString(),
          retryAfter: result.retryAfter,
        });
      }

    } catch (error) {
      logger.error('AI rate limit check failed', { error, identifier });
      // Fail open
    }
  });
});

/**
 * Create rate limit middleware for specific types
 */
export function createRateLimitMiddleware(type: keyof typeof AI_RATE_LIMITS, options?: Partial<RateLimitOptions>) {
  return fp((fastify, opts, done) => {
    rateLimitPlugin(fastify, { type, ...options }, done);
  }, {
    name: `rate-limit-${type}`,
  });
}

/**
 * General API rate limiting
 */
export const apiRateLimit = createRateLimitMiddleware('API_CALLS', {
  skip: (request) => {
    // Skip rate limiting for health checks
    return request.url === '/health' || request.url === '/api/health';
  },
});

/**
 * Burst protection middleware
 */
export const burstProtection = createRateLimitMiddleware('BURST_PROTECTION', {
  onLimitReached: (request, reply) => {
    logger.warn('Burst protection triggered', {
      ip: request.ip,
      path: request.url,
      method: request.method,
      headers: request.headers,
    });

    reply.code(429).send({
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many requests in a short time. Please slow down.',
      retryAfter: 60, // 1 minute
    });
  },
});

export default fp(aiGenerationRateLimit);