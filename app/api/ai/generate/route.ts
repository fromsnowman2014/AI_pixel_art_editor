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
import { generateCompletePrompt } from '@/lib/utils/prompt-enhancer';
import { detectOptimalAIMode, validateModeForCanvas } from '@/lib/utils/ai-mode-detector';
import { analyzeCanvas } from '@/lib/utils/canvas-analysis';
import { AIGenerationMode } from '@/lib/types/canvas';
import { createApiLogger } from '@/lib/utils/smart-logger';

// Enhanced request validation schema supporting multiple AI generation modes
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
  
  // AI Generation Mode Support
  mode: z.enum(['text-to-image', 'image-to-image', 'inpainting', 'outpainting'])
    .default('text-to-image'),
  
  // Image-to-image specific fields
  inputImage: z.string()
    .optional()
    .refine((data) => {
      // If provided, must be valid base64 data URL
      if (!data) return true;
      return data.startsWith('data:image/') && data.includes('base64,');
    }, 'inputImage must be a valid base64 data URL'),
  
  strength: z.number()
    .min(0.1, 'Strength must be at least 0.1')
    .max(1.0, 'Strength must be at most 1.0')
    .default(0.7)
    .optional(),
  
  // Background and transparency options
  preserveTransparency: z.boolean().default(true),
  enforceTransparentBackground: z.boolean().default(true),
  
  // Advanced options
  guidanceScale: z.number()
    .min(1.0, 'Guidance scale must be at least 1.0')
    .max(20.0, 'Guidance scale must be at most 20.0')
    .default(7.5)
    .optional(),
  negativePrompt: z.string()
    .max(500, 'Negative prompt must be less than 500 characters')
    .optional(),
}).refine((data) => {
  // Validation: image-to-image mode requires inputImage
  if (data.mode === 'image-to-image' && !data.inputImage) {
    return false;
  }
  return true;
}, {
  message: 'inputImage is required when mode is image-to-image',
  path: ['inputImage']
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
 * Generates pixel art using OpenAI's verified DALL-E 3 model:
 * - DALL-E 3 (verified model) for text-to-image generation with superior quality
 * - DALL-E 2 for image-to-image editing operations
 * - HD quality + natural style optimized for pixel art creation
 * 1. Generate high-resolution image using DALL-E 3/2 model
 * 2. Process for pixel art conversion (quantization + resize)
 * 3. Return base64 encoded image with metadata
 */
export async function POST(request: NextRequest) {
  let requestId: string;
  let startTime: number;
  let bypassProcessing: boolean = false;
  let apiLogger: ReturnType<typeof createApiLogger>;
  
  try {
    startTime = Date.now();
    requestId = crypto.randomUUID();
    apiLogger = createApiLogger('/api/ai/generate', requestId);
    
    apiLogger.info('AI image generation request started');
    
    // Check for bypass parameter (query param or header)
    const { searchParams } = new URL(request.url);
    const bypassFromParam = searchParams.get('bypass') === 'true';
    const bypassFromHeader = request.headers.get('x-bypass-processing') === 'true';
    bypassProcessing = bypassFromParam || bypassFromHeader;
    
    apiLogger.debug(() => `Processing mode: ${bypassProcessing ? 'BYPASS (Raw DALL-E)' : 'FULL (With Processing)'}`);
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to initialize request', code: 'INIT_ERROR' }
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const timer = apiLogger.time('Full AI generation process');
    
    // Step 1: Validate request body
    apiLogger.debug('Starting request body validation');
    const validation = await validateRequestBody(request, GenerateRequestSchema);
    
    if (!validation.success) {
      apiLogger.warn('Request validation failed');
      logApiRequest(request, '/ai/generate', startTime, false, 'Validation failed');
      return validation.response;
    }
    
    apiLogger.debug(() => 'Request validation passed', undefined, () => ({
      prompt: validation.data.prompt.substring(0, 50) + '...',
      dimensions: `${validation.data.width}x${validation.data.height}`,
      mode: validation.data.mode,
      colorCount: validation.data.colorCount
    }));

    // Step 2: Check AI service availability
    apiLogger.debug('Checking AI service availability');
    const serviceCheck = checkAIServiceAvailability();
    
    if (!serviceCheck.available) {
      apiLogger.error('AI service unavailable');
      logApiRequest(request, '/ai/generate', startTime, false, 'Service unavailable');
      return serviceCheck.response;
    }

    const { 
      prompt, 
      width, 
      height, 
      colorCount = 24, 
      style,
      mode = 'text-to-image',
      inputImage,
      strength = 0.7,
      preserveTransparency = true,
      enforceTransparentBackground = true,
      guidanceScale = 7.5,
      negativePrompt
    } = validation.data;
    
    apiLogger.info('Processing AI generation request', { 
      dimensions: `${width}x${height}`,
      colorCount,
      mode,
      style,
      hasInputImage: !!inputImage
    });

    // Step 3: Validate image constraints  
    const constraintValidation = validateImageConstraints(width, height, colorCount);
    if (!constraintValidation.valid) {
      apiLogger.warn('Image constraint validation failed', undefined, constraintValidation);
      logApiRequest(request, '/ai/generate', startTime, false, 'Constraint validation failed');
      return createErrorResponse(
        constraintValidation.error || 'Invalid image constraints',
        'CONSTRAINT_ERROR',
        400
      );
    }

    // Step 4: Apply rate limiting
    const rateLimitResult = applyRateLimit(request);
    if (!rateLimitResult.success) {
      apiLogger.warn('Rate limit exceeded');
      logApiRequest(request, '/ai/generate', startTime, false, 'Rate limit exceeded');
      return rateLimitResult.response;
    }

    // Step 5: Analyze input image (if provided) and enhance prompt intelligently
    let canvasAnalysis = null;
    let dalleInputImage = undefined;
    
    // Analyze input image for image-to-image mode
    if (mode === 'image-to-image' && inputImage) {
      apiLogger.debug('Analyzing input image for image-to-image mode');
      
      try {
        // Convert base64 to ImageData for analysis
        const base64Data = inputImage.split(',')[1];
        if (!base64Data) {
          throw new Error('Invalid base64 image data');
        }
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // For now, create a mock analysis - in a real implementation, we'd analyze the actual image
        canvasAnalysis = {
          isEmpty: false,
          hasTransparency: preserveTransparency,
          dominantColors: ['rgb(100,100,100)', 'rgb(200,200,200)'], // Mock colors
          pixelDensity: 0.6,
          contentBounds: { x: 0, y: 0, width: width, height: height },
          totalPixels: width * height,
          filledPixels: Math.floor(width * height * 0.6),
          fillPercentage: 60
        };
        
        // For DALL-E 3 image-to-image, we need to use the input image
        dalleInputImage = inputImage;
        
        apiLogger.debug('Input image analysis completed', undefined, {
          fillPercentage: canvasAnalysis.fillPercentage,
          hasTransparency: canvasAnalysis.hasTransparency
        });
      } catch (error) {
        apiLogger.error('Failed to analyze input image', undefined, error);
        return createErrorResponse(
          'Failed to analyze input image',
          'IMAGE_ANALYSIS_ERROR',
          400
        );
      }
    }
    
    // Validate mode compatibility
    const modeValidation = validateModeForCanvas(mode as AIGenerationMode, canvasAnalysis);
    if (!modeValidation.isValid) {
      apiLogger.warn('Mode validation failed', undefined, modeValidation);
      return createErrorResponse(
        `Mode '${mode}' is not suitable: ${modeValidation.warnings.join(', ')}`,
        'MODE_VALIDATION_ERROR',
        400
      );
    }
    
    // Generate enhanced prompt using intelligent prompt enhancer
    const sanitizedPrompt = sanitize.prompt(prompt);
    const promptEnhancementOptions = {
      mode: mode as AIGenerationMode,
      style: style || 'pixel-art',
      enforceTransparency: enforceTransparentBackground,
      canvasAnalysis: canvasAnalysis || undefined,
      preserveExistingColors: preserveTransparency
    };
    
    const promptResult = generateCompletePrompt(sanitizedPrompt, promptEnhancementOptions);
    const enhancedPrompt = promptResult.finalPrompt;
    
    apiLogger.debug(() => `Prompt enhancement completed`, undefined, () => ({
      originalLength: sanitizedPrompt.length,
      enhancedLength: enhancedPrompt.length,
      appliedChanges: promptResult.appliedChanges.length,
      confidence: promptResult.confidence.toFixed(2)
    }));

    // Step 6: Ensure OpenAI client is initialized
    if (!openai) {
      apiLogger.debug('Initializing OpenAI client');
      openai = initializeOpenAI();
      
      if (!openai) {
        apiLogger.error('OpenAI client initialization failed - check API key configuration');
        logApiRequest(request, '/ai/generate', startTime, false, 'OpenAI client not initialized');
        return createErrorResponse(
          'AI service initialization failed - check OpenAI API key configuration',
          'SERVICE_INIT_ERROR',
          503
        );
      }
    }

    // Step 7: Generate image using DALL-E 3 model
    const aiTimer = apiLogger.time('OpenAI API call');
    apiLogger.info(`Calling DALL-E API for ${mode} generation`);
    
    let dalleResponse: any;
    
    if (mode === 'image-to-image' && dalleInputImage) {
      // Convert base64 to buffer for image-to-image
      const base64Data = dalleInputImage.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid input image data');
      }
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      apiLogger.debug('Using DALL-E 2 for image editing (image-to-image mode)');
      dalleResponse = await Promise.race([
        openai.images.edit({
          model: "dall-e-2", // Note: DALL-E 3 doesn't support image editing, use DALL-E 2
          image: imageBuffer as any, // Type assertion for Buffer to Uploadable
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
          response_format: "url",
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API call timed out after 10 minutes')), 600000)
        )
      ]) as any;
    } else {
      apiLogger.debug('Using DALL-E 3 for text-to-image generation');
      dalleResponse = await Promise.race([
        openai.images.generate({
          model: "dall-e-3",
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
          style: "natural",
          response_format: "url",
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API call timed out after 10 minutes')), 600000)
        )
      ]) as any;
    }

    aiTimer(); // Log API call duration
    
    if (!dalleResponse.data || dalleResponse.data.length === 0) {
      throw new Error('No image generated by DALL-E');
    }
    
    const imageUrl = dalleResponse.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    apiLogger.info('DALL-E image generation successful');

    // CRITICAL: Bypass processing BEFORE any Sharp/VIPS operations to avoid RGB/RGBA issues
    if (bypassProcessing) {
      const totalTime = Date.now() - startTime;
      
      apiLogger.info('Bypass mode: Returning raw DALL-E output without processing', {
        totalTime: `${totalTime}ms`,
        outputSize: '1024x1024'
      });

      const responseData = {
        assetId: requestId, // Use request ID as asset ID
        pngUrl: imageUrl, // Return raw OpenAI image URL using pngUrl field
        palette: [], // No palette generated in bypass mode  
        width: 1024, // Actual DALL-E 3 size
        height: 1024,
        colorCount: colorCount,
        processingTimeMs: totalTime,
        
        // Enhanced metadata (bypass mode)
        generationMetadata: {
          mode: mode,
          originalPrompt: sanitizedPrompt,
          enhancedPrompt: enhancedPrompt,
          appliedChanges: promptResult.appliedChanges,
          promptConfidence: promptResult.confidence,
          hadInputImage: !!inputImage,
          strength: mode === 'image-to-image' ? strength : undefined,
          style: style,
          preserveTransparency: preserveTransparency,
          enforceTransparentBackground: enforceTransparentBackground,
          bypassMode: true
        }
      };

      logApiRequest(request, '/ai/generate?bypass=true', startTime, true, { 
        actualSize: "1024x1024",
        requestedSize: `${width}x${height}`,
        colors: colorCount,
        bypass: true
      });

      return createSuccessResponse(responseData, 200, {
        ...rateLimitResult.headers,
        ...CORS_HEADERS
      });
    }

    // Step 8: Download generated image
    const downloadTimer = apiLogger.time('Image download');
    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(600000) // 10 minute timeout
    });
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download generated image: ${imageResponse.statusText}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    downloadTimer();
    
    apiLogger.debug(() => `Downloaded image buffer: ${imageBuffer.length} bytes`);

    // Step 9: Process image for pixel art conversion using Sharp
    const processTimer = apiLogger.time('Pixel art processing');
    const processed = await processImageForPixelArt(imageBuffer, width, height, {
      colorCount,
      method: 'median-cut',
      enableDithering: false
    });
    processTimer();
    
    apiLogger.debug(() => 'Image processing completed', undefined, () => ({ 
      dimensions: `${processed.width}x${processed.height}`, 
      colorCount: processed.colorCount,
      paletteLength: processed.palette?.length || 0
    }));

    // Convert to base64 data URL
    const base64Image = `data:image/png;base64,${processed.buffer.toString('base64')}`;

    const totalTime = Date.now() - startTime;

    const responseData = {
      assetId: requestId, // Use request ID as asset ID
      pngUrl: base64Image, // Use pngUrl to match frontend expectations
      palette: processed.palette.map(color => `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a || 1})`),
      width: processed.width,
      height: processed.height,
      colorCount: processed.colorCount,
      processingTimeMs: totalTime,
      
      // Enhanced metadata
      generationMetadata: {
        mode: mode,
        originalPrompt: sanitizedPrompt,
        enhancedPrompt: enhancedPrompt,
        appliedChanges: promptResult.appliedChanges,
        promptConfidence: promptResult.confidence,
        hadInputImage: !!inputImage,
        strength: mode === 'image-to-image' ? strength : undefined,
        style: style,
        preserveTransparency: preserveTransparency,
        enforceTransparentBackground: enforceTransparentBackground
      }
    };

    apiLogger.info('AI image generation completed successfully', {
      dimensions: `${processed.width}x${processed.height}`,
      colorCount: processed.colorCount,
      totalTime: `${totalTime}ms`
    });

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
    
    // Log error with appropriate level based on logger availability
    if (apiLogger) {
      apiLogger.error('AI generation failed', { 
        totalTime: `${totalTime}ms`,
        errorType: error?.constructor?.name 
      }, errorInfo);
    } else {
      console.error(`❌ AI generation failed after ${totalTime}ms:`, errorInfo.message);
    }
    
    logApiRequest(request, '/ai/generate', startTime, false, {
      error: errorInfo.message,
      errorName: errorInfo.name,
      totalTime: `${totalTime}ms`
    });

    // Handle specific OpenAI API errors using safe error info
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
        'Generation timeout after 10 minutes - please try with a simpler prompt or check OpenAI service status',
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

    // Return concise error response with essential debug info for development
    const debugMessage = errorMessage.includes('openai') || errorMessage.includes('api') ? 
      `OpenAI API error: ${errorInfo.message}` :
      errorMessage.includes('fetch') || errorMessage.includes('network') ?
      `Network error during image processing: ${errorInfo.message}` :
      `Image generation failed: ${errorInfo.message}`;
    
    const debugInfo = process.env.NODE_ENV === 'development' ? {
      requestId,
      totalTime: `${totalTime}ms`,
      errorType: error?.constructor?.name,
      errorMessage: errorInfo.message,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY
    } : undefined;
    
    return new Response(JSON.stringify({
      success: false,
      error: {
        message: debugMessage,
        code: 'GENERATION_ERROR',
        ...(debugInfo && { debug: debugInfo })
      }
    }), { 
      status: 500, 
      headers: { 
        'Content-Type': 'application/json',
        'X-Request-ID': requestId 
      } 
    });
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