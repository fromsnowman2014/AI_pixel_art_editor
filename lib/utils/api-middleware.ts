import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEnv, isAIEnabled } from './env-validation';
import { logger } from './smart-logger';

/**
 * API Middleware utilities for request validation, security, and error handling
 */

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: any;
}

/**
 * Create standardized API error response
 */
export function createErrorResponse(
  message: string,
  code: string,
  status: number = 500,
  details?: any
): NextResponse {
  const error: ApiError = {
    message,
    code,
    status,
    details
  };

  console.error(`❌ API Error [${code}]:`, { message, status, details });

  return NextResponse.json({
    success: false,
    error
  }, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}

/**
 * Create standardized API success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json({
    success: true,
    data
  }, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...headers
    }
  });
}

/**
 * Validate request body against Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return {
        success: false,
        response: createErrorResponse(
          'Request validation failed',
          'VALIDATION_ERROR',
          400,
          result.error.issues
        )
      };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      response: createErrorResponse(
        'Invalid JSON in request body',
        'INVALID_JSON',
        400,
        error instanceof Error ? error.message : 'Unknown parsing error'
      )
    };
  }
}

/**
 * Rate limiting functionality
 */
interface RateLimitInfo {
  count: number;
  resetTime: number;
  windowStart: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitInfo>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(this.store.entries());
      for (const [key, info] of entries) {
        if (now > info.resetTime) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   */
  checkLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number = 60 * 60 * 1000 // 1 hour default
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const existing = this.store.get(identifier);

    if (!existing || now > existing.resetTime) {
      // First request or window expired
      const resetTime = now + windowMs;
      this.store.set(identifier, {
        count: 1,
        resetTime,
        windowStart: now
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime
      };
    }

    if (existing.count >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        retryAfter: Math.ceil((existing.resetTime - now) / 1000)
      };
    }

    // Increment counter
    existing.count++;
    this.store.set(identifier, existing);

    return {
      allowed: true,
      remaining: maxRequests - existing.count,
      resetTime: existing.resetTime
    };
  }

  /**
   * Get client identifier for rate limiting
   */
  getClientId(request: NextRequest): string {
    // Try to get real IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0]?.trim() || 'unknown' : realIp || 'unknown';
    
    // In production, you might want to use user ID if authenticated
    const userId = request.headers.get('authorization'); // Simple example
    
    return userId ? `user:${userId.substring(0, 10)}` : `ip:${ip}`;
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Apply rate limiting to request
 */
export function applyRateLimit(
  request: NextRequest,
  maxRequests: number = getEnv().RATE_LIMIT_AI_REQUESTS_PER_HOUR,
  windowMs: number = 60 * 60 * 1000 // 1 hour
): { success: true; headers: Record<string, string> } | { success: false; response: NextResponse } {
  const clientId = rateLimiter.getClientId(request);
  const limitResult = rateLimiter.checkLimit(clientId, maxRequests, windowMs);

  const headers = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': limitResult.remaining.toString(),
    'X-RateLimit-Reset': limitResult.resetTime.toString(),
  };

  if (!limitResult.allowed) {
    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: {
          message: `Rate limit exceeded. Try again after ${new Date(limitResult.resetTime).toISOString()}`,
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429
        }
      }, {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': limitResult.retryAfter?.toString() || '3600',
        }
      })
    };
  }

  return { success: true, headers };
}

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
} as const;

/**
 * Dynamic CORS headers for API responses
 */
function getCorsHeaders(): Record<string, string> {
  // In production, allow specific origins
  let allowedOrigin = '*';
  
  if (process.env.NODE_ENV === 'production') {
    // Allow Vercel frontend domain in production
    allowedOrigin = 'https://ai-pixel-art-editor.vercel.app';
    
    // Check for custom environment variable
    if (process.env.CORS_ALLOWED_ORIGIN) {
      allowedOrigin = process.env.CORS_ALLOWED_ORIGIN;
    }
  }
  
  console.log(`🌐 CORS Origin set to: ${allowedOrigin}`);
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Bypass-Processing',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * CORS headers for API responses
 */
export const CORS_HEADERS = getCorsHeaders();

/**
 * Check if AI services are available
 */
export function checkAIServiceAvailability(): { available: true } | { available: false; response: NextResponse } {
  if (!isAIEnabled()) {
    return {
      available: false,
      response: createErrorResponse(
        'AI generation service is not available',
        'AI_SERVICE_UNAVAILABLE',
        503
      )
    };
  }

  try {
    const env = getEnv();
    if (!env.OPENAI_API_KEY) {
      return {
        available: false,
        response: createErrorResponse(
          'AI service configuration is incomplete',
          'AI_CONFIG_ERROR',
          503
        )
      };
    }
  } catch (error) {
    return {
      available: false,
      response: createErrorResponse(
        'Environment configuration error',
        'CONFIG_ERROR',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      )
    };
  }

  return { available: true };
}

/**
 * Input sanitization helpers
 */
export const sanitize = {
  /**
   * Sanitize text input for AI prompts
   */
  prompt: (input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 1000); // Limit length
  },

  /**
   * Sanitize filename
   */
  filename: (input: string): string => {
    return input
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);
  },

  /**
   * Sanitize numeric input with bounds
   */
  number: (input: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, Math.floor(input)));
  }
};

/**
 * Safe error information extraction
 */
export function getErrorInfo(error: unknown): {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: 'cause' in error ? (error as any).cause : undefined
    };
  }
  
  if (typeof error === 'string') {
    return {
      name: 'StringError',
      message: error,
      stack: undefined,
      cause: undefined
    };
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return {
      name: 'UnknownError',
      message: String(error.message),
      stack: undefined,
      cause: error
    };
  }
  
  return {
    name: 'UnknownError',
    message: 'An unknown error occurred',
    stack: undefined,
    cause: error
  };
}

/**
 * Enhanced logging utility for API requests with performance metrics
 */
export function logApiRequest(
  request: NextRequest,
  endpoint: string,
  startTime: number,
  success: boolean,
  details?: any
) {
  const duration = Date.now() - startTime;
  const method = request.method;
  const userAgent = request.headers.get('user-agent')?.substring(0, 100);
  const clientId = rateLimiter.getClientId(request);

  // Enhanced performance metrics
  const performanceMetrics = {
    endpoint,
    method,
    duration_ms: duration,
    success,
    timestamp: new Date().toISOString(),
    // Performance classification
    performance_tier: duration < 100 ? 'fast' : duration < 500 ? 'normal' : duration < 2000 ? 'slow' : 'critical',
    // Request metadata
    client_type: userAgent?.includes('curl') ? 'cli' : 
                 userAgent?.includes('Mozilla') ? 'browser' : 'api',
    client_id_hash: clientId.substring(0, 8), // Truncated for privacy
    // Additional context
    ...(details && { context: details })
  };

  // Log with appropriate level based on performance and success
  if (success) {
    if (duration > 2000) {
      logger.warn('API request completed but slow', performanceMetrics);
    } else {
      logger.info('API request completed', performanceMetrics);
    }
  } else {
    logger.error('API request failed', performanceMetrics);
  }

  // Additional monitoring metrics for Railway (structured logs when enabled)
  if (process.env.STRUCTURED_LOGS === 'true') {
    logger.info('api_metrics', {
      metric_type: 'api_request',
      endpoint_hash: Buffer.from(endpoint).toString('base64').substring(0, 12),
      response_time_ms: duration,
      status: success ? 'success' : 'error',
      performance_score: Math.max(0, 100 - Math.floor(duration / 10)), // 0-100 score
      timestamp_unix: Math.floor(Date.now() / 1000)
    });
  }
}

// Clean up resources on process exit
process.on('SIGTERM', () => rateLimiter.destroy());
process.on('SIGINT', () => rateLimiter.destroy());