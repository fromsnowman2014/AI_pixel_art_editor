import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { CORS_HEADERS } from '@/lib/services/api-middleware';

/**
 * Simple GPT-3.5-turbo Test API
 * GET /api/test-gpt35
 * 
 * Tests OpenAI GPT-3.5-turbo connectivity without complex validation
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`🧪 [${requestId}] GPT-3.5-turbo test started at ${new Date().toISOString()}`);

  try {
    // Direct environment check without complex validation
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log(`❌ [${requestId}] No OpenAI API key found`);
      return NextResponse.json({
        success: false,
        error: {
          message: 'OpenAI API key not found',
          code: 'NO_API_KEY'
        }
      }, {
        status: 503,
        headers: CORS_HEADERS
      });
    }

    if (!apiKey.startsWith('sk-')) {
      console.log(`❌ [${requestId}] Invalid OpenAI API key format`);
      return NextResponse.json({
        success: false,
        error: {
          message: 'Invalid OpenAI API key format',
          code: 'INVALID_API_KEY'
        }
      }, {
        status: 503,
        headers: CORS_HEADERS
      });
    }

    console.log(`🔑 [${requestId}] OpenAI API key found (length: ${apiKey.length})`);

    // Initialize OpenAI client
    const openai = new OpenAI({ 
      apiKey: apiKey,
      timeout: 30000 // 30 second timeout
    });

    console.log(`🤖 [${requestId}] OpenAI client initialized, testing GPT-3.5-turbo...`);

    // Test with a simple GPT-3.5-turbo completion
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'API test successful'" }],
      max_tokens: 10,
      temperature: 0
    });

    const response = completion.choices[0]?.message?.content || 'No response';
    const totalTime = Date.now() - startTime;

    console.log(`✅ [${requestId}] GPT-3.5-turbo test successful in ${totalTime}ms: ${response}`);

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        requestId,
        model: "gpt-3.5-turbo",
        response: response,
        processingTimeMs: totalTime,
        apiKeyLength: apiKey.length,
        testType: "chat completion"
      }
    }, {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] GPT-3.5-turbo test failed after ${totalTime}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: {
        message: errorMessage,
        code: 'GPT35_TEST_ERROR',
        processingTimeMs: totalTime,
        requestId
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