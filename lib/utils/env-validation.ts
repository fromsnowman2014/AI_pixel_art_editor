import { z } from 'zod';

/**
 * Environment variables validation schema
 * Ensures all required environment variables are properly configured
 */
const envSchema = z.object({
  // Required for AI functionality
  OPENAI_API_KEY: z.string()
    .min(1, 'OpenAI API key is required')
    .startsWith('sk-', 'OpenAI API key must start with "sk-"')
    .min(20, 'OpenAI API key appears to be invalid (too short)')
    .optional(), // Make optional to prevent initialization crashes
  
  // Next.js configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  
  // Optional feature flags
  ENABLE_AI_GENERATION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_CLOUD_SYNC: z.string().transform(val => val === 'true').default('false'),
  ENABLE_GIF_EXPORT: z.string().transform(val => val === 'true').default('true'),
  
  // Rate limiting
  RATE_LIMIT_AI_REQUESTS_PER_HOUR: z.string().optional().transform(val => parseInt(val || '60') || 60),
  
  // AI configuration
  AI_MAX_IMAGE_SIZE: z.string().transform(val => parseInt(val) || 512),
  AI_DEFAULT_COLOR_COUNT: z.string().transform(val => parseInt(val) || 24),
  AI_GENERATION_TIMEOUT: z.string().transform(val => parseInt(val) || 30000),
  
  // Canvas configuration
  CANVAS_MAX_ZOOM: z.string().transform(val => parseInt(val) || 1600),
  CANVAS_MIN_ZOOM: z.string().transform(val => parseInt(val) || 50),
  CANVAS_DEFAULT_SIZE: z.string().transform(val => parseInt(val) || 32),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * @param env - Environment variables object (defaults to process.env)
 * @returns Validated environment variables
 * @throws Error if validation fails
 */
export function validateEnv(env: Record<string, string | undefined> = process.env): Env {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(
        `Environment validation failed:\n${missingVars.join('\n')}\n\n` +
        `Please check your .env.local file and ensure all required environment variables are set.`
      );
    }
    throw error;
  }
}

/**
 * Check if AI functionality is properly configured
 */
export function isAIEnabled(env: Env = validateEnv()): boolean {
  return env.ENABLE_AI_GENERATION && Boolean(env.OPENAI_API_KEY);
}

/**
 * Get validated environment configuration
 * This function caches the result to avoid repeated validation
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * Reset cached environment (useful for testing)
 */
export function resetEnvCache(): void {
  cachedEnv = null;
}

/**
 * Validate specific service configurations
 */
export const validateServices = {
  openai: (env: Env = getEnv()) => {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }
    
    if (!env.OPENAI_API_KEY.startsWith('sk-')) {
      throw new Error('OpenAI API key format is invalid');
    }
    
    if (env.OPENAI_API_KEY.length < 20) {
      throw new Error('OpenAI API key appears to be too short');
    }
    
    return true;
  },
  
  rateLimit: (env: Env = getEnv()) => {
    if (env.RATE_LIMIT_AI_REQUESTS_PER_HOUR <= 0) {
      throw new Error('Rate limit must be greater than 0');
    }
    
    if (env.RATE_LIMIT_AI_REQUESTS_PER_HOUR > 1000) {
      console.warn('⚠️ High rate limit detected:', env.RATE_LIMIT_AI_REQUESTS_PER_HOUR);
    }
    
    return true;
  },
  
  canvas: (env: Env = getEnv()) => {
    if (env.CANVAS_MIN_ZOOM >= env.CANVAS_MAX_ZOOM) {
      throw new Error('Canvas min zoom must be less than max zoom');
    }
    
    if (env.CANVAS_DEFAULT_SIZE < 8 || env.CANVAS_DEFAULT_SIZE > 128) {
      throw new Error('Canvas default size must be between 8 and 128');
    }
    
    return true;
  },
  
  ai: (env: Env = getEnv()) => {
    if (env.AI_MAX_IMAGE_SIZE < 256 || env.AI_MAX_IMAGE_SIZE > 2048) {
      throw new Error('AI max image size must be between 256 and 2048');
    }
    
    if (env.AI_DEFAULT_COLOR_COUNT < 2 || env.AI_DEFAULT_COLOR_COUNT > 64) {
      throw new Error('AI default color count must be between 2 and 64');
    }
    
    if (env.AI_GENERATION_TIMEOUT < 5000 || env.AI_GENERATION_TIMEOUT > 120000) {
      throw new Error('AI generation timeout must be between 5 and 120 seconds');
    }
    
    return true;
  }
};

/**
 * Validate all services at once
 */
export function validateAllServices(env: Env = getEnv()): boolean {
  try {
    validateServices.openai(env);
    validateServices.rateLimit(env);
    validateServices.canvas(env);
    validateServices.ai(env);
    return true;
  } catch (error) {
    console.error('❌ Service validation failed:', error);
    return false;
  }
}