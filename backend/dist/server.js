"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const env_1 = require("./types/env");
const logger_1 = require("./utils/logger");
const connection_1 = require("./db/connection");
const rateLimit_1 = require("./services/rateLimit");
const rateLimit_2 = require("./middleware/rateLimit");
const auth_1 = require("./middleware/auth");
// Import route handlers
const ai_1 = require("./routes/ai");
const projects_1 = require("./routes/projects");
const frames_1 = require("./routes/frames");
const export_1 = require("./routes/export");
const fastify = (0, fastify_1.default)({
    logger: {
        level: env_1.env.LOG_LEVEL,
        transport: env_1.env.NODE_ENV === 'development' ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            }
        } : undefined,
    },
});
async function buildServer() {
    try {
        // Security plugins
        await fastify.register(helmet_1.default, {
            contentSecurityPolicy: false, // Disable for API
        });
        // CORS configuration
        await fastify.register(cors_1.default, {
            origin: env_1.env.CORS_ORIGIN.split(','),
            credentials: true,
        });
        // File upload support
        await fastify.register(multipart_1.default, {
            limits: {
                fileSize: env_1.env.MAX_FILE_SIZE,
                files: 5,
            },
        });
        // Register auth plugin
        await fastify.register(auth_1.authPlugin);
        // Register custom rate limiting middleware
        await fastify.register(rateLimit_2.aiGenerationRateLimit);
        await fastify.register(rateLimit_2.apiRateLimit);
        await fastify.register(rateLimit_2.burstProtection);
        // Global rate limiting (fallback)
        await fastify.register(rate_limit_1.default, {
            max: env_1.env.RATE_LIMIT_GLOBAL_BURST,
            timeWindow: env_1.env.RATE_LIMIT_WINDOW_MS,
        });
        // Auth decorators are registered by the authPlugin
        // Health check endpoint
        fastify.get('/health', async () => {
            const [dbHealth, redisHealth] = await Promise.all([
                (0, connection_1.checkDatabaseHealth)(),
                rateLimit_1.rateLimitService.healthCheck(),
            ]);
            const overallHealth = dbHealth && redisHealth ? 'healthy' : 'degraded';
            return {
                status: overallHealth,
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                services: {
                    database: dbHealth ? 'healthy' : 'unhealthy',
                    redis: redisHealth ? 'healthy' : 'unhealthy',
                    storage: 'healthy', // TODO: implement storage health check
                    openai: 'healthy', // TODO: implement OpenAI health check
                },
                metrics: {
                    uptime: process.uptime(),
                    memoryUsage: {
                        used: process.memoryUsage().heapUsed,
                        total: process.memoryUsage().heapTotal,
                        percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
                    },
                    requestCount: 0, // TODO: implement request counting
                    averageResponseTime: 0, // TODO: implement response time tracking
                },
            };
        });
        // API routes
        await fastify.register(ai_1.aiRoutes, { prefix: '/api/ai' });
        await fastify.register(projects_1.projectRoutes, { prefix: '/api/projects' });
        await fastify.register(frames_1.frameRoutes, { prefix: '/api/frames' });
        await fastify.register(export_1.exportRoutes, { prefix: '/api/export' });
        // Global error handler
        fastify.setErrorHandler(async (error, request, reply) => {
            logger_1.logger.error('Unhandled error', {
                error: error.message,
                stack: error.stack,
                request: {
                    method: request.method,
                    url: request.url,
                    headers: request.headers,
                },
            });
            return reply.code(500).send({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred',
                timestamp: new Date().toISOString(),
                path: request.url,
                requestId: request.id,
            });
        });
        // Not found handler
        fastify.setNotFoundHandler(async (request, reply) => {
            return reply.code(404).send({
                error: 'NOT_FOUND',
                message: 'Endpoint not found',
                timestamp: new Date().toISOString(),
                path: request.url,
            });
        });
        return fastify;
    }
    catch (error) {
        logger_1.logger.error('Failed to build server', { error });
        throw error;
    }
}
async function startServer() {
    try {
        const server = await buildServer();
        // Start server
        await server.listen({
            host: env_1.env.HOST,
            port: env_1.env.PORT,
        });
        logger_1.logger.info('Server started successfully', {
            host: env_1.env.HOST,
            port: env_1.env.PORT,
            environment: env_1.env.NODE_ENV,
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}, shutting down gracefully`);
            try {
                await server.close();
                await Promise.all([
                    (0, connection_1.closeDatabaseConnection)(),
                    rateLimit_1.rateLimitService.disconnect(),
                ]);
                logger_1.logger.info('Server shutdown complete');
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error('Error during shutdown', { error });
                process.exit(1);
            }
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', { error });
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=server.js.map