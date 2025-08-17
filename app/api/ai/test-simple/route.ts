import { NextRequest, NextResponse } from 'next/server';

/**
 * Ultra-simple test API to verify backend execution
 * POST /api/ai/test-simple
 */
export async function POST(request: NextRequest) {
  // CRITICAL: First log to verify function execution
  console.log('🚀 SIMPLE TEST API: Function started successfully');
  console.log('🚀 Timestamp:', new Date().toISOString());
  console.log('🚀 Request URL:', request.url);
  console.log('🚀 Request method:', request.method);
  
  try {
    // Try to parse request body
    console.log('📝 Attempting to parse request body...');
    const body = await request.json();
    console.log('📝 Request body parsed successfully:', body);
    
    // Try to access environment variables
    console.log('🔧 Environment check:');
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 Has OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY);
    
    return NextResponse.json({
      success: true,
      message: 'Simple test API working perfectly',
      timestamp: new Date().toISOString(),
      receivedBody: body,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY
      }
    });
    
  } catch (error) {
    console.error('❌ Simple test API failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Simple test API failed',
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  console.log('🚀 SIMPLE TEST API: GET request received');
  
  return NextResponse.json({
    success: true,
    message: 'Simple test API GET working',
    timestamp: new Date().toISOString()
  });
}