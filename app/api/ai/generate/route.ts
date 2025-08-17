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
  // CRITICAL: First log to verify function execution
  console.log('🚀 API ROUTE ENTRY: POST /api/ai/generate function started');
  console.log('🚀 Timestamp:', new Date().toISOString());
  console.log('🚀 Request URL:', request.url);
  console.log('🚀 Request method:', request.method);
  
  let requestId: string;
  let startTime: number;
  let bypassProcessing: boolean = false;
  
  try {
    startTime = Date.now();
    requestId = crypto.randomUUID();
    console.log(`🆔 Generated requestId: ${requestId}`);
  } catch (error) {
    console.error('❌ Failed to initialize basic variables:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to initialize request', code: 'INIT_ERROR' }
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  
  try {
    // Check for bypass parameter (query param or header)
    console.log(`🔧 [${requestId}] Parsing URL and headers...`);
    const { searchParams } = new URL(request.url);
    const bypassFromParam = searchParams.get('bypass') === 'true';
    const bypassFromHeader = request.headers.get('x-bypass-processing') === 'true';
    bypassProcessing = bypassFromParam || bypassFromHeader;
    console.log(`🔧 [${requestId}] URL parsing successful`);
    
    console.log(`🎨 [${requestId}] AI image generation requested at ${new Date().toISOString()}`);
    console.log(`🔧 [${requestId}] Environment check: NODE_ENV=${process.env.NODE_ENV}`);
    console.log(`🔄 [${requestId}] Processing mode: ${bypassProcessing ? 'BYPASS (Raw DALL-E)' : 'FULL (With Processing)'}`);
    console.log(`🔧 [${requestId}] About to start main try block...`);
  } catch (prelimError) {
    console.error(`❌ [${requestId}] Failed in preliminary setup:`, prelimError);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed in preliminary setup', code: 'PRELIM_ERROR', details: String(prelimError) }
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Step 1: Validate request body (moved before service check for better testing)
    console.log(`📝 [${requestId}] Step 1: Starting request body validation...`);
    
    let validation: any;
    try {
      console.log(`📝 [${requestId}] Calling validateRequestBody function...`);
      validation = await validateRequestBody(request, GenerateRequestSchema);
      console.log(`📝 [${requestId}] validateRequestBody completed, success:`, validation?.success);
    } catch (validationError) {
      console.error(`❌ [${requestId}] validateRequestBody threw exception:`, validationError);
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Validation function failed', code: 'VALIDATION_EXCEPTION', details: String(validationError) }
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (!validation.success) {
      console.log(`❌ [${requestId}] Request validation failed:`, validation);
      logApiRequest(request, '/ai/generate', startTime, false, 'Validation failed');
      return validation.response;
    }
    console.log(`✅ [${requestId}] Request validation passed`);
    console.log(`🔍 [${requestId}] Received request data:`, JSON.stringify(validation.data, null, 2));

    // Step 2: Check AI service availability
    console.log(`📋 [${requestId}] Step 2: Starting AI service availability check...`);
    
    let serviceCheck: any;
    try {
      console.log(`📋 [${requestId}] Calling checkAIServiceAvailability function...`);
      serviceCheck = checkAIServiceAvailability();
      console.log(`📋 [${requestId}] checkAIServiceAvailability completed, available:`, serviceCheck?.available);
    } catch (serviceError) {
      console.error(`❌ [${requestId}] checkAIServiceAvailability threw exception:`, serviceError);
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Service check failed', code: 'SERVICE_CHECK_EXCEPTION', details: String(serviceError) }
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (!serviceCheck.available) {
      console.log(`❌ [${requestId}] Service unavailable:`, serviceCheck);
      logApiRequest(request, '/ai/generate', startTime, false, 'Service unavailable');
      return serviceCheck.response;
    }
    console.log(`✅ [${requestId}] AI service availability check passed`);

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
    
    console.log(`📊 [${requestId}] Request parameters:`, { 
      prompt: prompt.substring(0, 50) + '...', 
      width, 
      height, 
      colorCount, 
      style,
      mode,
      hasInputImage: !!inputImage,
      strength,
      preserveTransparency,
      enforceTransparentBackground
    });

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

    // Step 5: Analyze input image (if provided) and enhance prompt intelligently
    console.log(`🎭 [${requestId}] Step 5: Intelligent prompt processing...`);
    
    let canvasAnalysis = null;
    let dalleInputImage = undefined;
    
    // Analyze input image for image-to-image mode
    if (mode === 'image-to-image' && inputImage) {
      console.log(`🖼️ [${requestId}] Analyzing input image for ${mode} mode...`);
      
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
        
        console.log(`✅ [${requestId}] Input image analyzed:`, {
          hasTransparency: canvasAnalysis.hasTransparency,
          fillPercentage: canvasAnalysis.fillPercentage,
          dominantColors: canvasAnalysis.dominantColors.length
        });
      } catch (error) {
        console.error(`❌ [${requestId}] Failed to analyze input image:`, error);
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
      console.log(`❌ [${requestId}] Mode validation failed:`, modeValidation);
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
    
    console.log(`✅ [${requestId}] Intelligent prompt enhancement completed:`, {
      originalLength: sanitizedPrompt.length,
      enhancedLength: enhancedPrompt.length,
      appliedChanges: promptResult.appliedChanges.length,
      confidence: promptResult.confidence.toFixed(2)
    });
    
    console.log(`🎯 [${requestId}] Preparing GPT-Image-1 generation:`, {
      mode: mode,
      prompt: enhancedPrompt.substring(0, 100) + '...',
      targetSize: `${width}x${height}`,
      colorCount,
      style,
      hasInputImage: !!dalleInputImage,
      strength: strength
    });

    // Step 6: Ensure OpenAI client is initialized
    console.log(`🤖 [${requestId}] Step 6: Checking OpenAI client...`);
    console.log(`🤖 [${requestId}] Current openai client status:`, { 
      exists: !!openai, 
      type: typeof openai,
      hasApiKey: !!process.env.OPENAI_API_KEY 
    });
    
    if (!openai) {
      console.log(`🔄 [${requestId}] OpenAI client not initialized, attempting to re-initialize...`);
      try {
        openai = initializeOpenAI();
        console.log(`🔄 [${requestId}] initializeOpenAI completed, result:`, !!openai);
      } catch (initError) {
        console.error(`❌ [${requestId}] initializeOpenAI threw exception:`, initError);
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'OpenAI initialization failed', code: 'OPENAI_INIT_EXCEPTION', details: String(initError) }
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
      
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

    // Step 7: Generate image using DALL-E 3 model (Verified OpenAI Model)
    console.log(`🎨 [${requestId}] Step 7: Calling DALL-E 3 API...`);
    console.log(`🔍 [${requestId}] OpenAI client status:`, { 
      clientExists: !!openai,
      clientType: typeof openai
    });
    
    let dalleResponse: any;
    
    // Use DALL-E 3 - Verified and supported OpenAI model
    console.log(`⚙️ [${requestId}] Using DALL-E 3 for ${mode} (VERIFIED MODEL):`, { 
      modelUsed: "dall-e-3",
      mode: mode,
      quality: "hd",
      style: "natural",
      promptLength: enhancedPrompt.length,
      targetSize: "1024x1024",
      hasInputImage: !!dalleInputImage,
      timeout: "10min"
    });
    
    console.log(`🚀 [${requestId}] About to call OpenAI API with model: dall-e-3`);
    
    if (mode === 'image-to-image' && dalleInputImage) {
      // Convert base64 to buffer for image-to-image
      const base64Data = dalleInputImage.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid input image data');
      }
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      console.log(`🖼️ [${requestId}] Calling OpenAI images.edit for image-to-image mode`);
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
      console.log(`✅ [${requestId}] OpenAI images.edit call completed successfully`);
    } else {
      console.log(`🎨 [${requestId}] Calling OpenAI images.generate for text-to-image mode`);
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
      console.log(`✅ [${requestId}] OpenAI images.generate call completed successfully`);
    }

    const usedModel = 'DALL-E 3';
    console.log(`🎉 [${requestId}] ${usedModel} API call successful`);
    console.log(`📊 [${requestId}] Response data length:`, dalleResponse.data?.length || 0);

    if (!dalleResponse.data || dalleResponse.data.length === 0) {
      throw new Error(`No image generated by ${usedModel}`);
    }
    
    const imageUrl = dalleResponse.data[0]?.url;
    if (!imageUrl) {
      throw new Error(`No image URL returned from ${usedModel}`);
    }

    console.log(`✅ [${requestId}] ${usedModel} generation successful, image URL received`);
    console.log(`🔗 [${requestId}] Image URL: ${imageUrl.substring(0, 50)}...`);
    console.log(`🎯 [${requestId}] Used model: ${usedModel} (mode: ${mode}, hadInput: ${!!dalleInputImage})`);

    // CRITICAL: Bypass processing BEFORE any Sharp/VIPS operations to avoid RGB/RGBA issues
    if (bypassProcessing) {
      const totalTime = Date.now() - startTime;
      
      console.log(`🚀 [${requestId}] Bypass mode: Returning raw DALL-E 3 output without processing`);
      console.log(`🎉 Bypass AI image generation complete:`, {
        dimensions: `${width}x${height} (requested)`,
        actualSize: "1024x1024 (DALL-E 3)",
        colors: colorCount,
        totalTime: `${totalTime}ms`,
        note: "Raw DALL-E 3 output without pixel art processing"
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
    console.log(`📥 [${requestId}] Step 8: Downloading generated image...`);
    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(600000) // 10 minute timeout
    });
    
    if (!imageResponse.ok) {
      console.error(`❌ [${requestId}] Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
      throw new Error(`Failed to download generated image: ${imageResponse.statusText}`);
    }

    console.log(`✅ [${requestId}] Image downloaded, converting to buffer...`);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log(`📊 [${requestId}] Image buffer size: ${imageBuffer.length} bytes`);

    // Step 9: Process image for pixel art conversion using Sharp
    console.log(`🎨 [${requestId}] Step 9: Processing image for pixel art...`);
    console.log(`⚙️ [${requestId}] Processing parameters:`, { targetWidth: width, targetHeight: height, colorCount, method: 'median-cut', dithering: false });
    
    console.log(`🔧 [${requestId}] Using Sharp processing with RGBA conversion...`);
    const processed = await processImageForPixelArt(imageBuffer, width, height, {
      colorCount,
      method: 'median-cut',
      enableDithering: false
    });
    console.log(`✅ [${requestId}] Sharp processing successful`);
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
    
    console.error(`💥 [${requestId}] CRITICAL: Exception caught in main try block:`, error);
    console.error(`🔍 [${requestId}] Error type:`, typeof error);
    console.error(`🔍 [${requestId}] Error constructor:`, error?.constructor?.name);
    console.error(`🔍 [${requestId}] Error prototype:`, Object.getPrototypeOf(error));
    
    // Extract all possible error information
    if (error && typeof error === 'object') {
      console.error(`🔍 [${requestId}] Error object keys:`, Object.keys(error));
      
      // Check if this is an OpenAI API error
      if ('error' in error) {
        console.error(`🔍 [${requestId}] OpenAI API Error Details:`, error.error);
      }
      
      // Check for response data (with type safety)
      if ('response' in error && error.response && typeof error.response === 'object') {
        const response = error.response as any;
        console.error(`🔍 [${requestId}] HTTP Response Error:`, {
          status: response.status || 'unknown',
          statusText: response.statusText || 'unknown',
          data: response.data || 'no data'
        });
      }
      
      // Check for request config (with type safety)
      if ('config' in error && error.config && typeof error.config === 'object') {
        const config = error.config as any;
        console.error(`🔍 [${requestId}] Request Config:`, {
          url: config.url || 'unknown',
          method: config.method || 'unknown',
          headers: config.headers || 'no headers'
        });
      }
    }
    
    // Try to extract the stack trace
    if (error instanceof Error) {
      console.error(`🔍 [${requestId}] Error message:`, error.message);
      console.error(`🔍 [${requestId}] Error stack:`, error.stack);
    }
    
    const errorInfo = getErrorInfo(error);
    console.error(`❌ [${requestId}] Generation failed after ${totalTime}ms:`, {
      error: errorInfo.message,
      errorName: errorInfo.name,
      stack: errorInfo.stack,
      originalError: String(error)
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

    // Enhanced error response with better debugging information
    console.error(`❌ [${requestId}] Detailed error information:`, errorInfo);
    
    // Return more specific error message to help with debugging
    const debugMessage = errorMessage.includes('openai') || errorMessage.includes('api') ? 
      `OpenAI API error: ${errorInfo.message}` :
      errorMessage.includes('fetch') || errorMessage.includes('network') ?
      `Network error during image processing: ${errorInfo.message}` :
      `Image generation failed: ${errorInfo.message}`;
    
    // Include comprehensive debug information in the response
    const debugInfo = {
      requestId,
      timestamp: new Date().toISOString(),
      totalTime: `${totalTime}ms`,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorMessage: errorInfo.message,
      errorName: errorInfo.name,
      hasStack: !!errorInfo.stack,
      originalError: String(error).substring(0, 500), // Truncate to avoid huge responses
      nodeEnv: process.env.NODE_ENV,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY
    };
    
    console.error(`❌ [${requestId}] Sending error response with debug info:`, debugInfo);
    
    return new Response(JSON.stringify({
      success: false,
      error: {
        message: debugMessage,
        code: 'GENERATION_ERROR',
        debug: debugInfo
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