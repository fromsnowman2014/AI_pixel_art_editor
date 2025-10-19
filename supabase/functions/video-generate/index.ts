import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface VideoGenerateRequest {
  prompt: string;
  width: number;
  height: number;
  colorCount: number;
  fps?: 12 | 24 | 30;
  projectId?: string;
}

interface VideoGenerateResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: string;
    estimatedTimeSeconds: number;
    message: string;
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-email, x-user-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
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
    console.log(`🎬 [${requestId}] Video generation job creation started`);

    // Initialize Supabase client (with service role key for DB operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get authentication - Support both Supabase Auth and NextAuth
    const authHeader = req.headers.get('authorization');
    const userEmail = req.headers.get('x-user-email');
    const userId = req.headers.get('x-user-id');

    let authenticatedUserId: string;

    // Try NextAuth first (custom headers)
    if (userEmail && userId) {
      console.log(`✅ [${requestId}] Using NextAuth user: ${userEmail}`);
      // Generate a deterministic UUID from the user email
      // This ensures the same email always gets the same UUID
      authenticatedUserId = await generateUuidFromEmail(userEmail);
      console.log(`🔑 [${requestId}] Generated UUID: ${authenticatedUserId} from email: ${userEmail}`);
    }
    // Fallback to Supabase Auth
    else if (authHeader) {
      // Create client with user's JWT for auth verification
      const authClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: {
          headers: { Authorization: authHeader }
        }
      });

      // Get authenticated user
      const { data: { user }, error: authError } = await authClient.auth.getUser();

      if (authError || !user) {
        console.error(`❌ [${requestId}] Supabase authentication failed:`, authError);
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Authentication failed', code: 'UNAUTHORIZED' }
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`✅ [${requestId}] Supabase user authenticated: ${user.id}`);
      authenticatedUserId = user.id;
    }
    // No authentication provided
    else {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Missing authentication', code: 'UNAUTHORIZED' }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let requestData: VideoGenerateRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Invalid JSON', code: 'INVALID_JSON' }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate required fields
    const { prompt, width, height, colorCount, fps = 24, projectId } = requestData;

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
          error: { message: 'Invalid dimensions (8-128)', code: 'INVALID_DIMENSIONS' }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (![12, 24, 30].includes(fps)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'FPS must be 12, 24, or 30', code: 'INVALID_FPS' }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📝 [${requestId}] Creating job for user ${authenticatedUserId}: ${width}x${height}, ${fps}fps, ${colorCount} colors`);

    // Create database job record
    console.log(`💾 [${requestId}] Inserting job record:`, {
      user_id: authenticatedUserId,
      project_id: projectId || null,
      prompt: prompt.trim().substring(0, 50) + '...',
      dimensions: `${width}x${height}`
    });

    const { data: job, error: jobError } = await supabaseClient
      .from('video_generation_jobs')
      .insert({
        user_id: authenticatedUserId,
        project_id: projectId || null,
        prompt: prompt.trim(),
        width,
        height,
        color_count: colorCount,
        fps,
        duration: 5.0,
        status: 'pending',
        progress: 0,
        progress_message: 'Job created, preparing to call Luma API...'
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error(`❌ [${requestId}] Failed to create job:`, jobError);

      // Check for UUID type error
      const isUuidError = jobError?.message?.includes('uuid') ||
                         jobError?.message?.includes('UUID');

      if (isUuidError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: 'Database schema error: project_id column needs to be TEXT type instead of UUID. Please run the migration: 20250118000000_fix_video_jobs_project_id_type.sql',
              code: 'SCHEMA_ERROR',
              details: {
                issue: 'project_id column type mismatch',
                expected: 'TEXT',
                actual: 'UUID',
                migration: '20250118000000_fix_video_jobs_project_id_type.sql',
                error: jobError
              }
            }
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'Failed to create job',
            code: 'JOB_CREATION_FAILED',
            details: jobError
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ [${requestId}] Job created with ID: ${job.id}`);

    // Get Luma API key
    const lumaApiKey = Deno.env.get('LUMA_API_KEY');
    if (!lumaApiKey) {
      console.error(`❌ [${requestId}] Luma API key not configured`);

      // Update job status to failed
      await supabaseClient
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_code: 'SERVICE_NOT_CONFIGURED',
          error_message: 'Luma API key not configured',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Service not configured', code: 'SERVICE_NOT_CONFIGURED' }
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhance prompt for high-quality video
    const enhancedPrompt = enhancePromptForVideo(prompt);
    console.log(`🎨 [${requestId}] Enhanced prompt: "${enhancedPrompt}"`);

    // Construct webhook callback URL
    const webhookUrl = `${supabaseUrl}/functions/v1/video-webhook`;
    console.log(`🔗 [${requestId}] Webhook URL: ${webhookUrl}`);

    // Call Luma API
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
        duration: '5s',
        resolution: '720p',
        callback_url: `${webhookUrl}?job_id=${job.id}`
      })
    });

    if (!lumaResponse.ok) {
      const errorText = await lumaResponse.text();
      console.error(`❌ [${requestId}] Luma API error:`, lumaResponse.status, errorText);

      // Update job status
      await supabaseClient
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_code: 'LUMA_API_ERROR',
          error_message: `Luma API error: ${lumaResponse.status}`,
          error_details: { status: lumaResponse.status, error: errorText },
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'Failed to start video generation',
            code: 'LUMA_API_ERROR',
            details: { status: lumaResponse.status, error: errorText }
          }
        }),
        {
          status: lumaResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const lumaData = await lumaResponse.json();
    const generationId = lumaData.id;

    console.log(`✅ [${requestId}] Luma generation started: ${generationId}`);

    // Update job with Luma generation ID
    await supabaseClient
      .from('video_generation_jobs')
      .update({
        luma_generation_id: generationId,
        status: 'queued',
        progress: 10,
        progress_message: 'Video generation queued at Luma...',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    const totalTime = Date.now() - startTime;

    const response: VideoGenerateResponse = {
      success: true,
      data: {
        jobId: job.id,
        status: 'queued',
        estimatedTimeSeconds: 120, // 2 minutes average
        message: 'Video generation started. Subscribe to job updates for progress.'
      }
    };

    console.log(`🎉 [${requestId}] Job created and queued successfully in ${totalTime}ms`);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Video generation job creation failed:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'JOB_CREATION_ERROR',
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

/**
 * Enhance prompt for HIGH QUALITY video (NOT pixel art!)
 */
function enhancePromptForVideo(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  const qualityKeywords = [
    'high quality',
    'detailed',
    'clear',
    'smooth motion',
    'fluid animation',
    'consistent style'
  ];

  const hasQualityKeywords = qualityKeywords.some(keyword =>
    lowerPrompt.includes(keyword.toLowerCase())
  );

  if (hasQualityKeywords) {
    return `${prompt}, smooth animation, consistent motion`;
  }

  return `${prompt}, high quality animation, smooth motion, detailed, clear, consistent style`;
}

/**
 * Generate a deterministic UUID v5 from an email address
 * This ensures the same email always produces the same UUID
 */
async function generateUuidFromEmail(email: string): Promise<string> {
  // Use UUID v5 with a custom namespace
  // Namespace: 6ba7b810-9dad-11d1-80b4-00c04fd430c8 (DNS namespace)
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  // Create a hash from the email
  const encoder = new TextEncoder();
  const data = encoder.encode(namespace + email.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert to UUID format (8-4-4-4-12)
  const hex = hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
