export declare class RateLimitService {
    private redis;
    private connected;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Check if request is within rate limits using sliding window
     */
    checkRateLimit(params: {
        identifier: string;
        type: string;
        limit: number;
        windowMs: number;
    }): Promise<{
        allowed: boolean;
        current: number;
        remaining: number;
        resetTime: number;
        retryAfter?: number;
    }>;
    /**
     * Reset rate limit for a specific identifier and type
     */
    resetRateLimit(identifier: string, type: string): Promise<void>;
    /**
     * Get current rate limit status without modifying
     */
    getRateLimitStatus(params: {
        identifier: string;
        type: string;
        limit: number;
        windowMs: number;
    }): Promise<{
        current: number;
        remaining: number;
        resetTime: number;
    }>;
    /**
     * Health check for Redis connection
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get rate limiting statistics
     */
    getStats(): Promise<{
        connected: boolean;
        totalKeys: number;
        activeRateLimits: number;
    }>;
}
export declare const rateLimitService: RateLimitService;
/**
 * AI-specific rate limiting constants
 */
export declare const AI_RATE_LIMITS: {
    readonly AI_GENERATION: {
        readonly type: "ai_generation";
        readonly limit: 60;
        readonly windowMs: number;
    };
    readonly AI_VARIATIONS: {
        readonly type: "ai_variations";
        readonly limit: 40;
        readonly windowMs: number;
    };
    readonly API_CALLS: {
        readonly type: "api_calls";
        readonly limit: 1000;
        readonly windowMs: number;
    };
    readonly BURST_PROTECTION: {
        readonly type: "burst";
        readonly limit: 10;
        readonly windowMs: number;
    };
};
//# sourceMappingURL=rateLimit.d.ts.map