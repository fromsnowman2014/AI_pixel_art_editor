import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface VideoGenerateRequest {
  prompt: string;
  width: number;  // Target pixel art dimensions (e.g., 64x64)
  height: number;
  colorCount: number; // For client-side quantization
  fps?: 12 | 24 | 30; // Target FPS for frame extraction
  duration?: number; // MVP: Always 1.0 (hardcoded), Future: 1-5 seconds for premium
}

interface VideoGenerateResponse {
  success: boolean;
  data?: {
    videoUrl: string; // URL to download video (MP4/WebM)
    sourceWidth: number; // Original video dimensions (e.g., 1024x1024)
    sourceHeight: number;
    duration: number;
    prompt: string;
    enhancedPrompt: string; // What we actually sent to Luma
    processingTimeMs: number;

    // Client-side processing instructions
    clientProcessing: {
      targetWidth: number;
      targetHeight: number;
      targetFps: number;
      colorCount: number;
      method: 'FastVideoProcessor'; // Tell client which processor to use
      maxDuration: number; // MVP: enforce 1 second limit
    };
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Enhance prompt for HIGH QUALITY video generation
 * IMPORTANT: Do NOT add pixel art keywords!
 * Client-side FastVideoProcessor will handle pixel art conversion
 */
function enhancePromptForVideo(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  // Quality keywords to add (NOT pixel art keywords!)
  const qualityKeywords = [
    'high quality',
    'detailed',
    'clear',
    'smooth motion',
    'fluid animation',
    'consistent style'
  ];

  // Check if prompt already has quality keywords
  const hasQualityKeywords = qualityKeywords.some(keyword =>
    lowerPrompt.includes(keyword.toLowerCase())
  );

  if (hasQualityKeywords) {
    // Already has quality keywords, just add smooth motion
    return `${prompt}, smooth animation, consistent motion`;
  }

  // Add comprehensive quality enhancement (NO pixel art keywords!)
  return `${prompt}, high quality animation, smooth motion, detailed, clear, consistent style`;
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    console.log(`🎬 [${requestId}] Video generation request started`);

    // Get Luma API key from Supabase secrets
    // TODO: Replace with actual Luma API key when available
    const lumaApiKey = Deno.env.get('LUMA_API_KEY') || 'TEMP_LUMA_API_KEY_NOT_SET';

    if (lumaApiKey === 'TEMP_LUMA_API_KEY_NOT_SET') {
      console.warn(`⚠️ [${requestId}] Using temporary API key - REPLACE WITH REAL KEY`);
    }

    // Parse request body
    let requestData: VideoGenerateRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      console.error(`❌ [${requestId}] Invalid JSON in request body:`, error);
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Invalid JSON in request body', code: 'INVALID_JSON' }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate required fields
    const { prompt, width, height, colorCount = 16, fps = 24 } = requestData;

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Prompt is required', code: 'MISSING_PROMPT' }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!width || !height || width < 8 || height < 8 || width > 128 || height > 128) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Invalid dimensions (8-128 pixels)', code: 'INVALID_DIMENSIONS' }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // MVP: Enforce 5 second duration (Luma API minimum)
    const duration = 5; // Luma API only supports 5s, 9s, or 10s (we use 5s for MVP)

    if (requestData.duration && requestData.duration !== 5) {
      console.warn(`⚠️ [${requestId}] Duration ${requestData.duration}s requested but MVP uses 5s (Luma API minimum)`);
    }

    console.log(`🔍 [${requestId}] Processing video generation - ${width}x${height}, ${colorCount} colors, ${fps} fps, ${duration}s`);

    // Enhance prompt for HIGH QUALITY video (NOT pixel art!)
    const enhancedPrompt = enhancePromptForVideo(prompt);
    console.log(`🎨 [${requestId}] Original: "${prompt}"`);
    console.log(`🎨 [${requestId}] Enhanced: "${enhancedPrompt}"`);
    console.log(`⏱️ [${requestId}] Duration: ${duration}s (MVP: 5s minimum due to Luma API constraint)`);

    // TODO: Call Luma API when key is available
    // For now, return mock response for development
    if (lumaApiKey === 'TEMP_LUMA_API_KEY_NOT_SET') {
      console.log(`🔧 [${requestId}] DEVELOPMENT MODE: Returning mock response`);

      const mockResponse: VideoGenerateResponse = {
        success: true,
        data: {
          // Mock video URL (this would be from Luma in production)
          videoUrl: 'https://storage.lumalabs.ai/mock/sample-animation.mp4',
          sourceWidth: 1024,
          sourceHeight: 1024,
          duration: duration,
          prompt: prompt,
          enhancedPrompt: enhancedPrompt,
          processingTimeMs: Date.now() - startTime,
          clientProcessing: {
            targetWidth: width,
            targetHeight: height,
            targetFps: fps,
            colorCount: colorCount,
            method: 'FastVideoProcessor',
            maxDuration: 5.0
          }
        }
      };

      return new Response(
        JSON.stringify(mockResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Production: Call Luma API
    console.log(`🤖 [${requestId}] Calling Luma API...`);

    const lumaResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lumaApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'ray-2',
        prompt: enhancedPrompt,
        duration: '5s', // Luma API minimum is 5s (also supports 9s, 10s)
        resolution: '720p' // High resolution for better quality when downscaling
      })
    });

    if (!lumaResponse.ok) {
      const errorText = await lumaResponse.text();
      console.error(`❌ [${requestId}] Luma API error:`, lumaResponse.status, errorText);

      let errorMessage = 'Video generation failed';
      let errorCode = 'LUMA_ERROR';

      if (lumaResponse.status === 429) {
        errorMessage = 'Rate limit exceeded, please try again later';
        errorCode = 'RATE_LIMIT_EXCEEDED';
      } else if (lumaResponse.status === 400) {
        errorMessage = 'Invalid request parameters';
        errorCode = 'INVALID_REQUEST';
      } else if (lumaResponse.status === 401) {
        errorMessage = 'Invalid API key';
        errorCode = 'INVALID_API_KEY';
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: { message: errorMessage, code: errorCode, details: errorText }
        }),
        {
          status: lumaResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const initialData = await lumaResponse.json();
    console.log(`📦 [${requestId}] Luma API initial response:`, JSON.stringify(initialData, null, 2));

    const generationId = initialData.id;
    console.log(`🎬 [${requestId}] Generation started with ID: ${generationId}`);
    console.log(`⏳ [${requestId}] Waiting for video generation to complete...`);

    // Poll for completion (Luma API is async)
    let lumaData = initialData;
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    while (lumaData.state === 'queued' || lumaData.state === 'dreaming') {
      if (attempts >= maxAttempts) {
        console.error(`❌ [${requestId}] Timeout waiting for video generation`);
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: 'Video generation timeout',
              code: 'GENERATION_TIMEOUT',
              details: { generationId, state: lumaData.state }
            }
          }),
          {
            status: 408,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Wait 5 seconds before polling
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

      // Check generation status
      const statusResponse = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${lumaApiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!statusResponse.ok) {
        console.error(`❌ [${requestId}] Failed to check generation status`);
        break;
      }

      lumaData = await statusResponse.json();
      console.log(`🔄 [${requestId}] Status check ${attempts}/${maxAttempts}: ${lumaData.state}`);
    }

    // Check if generation completed successfully
    if (lumaData.state !== 'completed') {
      console.error(`❌ [${requestId}] Generation failed or incomplete:`, lumaData);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: `Video generation ${lumaData.state}`,
            code: 'GENERATION_FAILED',
            details: { generationId, state: lumaData.state, reason: lumaData.failure_reason }
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract video URL from completed generation
    if (!lumaData.assets || !lumaData.assets.video) {
      console.error(`❌ [${requestId}] No video URL in completed generation:`, lumaData);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'No video URL in response',
            code: 'NO_VIDEO_URL',
            details: lumaData
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const videoUrl = lumaData.assets.video;
    console.log(`✅ [${requestId}] Video generation completed successfully`);
    console.log(`   Generation ID: ${generationId}`);
    console.log(`   Attempts: ${attempts}`);
    console.log(`   Video URL: ${videoUrl}`);

    const totalTime = Date.now() - startTime;

    const responseData: VideoGenerateResponse = {
      success: true,
      data: {
        videoUrl: videoUrl,
        sourceWidth: 1024, // Luma default
        sourceHeight: 1024,
        duration: duration,
        prompt: prompt,
        enhancedPrompt: enhancedPrompt,
        processingTimeMs: totalTime,
        clientProcessing: {
          targetWidth: width,
          targetHeight: height,
          targetFps: fps,
          colorCount: colorCount,
          method: 'FastVideoProcessor',
          maxDuration: 5.0 // MVP: 5 seconds (Luma API minimum)
        }
      }
    };

    console.log(`🎉 [${requestId}] Video generation completed successfully in ${totalTime}ms`);

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Video generation failed:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'GENERATION_ERROR',
          details: {
            requestId,
            processingTimeMs: totalTime,
            timestamp: new Date().toISOString()
          }
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
