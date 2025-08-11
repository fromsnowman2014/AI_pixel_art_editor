import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

import { env } from './types/env';
import { logger } from './utils/logger';
import { db, checkDatabaseHealth, closeDatabaseConnection } from './db/connection';
import { rateLimitService } from './services/rateLimit';
import { aiGenerationRateLimit, apiRateLimit, burstProtection } from './middleware/rateLimit';

// Import route handlers
import { aiRoutes } from './routes/ai';
import { projectRoutes } from './routes/projects';
import { frameRoutes } from './routes/frames';

const fastify = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === 'development' ? {
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
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Disable for API
    });

    // CORS configuration
    await fastify.register(cors, {
      origin: env.CORS_ORIGIN.split(','),
      credentials: true,
    });

    // File upload support
    await fastify.register(multipart, {
      limits: {
        fileSize: env.MAX_FILE_SIZE,
        files: 5,
      },
    });

    // Register custom rate limiting middleware
    await fastify.register(aiGenerationRateLimit);
    await fastify.register(apiRateLimit);
    await fastify.register(burstProtection);

    // Global rate limiting (fallback)
    await fastify.register(rateLimit, {
      max: env.RATE_LIMIT_GLOBAL_BURST,
      timeWindow: env.RATE_LIMIT_WINDOW_MS,
    });


    // Authentication decorator (placeholder)
    fastify.decorate('authenticate', async (request: any, reply: any) => {
      // Implement authentication logic here
      request.user = { id: 'anonymous' };
      return;
    });

    // Health check endpoint
    fastify.get('/health', async () => {
      const [dbHealth, redisHealth] = await Promise.all([
        checkDatabaseHealth(),
        rateLimitService.healthCheck(),
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
    await fastify.register(aiRoutes, { prefix: '/api/ai' });
    await fastify.register(projectRoutes, { prefix: '/api/projects' });
    await fastify.register(frameRoutes, { prefix: '/api/frames' });

    // Global error handler
    fastify.setErrorHandler(async (error, request, reply) => {
      logger.error('Unhandled error', {
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
  } catch (error) {
    logger.error('Failed to build server', { error });
    throw error;
  }
}

async function startServer() {
  try {
    const server = await buildServer();

    // Start server
    await server.listen({
      host: env.HOST,
      port: env.PORT,
    });

    logger.info('Server started successfully', {
      host: env.HOST,
      port: env.PORT,
      environment: env.NODE_ENV,
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      try {
        await server.close();
        await Promise.all([
          closeDatabaseConnection(),
          rateLimitService.disconnect(),
        ]);
        logger.info('Server shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { buildServer };