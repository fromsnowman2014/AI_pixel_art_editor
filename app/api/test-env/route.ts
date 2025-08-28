import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/domain/env-validation';
import { CORS_HEADERS } from '@/lib/services/api-middleware';

/**
 * Environment Test API
 * GET /api/test-env
 * 
 * Simple endpoint to test environment variable configuration
 */
export async function GET(request: NextRequest) {
  console.log('🔧 Environment test endpoint called');

  try {
    const env = getEnv();
    
    const result = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      openaiKeyPresent: Boolean(env.OPENAI_API_KEY),
      openaiKeyFormat: env.OPENAI_API_KEY ? 
        (env.OPENAI_API_KEY.startsWith('sk-') ? 'valid_prefix' : 'invalid_prefix') : 
        'missing',
      openaiKeyLength: env.OPENAI_API_KEY ? env.OPENAI_API_KEY.length : 0,
      enableAiGeneration: env.ENABLE_AI_GENERATION,
      rateLimit: env.RATE_LIMIT_AI_REQUESTS_PER_HOUR,
      aiTimeout: env.AI_GENERATION_TIMEOUT,
      railways: {
        requestId: request.headers.get('x-railway-request-id') || 'unknown',
        environment: 'Railway deployment detected'
      }
    };

    console.log('✅ Environment test successful:', result);

    return NextResponse.json({
      success: true,
      data: result
    }, {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (error) {
    console.error('❌ Environment test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Environment test failed',
        code: 'ENV_TEST_ERROR'
      }
    }, {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}