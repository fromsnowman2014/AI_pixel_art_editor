"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.burstProtection = exports.apiRateLimit = exports.aiGenerationRateLimit = void 0;
exports.createRateLimitMiddleware = createRateLimitMiddleware;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const rateLimit_1 = require("../services/rateLimit");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('rate-limit-middleware');
/**
 * Rate limiting middleware plugin
 */
const rateLimitPlugin = (fastify, options, done) => {
    const rateLimitConfig = rateLimit_1.AI_RATE_LIMITS[options.type];
    const getIdentifier = options.getIdentifier || ((request) => {
        // Use user ID if authenticated, otherwise IP address
        return request.user?.id || request.ip || 'unknown';
    });
    const skip = options.skip || (() => false);
    const middleware = async (request, reply) => {
        // Skip rate limiting if condition met
        if (skip(request)) {
            return;
        }
        const identifier = getIdentifier(request);
        try {
            const result = await rateLimit_1.rateLimitService.checkRateLimit({
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
        }
        catch (error) {
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
exports.aiGenerationRateLimit = (0, fastify_plugin_1.default)(async (fastify) => {
    fastify.decorate('rateLimitAI', async (request, reply) => {
        const identifier = request.user?.id || request.ip || 'unknown';
        try {
            const result = await rateLimit_1.rateLimitService.checkRateLimit({
                identifier,
                type: rateLimit_1.AI_RATE_LIMITS.AI_GENERATION.type,
                limit: rateLimit_1.AI_RATE_LIMITS.AI_GENERATION.limit,
                windowMs: rateLimit_1.AI_RATE_LIMITS.AI_GENERATION.windowMs,
            });
            // Add headers
            reply.headers({
                'X-RateLimit-Limit': rateLimit_1.AI_RATE_LIMITS.AI_GENERATION.limit.toString(),
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
                    limit: rateLimit_1.AI_RATE_LIMITS.AI_GENERATION.limit,
                    path: request.url,
                });
                return reply.code(429).send({
                    error: 'AI_RATE_LIMIT_EXCEEDED',
                    message: 'AI generation rate limit exceeded. Maximum 60 requests per hour.',
                    limit: rateLimit_1.AI_RATE_LIMITS.AI_GENERATION.limit,
                    current: result.current,
                    remaining: result.remaining,
                    resetTime: new Date(result.resetTime).toISOString(),
                    retryAfter: result.retryAfter,
                });
            }
        }
        catch (error) {
            logger.error('AI rate limit check failed', { error, identifier });
            // Fail open
        }
    });
});
/**
 * Create rate limit middleware for specific types
 */
function createRateLimitMiddleware(type, options) {
    return (0, fastify_plugin_1.default)((fastify, opts, done) => {
        rateLimitPlugin(fastify, { type, ...options }, done);
    }, {
        name: `rate-limit-${type}`,
    });
}
/**
 * General API rate limiting
 */
exports.apiRateLimit = createRateLimitMiddleware('API_CALLS', {
    skip: (request) => {
        // Skip rate limiting for health checks
        return request.url === '/health' || request.url === '/api/health';
    },
});
/**
 * Burst protection middleware
 */
exports.burstProtection = createRateLimitMiddleware('BURST_PROTECTION', {
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
exports.default = (0, fastify_plugin_1.default)(exports.aiGenerationRateLimit);
//# sourceMappingURL=rateLimit.js.map