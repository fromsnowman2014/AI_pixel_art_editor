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
  
  console.log('🎨 AI image generation requested');

  try {
    // Check AI service availability
    const serviceCheck = checkAIServiceAvailability();
    if (!serviceCheck.available) {
      logApiRequest(request, '/ai/generate', startTime, false, 'Service unavailable');
      return serviceCheck.response;
    }

    // Validate request body
    const validation = await validateRequestBody(request, GenerateRequestSchema);
    if (!validation.success) {
      logApiRequest(request, '/ai/generate', startTime, false, 'Validation failed');
      return validation.response;
    }

    const { prompt, width, height, colorCount = 24, style } = validation.data;

    // Validate image constraints  
    const constraintValidation = validateImageConstraints(width, height, colorCount);
    if (!constraintValidation.valid) {
      logApiRequest(request, '/ai/generate', startTime, false, 'Constraint validation failed');
      return createErrorResponse(
        constraintValidation.error || 'Invalid image constraints',
        'CONSTRAINT_ERROR',
        400
      );
    }

    // Apply rate limiting
    const rateLimitResult = applyRateLimit(request);
    if (!rateLimitResult.success) {
      logApiRequest(request, '/ai/generate', startTime, false, 'Rate limit exceeded');
      return rateLimitResult.response;
    }

    // Sanitize and enhance prompt for pixel art generation
    const sanitizedPrompt = sanitize.prompt(prompt);
    const enhancedPrompt = `${sanitizedPrompt}, pixel art style, ${style}, low resolution, limited color palette, crisp pixels, no anti-aliasing, retro gaming aesthetic`;
    
    console.log(`🎯 Generating image with DALL-E 3:`, {
      prompt: enhancedPrompt.substring(0, 100) + '...',
      targetSize: `${width}x${height}`,
      colorCount,
      style
    });

    // Ensure OpenAI client is initialized
    if (!openai) {
      console.log('🔄 Attempting to re-initialize OpenAI client...');
      openai = initializeOpenAI();
      
      if (!openai) {
        logApiRequest(request, '/ai/generate', startTime, false, 'OpenAI client not initialized');
        return createErrorResponse(
          'AI service initialization failed - check OpenAI API key configuration',
          'SERVICE_INIT_ERROR',
          503
        );
      }
    }

    // Generate image with DALL-E 3
    const dalleResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024", // Generate at high res, then downscale
      quality: "standard",
      response_format: "url",
    });

    if (!dalleResponse.data || dalleResponse.data.length === 0) {
      throw new Error('No image generated by DALL-E 3');
    }
    
    const imageUrl = dalleResponse.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E 3');
    }

    console.log('✅ DALL-E 3 generation successful, processing for pixel art...');

    console.log('📥 Downloading generated image...');
    // Download the generated image with timeout
    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!imageResponse.ok) {
      console.error(`❌ Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
      throw new Error(`Failed to download generated image: ${imageResponse.statusText}`);
    }

    console.log('✅ Image downloaded, converting to buffer...');
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log(`📊 Image buffer size: ${imageBuffer.length} bytes`);

    console.log('🎨 Processing image for pixel art...');
    // Process image for pixel art
    const processed = await processImageForPixelArt(imageBuffer, width, height, {
      colorCount,
      method: 'median-cut',
      enableDithering: false // Kids-friendly: no dithering by default
    });
    console.log('✅ Image processing completed');

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
    
    logApiRequest(request, '/ai/generate', startTime, false, {
      error: error instanceof Error ? error.message : 'Unknown error',
      totalTime: `${totalTime}ms`
    });

    // Handle specific OpenAI API errors
    if (error instanceof Error) {
      if (error.message.includes('insufficient_quota')) {
        return createErrorResponse(
          'AI service quota exceeded',
          'AI_QUOTA_EXCEEDED',
          503
        );
      }
      
      if (error.message.includes('rate_limit_exceeded')) {
        return createErrorResponse(
          'AI service rate limit exceeded - please try again later',
          'AI_RATE_LIMIT',
          429
        );
      }
      
      if (error.message.includes('content_policy_violation')) {
        return createErrorResponse(
          'Content policy violation - please try a different prompt',
          'CONTENT_POLICY_VIOLATION',
          400
        );
      }
      
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return createErrorResponse(
          'Generation timeout - please try with a simpler prompt',
          'TIMEOUT_ERROR',
          408
        );
      }
      
      if (error.message.includes('OpenAI') || error.message.includes('API')) {
        return createErrorResponse(
          'AI service temporarily unavailable',
          'AI_SERVICE_ERROR',
          503
        );
      }
    }

    // Generic error response with security consideration (no internal details exposed)
    // But log detailed error for debugging
    console.error('❌ Detailed error information:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return createErrorResponse(
      'Image generation failed. Check server logs for details.',
      'GENERATION_ERROR',
      500
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