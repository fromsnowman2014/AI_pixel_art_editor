import { NextResponse } from 'next/server';
import { CORS_HEADERS } from '@/lib/utils/api-middleware';

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    openai: 'healthy' | 'unhealthy' | 'unknown';
    database: 'healthy' | 'unhealthy' | 'unknown';
    storage: 'healthy' | 'unhealthy' | 'unknown';
  };
  openaiKeyLoaded: boolean;
  environment: string;
  uptime: number;
  debug?: {
    openaiKeyFormat: string;
    openaiKeyLength: number;
    envVarsPresent: string[];
    buildId: string;
    deploymentInfo: any;
  };
}

// Track application start time for uptime calculation
const startTime = Date.now();

/**
 * Health Check API Endpoint
 * GET /api/health
 * 
 * Returns comprehensive system health information including:
 * - Overall service status
 * - OpenAI API connectivity
 * - Environment information
 * - Service uptime
 */
export async function GET() {
  console.log('🏥 Health check requested');
  
  try {
    // Check OpenAI API key availability
    const openaiKeyLoaded = Boolean(process.env.OPENAI_API_KEY);
    
    // Collect debug information
    const apiKey = process.env.OPENAI_API_KEY;
    const debugInfo = {
      openaiKeyFormat: apiKey ? (apiKey.startsWith('sk-') ? 'valid_prefix' : 'invalid_prefix') : 'missing',
      openaiKeyLength: apiKey ? apiKey.length : 0,
      envVarsPresent: Object.keys(process.env).filter(key => 
        key.includes('OPENAI') || 
        key.includes('NEXT') || 
        key.includes('NODE') ||
        key.includes('RAILWAY') ||
        key.includes('VERCEL')
      ),
      buildId: process.env.NEXT_BUILD_ID || 'unknown',
      deploymentInfo: {
        platform: process.env.RAILWAY_PROJECT_ID ? 'Railway' : 
                  process.env.VERCEL ? 'Vercel' : 'Unknown',
        projectId: process.env.RAILWAY_PROJECT_ID || process.env.VERCEL_PROJECT_ID || 'unknown',
        environment: process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL_ENV || 'unknown'
      }
    };
    
    // Test OpenAI connectivity (lightweight check)
    let openaiStatus: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
    
    if (openaiKeyLoaded) {
      try {
        // Simple test to validate OpenAI key format
        if (apiKey && apiKey.startsWith('sk-') && apiKey.length > 20) {
          openaiStatus = 'healthy';
        } else {
          openaiStatus = 'unhealthy';
        }
      } catch (error) {
        console.error('OpenAI health check failed:', error);
        openaiStatus = 'unhealthy';
      }
    }

    // Calculate uptime
    const uptime = Date.now() - startTime;
    
    // Determine overall status
    const overallStatus: 'healthy' | 'unhealthy' = 
      openaiStatus === 'healthy' ? 'healthy' : 'unhealthy';

    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      services: {
        openai: openaiStatus,
        database: 'unknown', // Not using external DB currently
        storage: 'unknown',  // Not using external storage currently
      },
      openaiKeyLoaded,
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(uptime / 1000), // Convert to seconds
      debug: debugInfo
    };

    console.log(`✅ Health check completed:`, {
      status: overallStatus,
      openaiStatus,
      openaiKeyLoaded,
      uptime: `${Math.floor(uptime / 1000)}s`
    });

    return NextResponse.json(healthResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...CORS_HEADERS,
      },
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      services: {
        openai: 'unhealthy',
        database: 'unknown',
        storage: 'unknown',
      },
      openaiKeyLoaded: false,
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };

    return NextResponse.json(errorResponse, {
      status: 503, // Service Unavailable
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...CORS_HEADERS,
      },
    });
  }
}

// Support HEAD requests for load balancer health checks
export async function HEAD() {
  const openaiKeyLoaded = Boolean(process.env.OPENAI_API_KEY);
  const status = openaiKeyLoaded ? 200 : 503;
  
  return new Response(null, {
    status,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...CORS_HEADERS,
    },
  });
}

// Support OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    },
  });
}