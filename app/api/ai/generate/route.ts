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
 * Generates pixel art using OpenAI's GPT-Image-1 model:
 * - GPT-Image-1 for both text-to-image and image-to-image operations with superior quality
 * - Unified model for all image generation tasks
 * - HD quality + natural style optimized for pixel art creation
 * 1. Generate high-resolution image using GPT-Image-1 model
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
  let apiLogger: ReturnType<typeof createApiLogger>;
  
  try {
    console.log('🚀 STEP 0: Starting initialization');
    startTime = Date.now();
    requestId = crypto.randomUUID();
    console.log('🚀 STEP 0.1: Generated requestId:', requestId);
    
    apiLogger = createApiLogger('/api/ai/generate', requestId);
    console.log('🚀 STEP 0.2: API logger created successfully');
    
    apiLogger.info('AI image generation request started');
    console.log('🚀 STEP 0.3: API logger info call successful');
    
    // Check for bypass parameter (query param or header)
    const { searchParams } = new URL(request.url);
    const bypassFromParam = searchParams.get('bypass') === 'true';
    const bypassFromHeader = request.headers.get('x-bypass-processing') === 'true';
    bypassProcessing = bypassFromParam || bypassFromHeader;
    console.log('🚀 STEP 0.4: Bypass processing check completed:', bypassProcessing);
    
    apiLogger.debug(() => `Processing mode: ${bypassProcessing ? 'BYPASS (Raw GPT-Image-1)' : 'FULL (With Processing)'}`);
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to initialize request', code: 'INIT_ERROR' }
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    console.log('🚀 STEP 1: Main try block started');
    const timer = apiLogger.time('Full AI generation process');
    console.log('🚀 STEP 1.1: Timer created successfully');
    
    // Step 1: Validate request body
    console.log('🚀 STEP 2: Starting request body validation');
    apiLogger.debug('Starting request body validation');
    const validation = await validateRequestBody(request, GenerateRequestSchema);
    console.log('🚀 STEP 2.1: Request body validation completed:', validation.success);
    
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
    console.log('🚀 STEP 3: Checking AI service availability');
    apiLogger.debug('Checking AI service availability');
    const serviceCheck = checkAIServiceAvailability();
    console.log('🚀 STEP 3.1: AI service availability check completed:', serviceCheck.available);
    
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
        
        // For GPT-Image-1 image-to-image, we need to use the input image
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
    console.log('🔍 PROMPT DEBUG - Original prompt:', {
      text: sanitizedPrompt,
      length: sanitizedPrompt.length
    });
    
    const promptEnhancementOptions = {
      mode: mode as AIGenerationMode,
      style: style || 'pixel-art',
      enforceTransparency: enforceTransparentBackground,
      canvasAnalysis: canvasAnalysis || undefined,
      preserveExistingColors: preserveTransparency
    };
    
    const promptResult = generateCompletePrompt(sanitizedPrompt, promptEnhancementOptions);
    let enhancedPrompt = promptResult.finalPrompt;
    
    console.log('🔍 PROMPT DEBUG - Enhanced prompt:', {
      text: enhancedPrompt,
      length: enhancedPrompt.length,
      appliedChanges: promptResult.appliedChanges.length,
      confidence: promptResult.confidence
    });
    
    // CRITICAL: Check if enhanced prompt exceeds GPT-Image-1 limits
    const MAX_PROMPT_LENGTH = 4000; // Conservative limit for GPT-Image-1
    if (enhancedPrompt.length > MAX_PROMPT_LENGTH) {
      console.log('⚠️ PROMPT TOO LONG - Truncating enhanced prompt:', {
        originalLength: enhancedPrompt.length,
        maxLength: MAX_PROMPT_LENGTH
      });
      
      // Intelligently truncate: keep original prompt + essential enhancements
      const truncatedPrompt = enhancedPrompt.substring(0, MAX_PROMPT_LENGTH - 3) + '...';
      enhancedPrompt = truncatedPrompt;
      
      apiLogger.warn('Enhanced prompt truncated due to length limits', {
        originalLength: promptResult.finalPrompt.length,
        truncatedLength: enhancedPrompt.length,
        maxAllowed: MAX_PROMPT_LENGTH
      });
      
      console.log('🔧 PROMPT FIXED - Truncated prompt:', {
        text: enhancedPrompt,
        length: enhancedPrompt.length
      });
    }
    
    apiLogger.debug(() => `Prompt enhancement completed`, undefined, () => ({
      originalLength: sanitizedPrompt.length,
      enhancedLength: enhancedPrompt.length,
      appliedChanges: promptResult.appliedChanges.length,
      confidence: promptResult.confidence.toFixed(2),
      wasTruncated: promptResult.finalPrompt.length > MAX_PROMPT_LENGTH
    }));

    // Step 6: Ensure OpenAI client is initialized
    console.log('🚀 STEP 6: Checking OpenAI client initialization');
    console.log('🚀 STEP 6.1: Current openai client state:', !!openai);
    
    if (!openai) {
      console.log('🚀 STEP 6.2: OpenAI client not initialized, initializing now...');
      apiLogger.debug('Initializing OpenAI client');
      openai = initializeOpenAI();
      console.log('🚀 STEP 6.3: OpenAI initialization result:', !!openai);
      
      if (!openai) {
        console.error('🚀 STEP 6.4: OpenAI client initialization FAILED');
        apiLogger.error('OpenAI client initialization failed - check API key configuration');
        logApiRequest(request, '/ai/generate', startTime, false, 'OpenAI client not initialized');
        return createErrorResponse(
          'AI service initialization failed - check OpenAI API key configuration',
          'SERVICE_INIT_ERROR',
          503
        );
      }
    }
    console.log('🚀 STEP 6.5: OpenAI client ready for API call');

    // Step 7: Generate image using GPT-Image-1 model
    console.log('🚀 STEP 7: Starting GPT-Image-1 API call');
    const aiTimer = apiLogger.time('OpenAI API call');
    apiLogger.info(`Calling GPT-Image-1 API for ${mode} generation`);
    console.log('🚀 STEP 7.1: API timer and logger setup completed');
    
    let dalleResponse: any;
    console.log('🚀 STEP 7.2: About to call DALL-E with mode:', mode);
    
    if (mode === 'image-to-image' && dalleInputImage) {
      // Convert base64 to buffer for image-to-image
      const base64Data = dalleInputImage.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid input image data');
      }
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      apiLogger.debug('Using GPT-Image-1 for image editing (image-to-image mode)');
      dalleResponse = await Promise.race([
        openai.images.edit({
          model: "gpt-image-1", // Note: GPT-Image-1 supports both text-to-image and image editing
          image: imageBuffer as any, // Type assertion for Buffer to Uploadable
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
          quality: "high",
          background: "transparent",
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API call timed out after 10 minutes')), 600000)
        )
      ]) as any;
    } else {
      apiLogger.debug('Using GPT-Image-1 for text-to-image generation');
      dalleResponse = await Promise.race([
        openai.images.generate({
          model: "gpt-image-1",
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
          quality: "high",
          background: "transparent",
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API call timed out after 10 minutes')), 600000)
        )
      ]) as any;
    }

    aiTimer(); // Log API call duration
    
    // DEBUG: Use API Logger to capture response structure
    apiLogger.debug(() => 'GPT-Image-1 API Response Analysis', undefined, () => ({
      responseExists: !!dalleResponse,
      dataExists: !!dalleResponse.data,
      dataLength: dalleResponse.data?.length || 0,
      firstItemKeys: dalleResponse.data?.[0] ? Object.keys(dalleResponse.data[0]) : [],
      firstItemStructure: dalleResponse.data?.[0] || null,
      hasUrl: !!dalleResponse.data?.[0]?.url,
      hasImageUrl: !!dalleResponse.data?.[0]?.image_url,
      hasB64Json: !!dalleResponse.data?.[0]?.b64_json,
      responseType: typeof dalleResponse.data?.[0]
    }));
    
    if (!dalleResponse.data || dalleResponse.data.length === 0) {
      apiLogger.error('No data in GPT-Image-1 response', undefined, { 
        responseKeys: Object.keys(dalleResponse || {}),
        dataValue: dalleResponse.data 
      });
      throw new Error('No image generated by GPT-Image-1');
    }
    
    const firstItem = dalleResponse.data[0];
    const imageUrl = firstItem?.url || firstItem?.image_url || firstItem?.file_url;
    const base64Image = firstItem?.b64_json;
    
    apiLogger.debug(() => 'Image data extraction attempt', undefined, () => ({
      hasUrl: !!imageUrl,
      hasB64Json: !!base64Image,
      extractedUrl: imageUrl,
      allItemKeys: Object.keys(firstItem || {})
    }));
    
    // GPT-Image-1 returns base64 instead of URL
    if (!imageUrl && !base64Image) {
      apiLogger.error('No image data found in GPT-Image-1 response', undefined, {
        availableFields: Object.keys(firstItem || {}),
        firstItemContent: firstItem
      });
      throw new Error(`No image data returned from GPT-Image-1. Available fields: ${Object.keys(firstItem || {}).join(', ')}`);
    }
    
    // Convert base64 to data URL if needed
    let finalImageUrl = imageUrl;
    if (!imageUrl && base64Image) {
      finalImageUrl = `data:image/png;base64,${base64Image}`;
      apiLogger.info('GPT-Image-1 returned base64 image, converted to data URL');
    }

    apiLogger.info('GPT-Image-1 image generation successful');

    // CRITICAL: Bypass processing BEFORE any Sharp/VIPS operations to avoid RGB/RGBA issues
    if (bypassProcessing) {
      const totalTime = Date.now() - startTime;
      
      apiLogger.info('Bypass mode: Returning raw GPT-Image-1 output without processing', {
        totalTime: `${totalTime}ms`,
        outputSize: '1024x1024',
        dataType: base64Image ? 'base64' : 'url'
      });

      const responseData = {
        assetId: requestId, // Use request ID as asset ID
        pngUrl: finalImageUrl, // Return GPT-Image-1 image data (URL or base64)
        palette: [], // No palette generated in bypass mode  
        width: 1024, // Actual GPT-Image-1 size
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

    // Step 8: Get image data (download from URL or convert from base64)
    const downloadTimer = apiLogger.time('Image data processing');
    let imageBuffer: Buffer;
    
    if (base64Image) {
      // GPT-Image-1 returns base64 - convert directly to buffer
      imageBuffer = Buffer.from(base64Image, 'base64');
      apiLogger.debug(() => `Converted base64 to buffer: ${imageBuffer.length} bytes`);
    } else if (finalImageUrl) {
      // URL-based image (DALL-E style) - download it
      const imageResponse = await fetch(finalImageUrl, {
        signal: AbortSignal.timeout(600000) // 10 minute timeout
      });
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image: ${imageResponse.statusText}`);
      }

      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      apiLogger.debug(() => `Downloaded image buffer: ${imageBuffer.length} bytes`);
    } else {
      throw new Error('No valid image data available');
    }
    
    downloadTimer();

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
    const processedBase64Image = `data:image/png;base64,${processed.buffer.toString('base64')}`;

    const totalTime = Date.now() - startTime;

    const responseData = {
      assetId: requestId, // Use request ID as asset ID
      pngUrl: processedBase64Image, // Use pngUrl to match frontend expectations
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
    
    // Enhanced error logging for debugging
    console.error(`❌ [${requestId}] CRITICAL ERROR in AI generation:`, {
      errorType: error?.constructor?.name,
      errorMessage: errorInfo.message,
      errorStack: errorInfo.stack,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Log error with appropriate level based on logger availability
    if (apiLogger) {
      apiLogger.error('AI generation failed', { 
        totalTime: `${totalTime}ms`,
        errorType: error?.constructor?.name 
      }, errorInfo);
    }
    
    logApiRequest(request, '/ai/generate', startTime, false, {
      error: errorInfo.message,
      errorName: errorInfo.name,
      totalTime: `${totalTime}ms`
    });

    // Extract detailed error information for client debugging
    let detailedError: any = {
      originalMessage: errorInfo.message,
      errorType: error?.constructor?.name,
      requestId,
      timestamp: new Date().toISOString(),
      totalTime: `${totalTime}ms`
    };

    // Check for OpenAI API specific errors
    if (error && typeof error === 'object') {
      // OpenAI API error with response
      if ('response' in error && error.response) {
        const response = error.response as any;
        detailedError = {
          ...detailedError,
          openaiError: {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers
          }
        };
        console.error(`❌ [${requestId}] OpenAI API Response Error:`, response.data);
      }
      
      // OpenAI SDK error
      if ('error' in error && error.error) {
        detailedError = {
          ...detailedError,
          openaiSdkError: error.error
        };
        console.error(`❌ [${requestId}] OpenAI SDK Error:`, error.error);
      }
      
      // Network/Fetch errors
      if ('code' in error) {
        detailedError = {
          ...detailedError,
          networkError: {
            code: (error as any).code,
            errno: (error as any).errno,
            syscall: (error as any).syscall
          }
        };
        console.error(`❌ [${requestId}] Network Error:`, (error as any).code);
      }
    }

    // Handle specific OpenAI API errors using safe error info
    const errorMessage = errorInfo.message.toLowerCase();
    
    if (errorMessage.includes('insufficient_quota')) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          message: 'AI service quota exceeded',
          code: 'AI_QUOTA_EXCEEDED',
          details: detailedError
        }
      }), { 
        status: 503, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': requestId 
        } 
      });
    }
    
    if (errorMessage.includes('rate_limit_exceeded')) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          message: 'AI service rate limit exceeded - please try again later',
          code: 'AI_RATE_LIMIT',
          details: detailedError
        }
      }), { 
        status: 429, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': requestId 
        } 
      });
    }
    
    if (errorMessage.includes('content_policy_violation')) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          message: 'Content policy violation - please try a different prompt',
          code: 'CONTENT_POLICY_VIOLATION',
          details: detailedError
        }
      }), { 
        status: 400, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': requestId 
        } 
      });
    }
    
    if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          message: 'Generation timeout after 10 minutes - please try with a simpler prompt or check OpenAI service status',
          code: 'TIMEOUT_ERROR',
          details: detailedError
        }
      }), { 
        status: 408, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': requestId 
        } 
      });
    }

    // Return comprehensive error response with all debugging information
    return new Response(JSON.stringify({
      success: false,
      error: {
        message: `AI generation failed: ${errorInfo.message}`,
        code: 'GENERATION_ERROR',
        details: detailedError,
        // Include raw error for debugging
        rawError: process.env.NODE_ENV === 'development' ? {
          name: errorInfo.name,
          message: errorInfo.message,
          stack: errorInfo.stack?.substring(0, 1000) // Limit stack trace size
        } : undefined
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