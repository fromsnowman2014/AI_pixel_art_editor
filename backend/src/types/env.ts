import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('8080'),
  HOST: z.string().default('0.0.0.0'),

  // OpenAI API Configuration
  OPENAI_API_KEY: z.string().min(1).optional(), // Optional for development
  OPENAI_MODEL: z.string().default('gpt-image-1'),
  OPENAI_MAX_RETRIES: z.string().transform(Number).pipe(z.number().min(1).max(10)).default('3'),
  OPENAI_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000)).default('30000'),

  // Database Configuration
  DATABASE_URL: z.string().min(1), // Allow any string for SQLite
  POSTGRES_PRISMA_URL: z.string().url().optional(),
  POSTGRES_URL_NON_POOLING: z.string().url().optional(),

  // Redis Configuration
  REDIS_URL: z.string().min(1), // Allow any string for local Redis

  // Storage Configuration (Optional - either R2 or Supabase)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET_NAME: z.string().optional(),

  // JWT Configuration
  JWT_SECRET: z.string().min(8), // Relaxed for development
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Rate Limiting
  RATE_LIMIT_AI_REQUESTS_PER_HOUR: z.string().transform(Number).pipe(z.number().min(1)).default('60'),
  RATE_LIMIT_GLOBAL_BURST: z.string().transform(Number).pipe(z.number().min(1)).default('1000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000)).default('3600000'),
  
  // Anonymous User Limits (COPPA compliance)
  ANONYMOUS_AI_CALLS_PER_HOUR: z.string().transform(Number).pipe(z.number().min(1)).default('10'),
  AUTHENTICATED_AI_CALLS_PER_HOUR: z.string().transform(Number).pipe(z.number().min(1)).default('60'),
  
  // Development/Testing
  API_TEST_TOKEN: z.string().default('dev-test-token-123'),

  // Image Processing
  AI_MAX_IMAGE_SIZE: z.string().transform(Number).pipe(z.number().min(16).max(2048)).default('512'),
  AI_DEFAULT_COLOR_COUNT: z.string().transform(Number).pipe(z.number().min(2).max(256)).default('24'),
  AI_GENERATION_TIMEOUT: z.string().transform(Number).pipe(z.number().min(5000)).default('30000'),
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().min(1024)).default('10485760'),

  // Feature Flags
  ENABLE_AI_GENERATION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_CLOUD_SYNC: z.string().transform(val => val === 'true').default('true'),
  ENABLE_GIF_EXPORT: z.string().transform(val => val === 'true').default('true'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:3001,https://vercel.app'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_FILE: z.string().optional(),

  // Health Check
  HEALTH_CHECK_ENDPOINT: z.string().default('/health'),
  METRICS_ENDPOINT: z.string().default('/metrics'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment configuration:', error);
    process.exit(1);
  }
}

export const env = validateEnv();