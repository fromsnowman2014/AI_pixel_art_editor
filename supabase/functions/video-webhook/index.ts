import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * video-webhook Edge Function
 *
 * This function receives callbacks from Luma API when video generation completes.
 * It then:
 * 1. Downloads the video from Luma
 * 2. Processes video into frames (extracts frames as base64)
 * 3. Updates job status with frame data
 * 4. Triggers Realtime update for client
 */

interface LumaWebhookPayload {
  id: string;
  state: 'queued' | 'dreaming' | 'completed' | 'failed';
  failure_reason?: string;
  assets?: {
    video?: string;
  };
  request?: {
    prompt?: string;
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    console.log(`🎬 [${requestId}] Webhook received from Luma`);

    // Get job_id from query params
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');

    if (!jobId) {
      console.error(`❌ [${requestId}] Missing job_id in query params`);
      return new Response(
        JSON.stringify({ error: 'Missing job_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 [${requestId}] Job ID: ${jobId}`);

    // Parse webhook payload
    let webhookData: LumaWebhookPayload;
    try {
      webhookData = await req.json();
    } catch (error) {
      console.error(`❌ [${requestId}] Invalid JSON payload:`, error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 [${requestId}] Webhook state: ${webhookData.state}`);

    // Initialize Supabase with service role (bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get job from database
    const { data: job, error: jobError } = await supabase
      .from('video_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error(`❌ [${requestId}] Job not found:`, jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [${requestId}] Job found: ${job.id}`);

    // Handle different webhook states
    if (webhookData.state === 'queued' || webhookData.state === 'dreaming') {
      // Update progress
      await supabase
        .from('video_generation_jobs')
        .update({
          status: webhookData.state,
          progress: webhookData.state === 'queued' ? 10 : 50,
          progress_message: webhookData.state === 'queued'
            ? 'Video generation queued...'
            : 'AI is dreaming your video...',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.log(`📊 [${requestId}] Progress updated: ${webhookData.state}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Progress updated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (webhookData.state === 'failed') {
      // Update job as failed
      await supabase
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_code: 'LUMA_GENERATION_FAILED',
          error_message: webhookData.failure_reason || 'Video generation failed',
          error_details: webhookData,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.error(`❌ [${requestId}] Luma generation failed:`, webhookData.failure_reason);

      return new Response(
        JSON.stringify({ success: true, message: 'Job marked as failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (webhookData.state === 'completed') {
      const lumaProcessingStartTime = Date.now();

      // Get video URL
      const videoUrl = webhookData.assets?.video;
      if (!videoUrl) {
        console.error(`❌ [${requestId}] No video URL in webhook data`);

        await supabase
          .from('video_generation_jobs')
          .update({
            status: 'failed',
            error_code: 'NO_VIDEO_URL',
            error_message: 'Video URL not provided by Luma',
            error_details: webhookData,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        return new Response(
          JSON.stringify({ error: 'No video URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`🎥 [${requestId}] Video URL: ${videoUrl}`);

      // Update job with video URL and processing status
      await supabase
        .from('video_generation_jobs')
        .update({
          luma_video_url: videoUrl,
          status: 'processing',
          progress: 70,
          progress_message: 'Video completed! Processing frames...',
          luma_processing_time_ms: Date.now() - lumaProcessingStartTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.log(`🔄 [${requestId}] Status updated to processing`);

      // NOTE: Frame extraction happens CLIENT-SIDE
      // The client will:
      // 1. Subscribe to job updates via Realtime
      // 2. When status becomes 'processing', download video from luma_video_url
      // 3. Use FastVideoProcessor to extract frames
      // 4. Use MediaImporter to convert to pixel art
      // 5. Add frames to current project
      // 6. Mark job as completed

      // For now, just mark as processing and let client handle the rest
      const totalTime = Date.now() - startTime;

      console.log(`✅ [${requestId}] Webhook processed successfully in ${totalTime}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Video ready for client-side processing',
          jobId: job.id,
          videoUrl: videoUrl
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown state
    console.warn(`⚠️ [${requestId}] Unknown webhook state: ${webhookData.state}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Unknown state, no action taken' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Webhook processing failed:`, error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        processingTimeMs: totalTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
