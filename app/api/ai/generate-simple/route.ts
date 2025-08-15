import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { 
  validateRequestBody, 
  applyRateLimit, 
  checkAIServiceAvailability,
  createErrorResponse,
  createSuccessResponse,
  sanitize,
  logApiRequest,
  getErrorInfo,
  CORS_HEADERS
} from '@/lib/utils/api-middleware';
import { getEnv } from '@/lib/utils/env-validation';

// Request validation schema
const GenerateRequestSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(1000, 'Prompt must be less than 1000 characters'),
  width: z.number()
    .int('Width must be an integer')
    .min(8, 'Width must be at least 8')
    .max(128, 'Width must be at most 128'),
  height: z.number()
    .int('Height must be an integer')
    .min(8, 'Height must be at least 8')
    .max(128, 'Height must be at most 128'),
  colorCount: z.number()
    .int('Color count must be an integer')
    .min(2, 'Color count must be at least 2')
    .max(64, 'Color count must be at most 64')
    .default(24),
  style: z.enum(['pixel-art', 'low-res', 'retro']).default('pixel-art'),
  seed: z.number().int().optional(),
});

type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// Initialize OpenAI client
let openai: OpenAI | null = null;

function initializeOpenAI(): OpenAI | null {
  try {
    const env = getEnv();
    if (!env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found in environment');
      return null;
    }
    
    return new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.error('❌ OpenAI client initialization failed:', error);
    return null;
  }
}

openai = initializeOpenAI();

/**
 * Simple AI Image Generation API (No Image Processing)
 * POST /api/ai/generate-simple
 * 
 * Generates pixel art using OpenAI DALL-E 3 with minimal processing:
 * 1. Generate image using DALL-E 3
 * 2. Return raw image URL without complex processing
 * 3. Bypass Sharp/VIPS completely
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`🎨 [${requestId}] Simple AI image generation requested at ${new Date().toISOString()}`);

  try {
    // Step 1: Check AI service availability
    console.log(`📋 [${requestId}] Step 1: Checking AI service availability...`);
    const serviceCheck = checkAIServiceAvailability();
    if (!serviceCheck.available) {
      console.log(`❌ [${requestId}] Service unavailable:`, serviceCheck);
      logApiRequest(request, '/ai/generate-simple', startTime, false, 'Service unavailable');
      return serviceCheck.response;
    }
    console.log(`✅ [${requestId}] AI service availability check passed`);

    // Step 2: Validate request body
    console.log(`📝 [${requestId}] Step 2: Validating request body...`);
    const validation = await validateRequestBody(request, GenerateRequestSchema);
    if (!validation.success) {
      console.log(`❌ [${requestId}] Request validation failed:`, validation);
      logApiRequest(request, '/ai/generate-simple', startTime, false, 'Validation failed');
      return validation.response;
    }
    console.log(`✅ [${requestId}] Request validation passed`);

    const { prompt, width, height, colorCount = 24, style } = validation.data;
    console.log(`📊 [${requestId}] Request parameters:`, { prompt: prompt.substring(0, 50) + '...', width, height, colorCount, style });

    // Step 3: Apply rate limiting
    console.log(`⏱️ [${requestId}] Step 3: Applying rate limiting...`);
    const rateLimitResult = applyRateLimit(request);
    if (!rateLimitResult.success) {
      console.log(`❌ [${requestId}] Rate limit exceeded:`, rateLimitResult);
      logApiRequest(request, '/ai/generate-simple', startTime, false, 'Rate limit exceeded');
      return rateLimitResult.response;
    }
    console.log(`✅ [${requestId}] Rate limiting passed`);

    // Step 4: Sanitize and enhance prompt
    console.log(`🎭 [${requestId}] Step 4: Processing prompt...`);
    const sanitizedPrompt = sanitize.prompt(prompt);
    const enhancedPrompt = `${sanitizedPrompt}, pixel art style, ${style}, ${width}x${height} pixels, ${colorCount} colors, low resolution, limited color palette, crisp pixels, no anti-aliasing, retro gaming aesthetic`;
    console.log(`✅ [${requestId}] Prompt processed: "${enhancedPrompt.substring(0, 100)}..."`);

    // Step 5: Ensure OpenAI client is initialized
    console.log(`🤖 [${requestId}] Step 5: Checking OpenAI client...`);
    if (!openai) {
      console.log(`🔄 [${requestId}] OpenAI client not initialized, attempting to re-initialize...`);
      openai = initializeOpenAI();
      
      if (!openai) {
        console.log(`❌ [${requestId}] OpenAI client initialization failed`);
        logApiRequest(request, '/ai/generate-simple', startTime, false, 'OpenAI client not initialized');
        return createErrorResponse(
          'AI service initialization failed - check OpenAI API key configuration',
          'SERVICE_INIT_ERROR',
          503
        );
      }
    }
    console.log(`✅ [${requestId}] OpenAI client ready`);

    // Step 6: Generate image with DALL-E 3
    console.log(`🎨 [${requestId}] Step 6: Calling DALL-E 3 API...`);
    console.log(`⚙️ [${requestId}] OpenAI configuration:`, { 
      modelUsed: "dall-e-3",
      promptLength: enhancedPrompt.length,
      targetSize: "1024x1024",
      timeout: "10min"
    });
    
    // Add timeout wrapper for OpenAI API call
    const dalleResponse = await Promise.race([
      openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API call timed out after 10 minutes')), 600000)
      )
    ]) as any;

    console.log(`🎉 [${requestId}] DALL-E 3 API call successful`);
    console.log(`📊 [${requestId}] Response data length:`, dalleResponse.data?.length || 0);

    if (!dalleResponse.data || dalleResponse.data.length === 0) {
      throw new Error('No image generated by DALL-E 3');
    }
    
    const imageUrl = dalleResponse.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E 3');
    }

    console.log(`✅ [${requestId}] DALL-E 3 generation successful, image URL received`);
    console.log(`🔗 [${requestId}] Image URL: ${imageUrl.substring(0, 50)}...`);

    const totalTime = Date.now() - startTime;

    console.log(`🎉 Simple AI image generation complete:`, {
      dimensions: `${width}x${height} (requested)`,
      actualSize: "1024x1024 (DALL-E 3)",
      colors: colorCount,
      totalTime: `${totalTime}ms`
    });

    const responseData = {
      imageUrl: imageUrl, // Return raw OpenAI image URL
      originalImageUrl: imageUrl,
      width: 1024, // Actual DALL-E 3 size
      height: 1024,
      requestedWidth: width,
      requestedHeight: height,
      colorCount: colorCount,
      processingTimeMs: totalTime,
      prompt: sanitizedPrompt,
      note: "Raw DALL-E 3 output without pixel art processing (Sharp/VIPS bypassed)"
    };

    logApiRequest(request, '/ai/generate-simple', startTime, true, { 
      actualSize: "1024x1024",
      requestedSize: `${width}x${height}`,
      colors: colorCount 
    });

    return createSuccessResponse(responseData, 200, {
      ...rateLimitResult.headers,
      ...CORS_HEADERS
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    const errorInfo = getErrorInfo(error);
    console.error(`❌ [${requestId}] Simple generation failed after ${totalTime}ms:`, {
      error: errorInfo.message,
      errorName: errorInfo.name,
      stack: errorInfo.stack
    });
    
    logApiRequest(request, '/ai/generate-simple', startTime, false, {
      error: errorInfo.message,
      errorName: errorInfo.name,
      totalTime: `${totalTime}ms`
    });

    // Handle specific OpenAI API errors
    const errorMessage = errorInfo.message.toLowerCase();
    
    if (errorMessage.includes('insufficient_quota')) {
      return createErrorResponse(
        'AI service quota exceeded',
        'AI_QUOTA_EXCEEDED',
        503
      );
    }
    
    if (errorMessage.includes('rate_limit_exceeded')) {
      return createErrorResponse(
        'AI service rate limit exceeded - please try again later',
        'AI_RATE_LIMIT',
        429
      );
    }
    
    if (errorMessage.includes('content_policy_violation')) {
      return createErrorResponse(
        'Content policy violation - please try a different prompt',
        'CONTENT_POLICY_VIOLATION',
        400
      );
    }
    
    if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
      return createErrorResponse(
        'Generation timeout after 10 minutes - please try with a simpler prompt',
        'TIMEOUT_ERROR',
        408
      );
    }
    
    if (errorMessage.includes('openai') || errorMessage.includes('api')) {
      return createErrorResponse(
        'AI service temporarily unavailable',
        'AI_SERVICE_ERROR',
        503
      );
    }

    return createErrorResponse(
      `Simple generation failed: ${errorInfo.message}`,
      'GENERATION_ERROR',
      500,
      { 'X-Request-ID': requestId }
    );
  }
}

// Support OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}