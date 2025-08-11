import { FastifyRequest, FastifyReply } from 'fastify';
import { AI_RATE_LIMITS } from '../services/rateLimit';
interface RateLimitOptions {
    type: keyof typeof AI_RATE_LIMITS;
    getIdentifier?: (request: FastifyRequest) => string;
    skip?: (request: FastifyRequest) => boolean;
    onLimitReached?: (request: FastifyRequest, reply: FastifyReply) => void;
}
/**
 * AI Generation rate limiting decorator
 */
export declare const aiGenerationRateLimit: (fastify: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>) => Promise<void>;
/**
 * Create rate limit middleware for specific types
 */
export declare function createRateLimitMiddleware(type: keyof typeof AI_RATE_LIMITS, options?: Partial<RateLimitOptions>): (fastify: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, opts: Record<never, never>, done: (err?: Error) => void) => void;
/**
 * General API rate limiting
 */
export declare const apiRateLimit: (fastify: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, opts: Record<never, never>, done: (err?: Error) => void) => void;
/**
 * Burst protection middleware
 */
export declare const burstProtection: (fastify: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, opts: Record<never, never>, done: (err?: Error) => void) => void;
declare const _default: (fastify: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>) => Promise<void>;
export default _default;
//# sourceMappingURL=rateLimit.d.ts.map