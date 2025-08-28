import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getEnv } from '@/lib/domain/env-validation';
import { CORS_HEADERS } from '@/lib/services/api-middleware';

/**
 * Simple OpenAI Test API
 * GET /api/test-openai
 * 
 * Tests OpenAI connectivity with a simple completion request
 */
export async function GET(request: NextRequest) {
  console.log('🧪 OpenAI connectivity test started');

  try {
    const env = getEnv();
    
    if (!env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found');
    }

    const openai = new OpenAI({ 
      apiKey: env.OPENAI_API_KEY,
      timeout: 30000 // 30 second timeout for simple test
    });

    console.log('🔑 OpenAI client initialized, testing API...');

    // Test with a simple completion request (much faster than image generation)
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10
    });

    const response = completion.choices[0]?.message?.content || 'No response';

    console.log('✅ OpenAI API test successful:', response);

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        openaiResponse: response,
        model: "gpt-3.5-turbo",
        testType: "chat completion"
      }
    }, {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (error) {
    console.error('❌ OpenAI API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'OpenAI test failed',
        code: 'OPENAI_TEST_ERROR'
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