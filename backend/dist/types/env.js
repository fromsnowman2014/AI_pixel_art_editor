"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.envSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
exports.envSchema = zod_1.z.object({
    // Server Configuration
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1).max(65535)).default('8080'),
    HOST: zod_1.z.string().default('0.0.0.0'),
    // OpenAI API Configuration
    OPENAI_API_KEY: zod_1.z.string().min(1).optional(), // Optional for development
    OPENAI_MODEL: zod_1.z.string().default('gpt-image-1'),
    OPENAI_MAX_RETRIES: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1).max(10)).default('3'),
    OPENAI_TIMEOUT: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1000)).default('30000'),
    // Database Configuration
    DATABASE_URL: zod_1.z.string().min(1), // Allow any string for SQLite
    POSTGRES_PRISMA_URL: zod_1.z.string().url().optional(),
    POSTGRES_URL_NON_POOLING: zod_1.z.string().url().optional(),
    // Redis Configuration
    REDIS_URL: zod_1.z.string().min(1), // Allow any string for local Redis
    // Storage Configuration (Optional - either R2 or Supabase)
    R2_ACCOUNT_ID: zod_1.z.string().optional(),
    R2_ACCESS_KEY_ID: zod_1.z.string().optional(),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    R2_BUCKET_NAME: zod_1.z.string().optional(),
    R2_PUBLIC_URL: zod_1.z.string().url().optional(),
    SUPABASE_URL: zod_1.z.string().url().optional(),
    SUPABASE_ANON_KEY: zod_1.z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(),
    SUPABASE_BUCKET_NAME: zod_1.z.string().optional(),
    // JWT Configuration
    JWT_SECRET: zod_1.z.string().min(8), // Relaxed for development
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    // Rate Limiting
    RATE_LIMIT_AI_REQUESTS_PER_HOUR: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1)).default('60'),
    RATE_LIMIT_GLOBAL_BURST: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1)).default('1000'),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1000)).default('3600000'),
    // Anonymous User Limits (COPPA compliance)
    ANONYMOUS_AI_CALLS_PER_HOUR: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1)).default('10'),
    AUTHENTICATED_AI_CALLS_PER_HOUR: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1)).default('60'),
    // Development/Testing
    API_TEST_TOKEN: zod_1.z.string().default('dev-test-token-123'),
    // Image Processing
    AI_MAX_IMAGE_SIZE: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(16).max(2048)).default('512'),
    AI_DEFAULT_COLOR_COUNT: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(2).max(256)).default('24'),
    AI_GENERATION_TIMEOUT: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(5000)).default('30000'),
    MAX_FILE_SIZE: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1024)).default('10485760'),
    // Feature Flags
    ENABLE_AI_GENERATION: zod_1.z.string().transform(val => val === 'true').default('true'),
    ENABLE_CLOUD_SYNC: zod_1.z.string().transform(val => val === 'true').default('true'),
    ENABLE_GIF_EXPORT: zod_1.z.string().transform(val => val === 'true').default('true'),
    ENABLE_ANALYTICS: zod_1.z.string().transform(val => val === 'true').default('false'),
    // CORS Configuration
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000,http://localhost:3001,https://vercel.app'),
    // Logging
    LOG_LEVEL: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    LOG_FILE: zod_1.z.string().optional(),
    // Health Check
    HEALTH_CHECK_ENDPOINT: zod_1.z.string().default('/health'),
    METRICS_ENDPOINT: zod_1.z.string().default('/metrics'),
});
function validateEnv() {
    try {
        return exports.envSchema.parse(process.env);
    }
    catch (error) {
        console.error('❌ Invalid environment configuration:', error);
        process.exit(1);
    }
}
exports.env = validateEnv();
//# sourceMappingURL=env.js.map