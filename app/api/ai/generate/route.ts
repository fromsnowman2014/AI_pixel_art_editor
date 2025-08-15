import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { processImageForPixelArt, validateImageConstraints } from '@/lib/utils/image-processing';
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

interface GenerateResponse {
  success: boolean;
  data?: {
    imageUrl: string;
    width: number;
    height: number;
    colorCount: number;
    palette: Array<{ r: number; g: number; b: number; a?: number }>;
    processingTimeMs: number;
    prompt: string;
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

// Initialize OpenAI client with environment validation
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

// Initialize on module load
openai = initializeOpenAI();

/**
 * AI Image Generation API
 * POST /api/ai/generate
 * 
 * Generates pixel art using OpenAI DALL-E 3 with post-processing:
 * 1. Generate high-resolution image using DALL-E 3
 * 2. Process for pixel art conversion (quantization + resize)
 * 3. Return base64 encoded image with metadata
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`🎨 [${requestId}] AI image generation requested at ${new Date().toISOString()}`);
  console.log(`🔧 [${requestId}] Environment check: NODE_ENV=${process.env.NODE_ENV}`);

  try {
    // Step 1: Check AI service availability
    console.log(`📋 [${requestId}] Step 1: Checking AI service availability...`);
    const serviceCheck = checkAIServiceAvailability();
    if (!serviceCheck.available) {
      console.log(`❌ [${requestId}] Service unavailable:`, serviceCheck);
      logApiRequest(request, '/ai/generate', startTime, false, 'Service unavailable');
      return serviceCheck.response;
    }
    console.log(`✅ [${requestId}] AI service availability check passed`);

    // Step 2: Validate request body
    console.log(`📝 [${requestId}] Step 2: Validating request body...`);
    const validation = await validateRequestBody(request, GenerateRequestSchema);
    if (!validation.success) {
      console.log(`❌ [${requestId}] Request validation failed:`, validation);
      logApiRequest(request, '/ai/generate', startTime, false, 'Validation failed');
      return validation.response;
    }
    console.log(`✅ [${requestId}] Request validation passed`);

    const { prompt, width, height, colorCount = 24, style } = validation.data;
    console.log(`📊 [${requestId}] Request parameters:`, { prompt: prompt.substring(0, 50) + '...', width, height, colorCount, style });

    // Step 3: Validate image constraints  
    console.log(`🔍 [${requestId}] Step 3: Validating image constraints...`);
    const constraintValidation = validateImageConstraints(width, height, colorCount);
    if (!constraintValidation.valid) {
      console.log(`❌ [${requestId}] Constraint validation failed:`, constraintValidation);
      logApiRequest(request, '/ai/generate', startTime, false, 'Constraint validation failed');
      return createErrorResponse(
        constraintValidation.error || 'Invalid image constraints',
        'CONSTRAINT_ERROR',
        400
      );
    }
    console.log(`✅ [${requestId}] Image constraints validation passed`);

    // Step 4: Apply rate limiting
    console.log(`⏱️ [${requestId}] Step 4: Applying rate limiting...`);
    const rateLimitResult = applyRateLimit(request);
    if (!rateLimitResult.success) {
      console.log(`❌ [${requestId}] Rate limit exceeded:`, rateLimitResult);
      logApiRequest(request, '/ai/generate', startTime, false, 'Rate limit exceeded');
      return rateLimitResult.response;
    }
    console.log(`✅ [${requestId}] Rate limiting passed`);

    // Step 5: Sanitize and enhance prompt
    console.log(`🎭 [${requestId}] Step 5: Processing prompt...`);
    const sanitizedPrompt = sanitize.prompt(prompt);
    const enhancedPrompt = `${sanitizedPrompt}, pixel art style, ${style}, low resolution, limited color palette, crisp pixels, no anti-aliasing, retro gaming aesthetic`;
    console.log(`✅ [${requestId}] Prompt processed: "${enhancedPrompt.substring(0, 100)}..."`);
    
    console.log(`🎯 [${requestId}] Preparing DALL-E 3 generation:`, {
      prompt: enhancedPrompt.substring(0, 100) + '...',
      targetSize: `${width}x${height}`,
      colorCount,
      style
    });

    // Step 6: Ensure OpenAI client is initialized
    console.log(`🤖 [${requestId}] Step 6: Checking OpenAI client...`);
    if (!openai) {
      console.log(`🔄 [${requestId}] OpenAI client not initialized, attempting to re-initialize...`);
      openai = initializeOpenAI();
      
      if (!openai) {
        console.log(`❌ [${requestId}] OpenAI client initialization failed`);
        logApiRequest(request, '/ai/generate', startTime, false, 'OpenAI client not initialized');
        return createErrorResponse(
          'AI service initialization failed - check OpenAI API key configuration',
          'SERVICE_INIT_ERROR',
          503
        );
      }
    }
    console.log(`✅ [${requestId}] OpenAI client ready`);

    // Step 7: Generate image with DALL-E 3
    console.log(`🎨 [${requestId}] Step 7: Calling DALL-E 3 API...`);
    console.log(`⚙️ [${requestId}] OpenAI configuration:`, { 
      modelUsed: "dall-e-3",
      promptLength: enhancedPrompt.length,
      targetSize: "1024x1024",
      timeout: "60s"
    });
    
    // Add timeout wrapper for OpenAI API call
    const dalleResponse = await Promise.race([
      openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024", // Generate at high res, then downscale
        quality: "standard",
        response_format: "url",
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API call timed out after 60 seconds')), 60000)
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

    // Step 8: Download generated image
    console.log(`📥 [${requestId}] Step 8: Downloading generated image...`);
    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });
    
    if (!imageResponse.ok) {
      console.error(`❌ [${requestId}] Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
      throw new Error(`Failed to download generated image: ${imageResponse.statusText}`);
    }

    console.log(`✅ [${requestId}] Image downloaded, converting to buffer...`);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log(`📊 [${requestId}] Image buffer size: ${imageBuffer.length} bytes`);

    // Step 9: Process image for pixel art conversion
    console.log(`🎨 [${requestId}] Step 9: Processing image for pixel art...`);
    console.log(`⚙️ [${requestId}] Processing parameters:`, { targetWidth: width, targetHeight: height, colorCount, method: 'median-cut', dithering: false });
    
    const processed = await processImageForPixelArt(imageBuffer, width, height, {
      colorCount,
      method: 'median-cut',
      enableDithering: false // Kids-friendly: no dithering by default
    });
    console.log(`✅ [${requestId}] Image processing completed successfully`);
    console.log(`📊 [${requestId}] Processed result:`, { 
      width: processed.width, 
      height: processed.height, 
      colorCount: processed.colorCount,
      paletteLength: processed.palette?.length || 0
    });

    // Convert to base64 data URL
    const base64Image = `data:image/png;base64,${processed.buffer.toString('base64')}`;

    const totalTime = Date.now() - startTime;

    console.log(`🎉 AI image generation complete:`, {
      dimensions: `${processed.width}x${processed.height}`,
      colors: processed.colorCount,
      processingTime: `${processed.processingTimeMs}ms`,
      totalTime: `${totalTime}ms`
    });

    const responseData = {
      imageUrl: base64Image,
      width: processed.width,
      height: processed.height,
      colorCount: processed.colorCount,
      palette: processed.palette,
      processingTimeMs: totalTime,
      prompt: sanitizedPrompt
    };

    logApiRequest(request, '/ai/generate', startTime, true, { 
      dimensions: `${processed.width}x${processed.height}`,
      colors: processed.colorCount 
    });

    return createSuccessResponse(responseData, 200, {
      ...rateLimitResult.headers,
      ...CORS_HEADERS
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    const errorInfo = getErrorInfo(error);
    console.error(`❌ [${requestId}] Generation failed after ${totalTime}ms:`, {
      error: errorInfo.message,
      errorName: errorInfo.name,
      stack: errorInfo.stack
    });
    
    logApiRequest(request, '/ai/generate', startTime, false, {
      error: errorInfo.message,
      errorName: errorInfo.name,
      totalTime: `${totalTime}ms`
    });

    // Handle specific OpenAI API errors using safe error info
    const errorMessage = errorInfo.message.toLowerCase();
    console.log(`🔍 [${requestId}] Analyzing error message: "${errorMessage.substring(0, 100)}..."`);
    
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
        'Generation timeout - please try with a simpler prompt',
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

    // Enhanced error response with better debugging information
    console.error(`❌ [${requestId}] Detailed error information:`, errorInfo);
    
    // Return more specific error message to help with debugging
    const debugMessage = errorMessage.includes('openai') || errorMessage.includes('api') ? 
      `OpenAI API error: ${errorInfo.message}` :
      errorMessage.includes('fetch') || errorMessage.includes('network') ?
      `Network error during image processing: ${errorInfo.message}` :
      `Image generation failed: ${errorInfo.message}`;
    
    return createErrorResponse(
      debugMessage,
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS', // Only allow POST and OPTIONS
    },
  });
}