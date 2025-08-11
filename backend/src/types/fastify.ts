import { FastifyRequest, FastifyReply } from 'fastify';

// Extend FastifyRequest to include user property
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
      role?: string;
    };
  }
  
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    
    rateLimitAI: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}