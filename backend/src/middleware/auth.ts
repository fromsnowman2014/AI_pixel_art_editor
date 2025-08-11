import { FastifyPluginCallback } from 'fastify';
import '../types/fastify';
import { createLogger } from '../utils/logger';
import { env } from '../types/env';

const logger = createLogger('auth-middleware');

export const authPlugin: FastifyPluginCallback = (fastify, options, done) => {
  
  /**
   * Authentication decorator for routes
   * Supports both anonymous users (local-only mode) and authenticated users (cloud sync)
   */
  fastify.decorate('authenticate', async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    const isAnonymousMode = env.NODE_ENV === 'development' || !authHeader;

    try {
      if (isAnonymousMode) {
        // Anonymous/local-only mode - COPPA compliant for under-13 users
        request.user = {
          id: 'anonymous',
          type: 'anonymous',
          permissions: ['create', 'read', 'update', 'delete'], // Full access for local projects
          rateLimits: {
            ai: env.ANONYMOUS_AI_CALLS_PER_HOUR || 10, // Limited AI calls for anonymous users
            projects: 50, // Local projects limit
          },
        };

        logger.debug('Anonymous user authenticated', {
          rateLimits: request.user.rateLimits,
        });
        return;
      }

      // Extract Bearer token
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authorization header required for authenticated access',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate JWT token (simplified for MVP - in production use proper JWT library)
      if (token === env.API_TEST_TOKEN || process.env.NODE_ENV === 'development') {
        // Test/development authentication
        request.user = {
          id: 'dev-user-' + Date.now(),
          type: 'authenticated',
          email: 'test@example.com',
          permissions: ['create', 'read', 'update', 'delete', 'cloud_sync'],
          rateLimits: {
            ai: env.AUTHENTICATED_AI_CALLS_PER_HOUR || 60, // Higher limits for authenticated users
            projects: 1000, // Cloud projects limit
          },
        };

        logger.debug('Development user authenticated', {
          userId: request.user.id,
          permissions: request.user.permissions,
        });
        return;
      }

      // TODO: Implement proper JWT validation for production
      // This would validate against a JWT secret and decode user information
      const userData = await validateJwtToken(token);
      
      if (!userData) {
        return reply.code(401).send({
          error: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }

      request.user = {
        id: userData.sub || userData.id,
        type: 'authenticated',
        email: userData.email,
        permissions: userData.permissions || ['create', 'read', 'update', 'delete', 'cloud_sync'],
        rateLimits: {
          ai: userData.aiCallsLimit || 60,
          projects: userData.projectsLimit || 1000,
        },
      };

      logger.debug('User authenticated successfully', {
        userId: request.user.id,
        userType: request.user.type,
        permissions: request.user.permissions,
      });

    } catch (error) {
      logger.error('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        authHeader: authHeader ? 'present' : 'missing',
      });

      return reply.code(401).send({
        error: 'AUTHENTICATION_ERROR',
        message: 'Failed to authenticate user',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  });

  /**
   * Authorization decorator for routes that require specific permissions
   */
  fastify.decorate('authorize', (requiredPermission: string) => {
    return async (request: any, reply: any) => {
      if (!request.user) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }

      const hasPermission = request.user.permissions.includes(requiredPermission);
      
      if (!hasPermission) {
        logger.warn('Authorization failed', {
          userId: request.user.id,
          requiredPermission,
          userPermissions: request.user.permissions,
        });

        return reply.code(403).send({
          error: 'FORBIDDEN',
          message: `Permission '${requiredPermission}' required`,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }

      logger.debug('User authorized successfully', {
        userId: request.user.id,
        permission: requiredPermission,
      });
    };
  });

  done();
};

/**
 * Validate JWT token (placeholder implementation)
 * In production, use jsonwebtoken library or similar
 */
async function validateJwtToken(token: string): Promise<any> {
  try {
    // TODO: Implement proper JWT validation
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return decoded;
    
    // Placeholder: accept any non-empty token as valid for development
    if (token && token.length > 10) {
      return {
        sub: 'user-' + token.substring(0, 8),
        email: 'user@example.com',
        permissions: ['create', 'read', 'update', 'delete', 'cloud_sync'],
        aiCallsLimit: 60,
        projectsLimit: 1000,
      };
    }
    
    return null;
  } catch (error) {
    logger.error('JWT validation failed', { error });
    return null;
  }
}