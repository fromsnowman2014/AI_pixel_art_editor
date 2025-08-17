import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getEnv, validateServices } from '@/lib/utils/env-validation';
import { CORS_HEADERS } from '@/lib/utils/api-middleware';

/**
 * AI Debug API
 * GET /api/ai/debug
 * 
 * Tests OpenAI connectivity and configuration without full image generation
 * Provides detailed diagnostic information for debugging purposes
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  console.log('🔍 AI Debug endpoint called');

  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      environment: process.env.NODE_ENV,
      tests: {}
    };

    // Test 1: Environment Variables
    console.log('📋 Testing environment variables...');
    try {
      const env = getEnv();
      diagnostics.tests.environment = {
        status: 'success',
        openaiKeyPresent: Boolean(env.OPENAI_API_KEY),
        openaiKeyFormat: env.OPENAI_API_KEY ? 
          (env.OPENAI_API_KEY.startsWith('sk-') ? 'valid_prefix' : 'invalid_prefix') : 
          'missing',
        openaiKeyLength: env.OPENAI_API_KEY ? env.OPENAI_API_KEY.length : 0,
        enableAiGeneration: env.ENABLE_AI_GENERATION,
        rateLimit: env.RATE_LIMIT_AI_REQUESTS_PER_HOUR,
        aiTimeout: env.AI_GENERATION_TIMEOUT
      };
      console.log('✅ Environment variables test passed');
    } catch (error) {
      diagnostics.tests.environment = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log('❌ Environment variables test failed:', error);
    }

    // Test 2: Service Validation
    console.log('🔧 Testing service validation...');
    try {
      const env = getEnv();
      validateServices.openai(env);
      validateServices.ai(env);
      diagnostics.tests.serviceValidation = {
        status: 'success'
      };
      console.log('✅ Service validation test passed');
    } catch (error) {
      diagnostics.tests.serviceValidation = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log('❌ Service validation test failed:', error);
    }

    // Test 3: OpenAI Client Initialization
    console.log('🤖 Testing OpenAI client initialization...');
    let openaiClient: OpenAI | null = null;
    try {
      const env = getEnv();
      if (!env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found');
      }
      
      openaiClient = new OpenAI({ 
        apiKey: env.OPENAI_API_KEY,
        timeout: 10000 // 10 second timeout for testing
      });
      
      diagnostics.tests.openaiInit = {
        status: 'success',
        clientCreated: true
      };
      console.log('✅ OpenAI client initialization test passed');
    } catch (error) {
      diagnostics.tests.openaiInit = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        clientCreated: false
      };
      console.log('❌ OpenAI client initialization test failed:', error);
    }

    // Test 4: OpenAI API Connectivity (Simple Model List)
    console.log('🌐 Testing OpenAI API connectivity...');
    try {
      if (!openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      // Test with a simple API call that doesn't consume credits
      const modelsResponse = await openaiClient.models.list();
      const hasModels = modelsResponse.data && modelsResponse.data.length > 0;
      
      diagnostics.tests.openaiConnectivity = {
        status: 'success',
        modelsFound: hasModels,
        modelCount: modelsResponse.data?.length || 0,
        hasGptImage1: modelsResponse.data?.some(model => model.id === 'gpt-image-1') || false
      };
      console.log('✅ OpenAI API connectivity test passed');
    } catch (error) {
      diagnostics.tests.openaiConnectivity = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log('❌ OpenAI API connectivity test failed:', error);
    }

    // Test 5: Basic Image Generation (Small Test)
    console.log('🎨 Testing basic image generation (small test)...');
    try {
      if (!openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      const testResponse = await openaiClient.images.generate({
        model: "gpt-image-1",
        prompt: "a simple red pixel",
        n: 1,
        size: "1024x1024",
        quality: "medium",
        background: "transparent",
        response_format: "url",
      });

      const hasImage = testResponse.data && testResponse.data.length > 0 && testResponse.data[0]?.url;
      
      diagnostics.tests.imageGeneration = {
        status: 'success',
        imageGenerated: hasImage,
        imageUrl: hasImage ? 'URL_PROVIDED' : null,
        responseFormat: testResponse.data?.[0]?.url ? 'url' : 'unknown'
      };
      console.log('✅ Basic image generation test passed');
    } catch (error) {
      diagnostics.tests.imageGeneration = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log('❌ Basic image generation test failed:', error);
    }

    // Summary
    const totalTime = Date.now() - startTime;
    const allPassed = Object.values(diagnostics.tests).every(
      (test: any) => test.status === 'success'
    );
    
    diagnostics.summary = {
      allTestsPassed: allPassed,
      totalTests: Object.keys(diagnostics.tests).length,
      passedTests: Object.values(diagnostics.tests).filter(
        (test: any) => test.status === 'success'
      ).length,
      processingTimeMs: totalTime
    };

    console.log(`🏁 Debug tests completed in ${totalTime}ms. All passed: ${allPassed}`);

    return NextResponse.json({
      success: true,
      data: diagnostics
    }, {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Debug endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Debug test failed',
        code: 'DEBUG_ERROR',
        processingTimeMs: totalTime
      }
    }, {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}

// Enable CORS for debug endpoint
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}