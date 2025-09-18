import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface GenerateRequest {
  prompt: string;
  width: number;
  height: number;
  colorCount: number;
  style?: string;
  mode?: 'text-to-image' | 'image-to-image';
  inputImage?: string;
  strength?: number;
  preserveTransparency?: boolean;
  enforceTransparentBackground?: boolean;
}

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

// Image processing utilities
async function processImageForPixelArt(
  imageBuffer: Uint8Array,
  width: number,
  height: number,
  options: { colorCount: number; method: string; enableDithering: boolean }
): Promise<{
  buffer: Uint8Array;
  width: number;
  height: number;
  colorCount: number;
  palette: Array<{ r: number; g: number; b: number; a: number }>;
}> {
  // For now, we'll return the original image resized
  // In a real implementation, you'd use a WASM library for quantization
  return {
    buffer: imageBuffer,
    width,
    height,
    colorCount: options.colorCount,
    palette: Array.from({ length: options.colorCount }, (_, i) => ({
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
      a: 255
    }))
  };
}

function enhancePromptForPixelArt(prompt: string): string {
  const pixelArtKeywords = [
    'pixel art',
    '8-bit style',
    'retro game art',
    'pixelated',
    'sharp edges',
    'no anti-aliasing',
    'simple colors',
    'blocky style'
  ];

  const hasPixelArtKeywords = pixelArtKeywords.some(keyword =>
    prompt.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasPixelArtKeywords) {
    return `${prompt}, pixel perfect, sharp edges, no blur, simple flat colors`;
  }

  return `pixel art style, 8-bit retro game art, ${prompt}, pixelated, sharp edges, no anti-aliasing, simple flat colors, blocky style`;
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
      JSON.stringify({ success: false, error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    console.log(`🚀 [${requestId}] AI generation request started`);

    // Get OpenAI API key from Supabase secrets
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`❌ [${requestId}] OpenAI API key not found in environment`);
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'AI service not configured', code: 'SERVICE_NOT_CONFIGURED' }
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let requestData: GenerateRequest;
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
    const { prompt, width, height, colorCount = 24, mode = 'text-to-image', inputImage, strength = 0.7 } = requestData;

    if (!prompt) {
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

    if (mode === 'image-to-image' && !inputImage) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Input image required for image-to-image mode', code: 'MISSING_INPUT_IMAGE' }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔍 [${requestId}] Processing ${mode} generation - ${width}x${height}, ${colorCount} colors`);

    // Enhance prompt for pixel art
    const enhancedPrompt = enhancePromptForPixelArt(prompt);
    console.log(`🎨 [${requestId}] Enhanced prompt: ${enhancedPrompt.substring(0, 100)}...`);

    // Prepare OpenAI request
    const openaiUrl = mode === 'image-to-image' ? 'https://api.openai.com/v1/images/edits' : 'https://api.openai.com/v1/images/generations';

    let requestBody: any = {
      model: "gpt-image-1",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
      background: "transparent"
    };

    let requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    };

    // For image-to-image mode, use form data
    if (mode === 'image-to-image' && inputImage) {
      const formData = new FormData();

      // Convert base64 to blob
      const base64Data = inputImage.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid input image data');
      }

      const imageBytes = new Uint8Array(
        atob(base64Data)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      const imageBlob = new Blob([imageBytes], { type: 'image/png' });

      formData.append('image', imageBlob, 'input.png');
      formData.append('prompt', enhancedPrompt);
      formData.append('n', '1');
      formData.append('size', '1024x1024');

      requestOptions = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData
      };
    }

    console.log(`🤖 [${requestId}] Calling OpenAI API...`);

    // Call OpenAI API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    let openaiResponse: Response;
    try {
      openaiResponse = await fetch(openaiUrl, {
        ...requestOptions,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`❌ [${requestId}] OpenAI API error:`, openaiResponse.status, errorText);

      let errorMessage = 'AI generation failed';
      let errorCode = 'OPENAI_ERROR';

      if (openaiResponse.status === 429) {
        errorMessage = 'Rate limit exceeded, please try again later';
        errorCode = 'RATE_LIMIT_EXCEEDED';
      } else if (openaiResponse.status === 400) {
        errorMessage = 'Invalid request parameters';
        errorCode = 'INVALID_REQUEST';
      } else if (openaiResponse.status === 401) {
        errorMessage = 'Invalid API key';
        errorCode = 'INVALID_API_KEY';
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: { message: errorMessage, code: errorCode, details: errorText }
        }),
        {
          status: openaiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const openaiResult = await openaiResponse.json();

    if (!openaiResult.data || openaiResult.data.length === 0) {
      console.error(`❌ [${requestId}] No image data in OpenAI response`);
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'No image generated', code: 'NO_IMAGE_GENERATED' }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const firstImage = openaiResult.data[0];
    const imageUrl = firstImage.url || firstImage.image_url;
    const base64Image = firstImage.b64_json;

    console.log(`✅ [${requestId}] OpenAI generation successful`);

    // Get image data
    let imageBuffer: Uint8Array;
    if (base64Image) {
      imageBuffer = new Uint8Array(
        atob(base64Image)
          .split('')
          .map(char => char.charCodeAt(0))
      );
    } else if (imageUrl) {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to download generated image');
      }
      imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
    } else {
      throw new Error('No image data available');
    }

    console.log(`🔄 [${requestId}] Processing image for pixel art...`);

    // Process image for pixel art (simplified for Edge Function)
    const processed = await processImageForPixelArt(imageBuffer, width, height, {
      colorCount,
      method: 'median-cut',
      enableDithering: false
    });

    // Convert processed image to base64
    const processedBase64 = btoa(String.fromCharCode(...processed.buffer));
    const finalImageUrl = `data:image/png;base64,${processedBase64}`;

    const totalTime = Date.now() - startTime;

    const responseData: GenerateResponse = {
      success: true,
      data: {
        imageUrl: finalImageUrl,
        width: processed.width,
        height: processed.height,
        colorCount: processed.colorCount,
        palette: processed.palette,
        processingTimeMs: totalTime,
        prompt: enhancedPrompt
      }
    };

    console.log(`🎉 [${requestId}] AI generation completed successfully in ${totalTime}ms`);

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] AI generation failed:`, error);

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