// Using fetch directly instead of Supabase client to avoid dependency issues

import { Frame } from '@/lib/types/api';

export interface SupabaseAIGenerateRequest {
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

export interface SupabaseAIGenerateResponse {
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

// Video generation interfaces (NEW: Webhook-based async)
export interface SupabaseVideoGenerateRequest {
  prompt: string;
  width: number;  // Target pixel art dimensions
  height: number;
  colorCount: number;
  fps?: 12 | 24 | 30;
  projectId?: string;
}

export interface SupabaseVideoGenerateResponse {
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

// Video job status types
export type VideoJobStatus =
  | 'pending'
  | 'queued'
  | 'dreaming'
  | 'processing'
  | 'completed'
  | 'failed';

export interface VideoGenerationJob {
  id: string;
  user_id: string;
  project_id: string | null;
  prompt: string;
  width: number;
  height: number;
  color_count: number;
  fps: number;
  duration: number;
  luma_generation_id: string | null;
  luma_video_url: string | null;
  status: VideoJobStatus;
  progress: number;
  progress_message: string | null;
  error_code: string | null;
  error_message: string | null;
  error_details: any;
  total_frames: number | null;
  frame_storage_urls: string[] | null;
  frame_data: any;
  processing_time_ms: number | null;
  luma_processing_time_ms: number | null;
  frame_processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

class SupabaseAIService {
  private supabaseUrl: string = '';
  private supabaseKey: string = '';
  private initialized: boolean = false;

  private initialize() {
    if (this.initialized) return;

    // Only use NEXT_PUBLIC_ prefixed variables for client-side access
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.initialized = true;
  }

  /**
   * Generate AI image using Supabase Edge Function
   */
  async generateImage(params: SupabaseAIGenerateRequest): Promise<SupabaseAIGenerateResponse> {
    this.initialize();
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      console.log(`🚀 [${requestId}] Calling Supabase Edge Function for AI generation`);
      console.log(`📝 [${requestId}] Request params:`, {
        prompt: params.prompt.substring(0, 50) + '...',
        dimensions: `${params.width}x${params.height}`,
        mode: params.mode || 'text-to-image',
        colorCount: params.colorCount
      });

      // Call the Supabase Edge Function using fetch
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/ai-generate`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey
        },
        body: JSON.stringify(params)
      });

      const totalTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${requestId}] Supabase Edge Function error:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });

        return {
          success: false,
          error: {
            message: `Edge Function call failed: ${response.statusText}`,
            code: 'EDGE_FUNCTION_ERROR',
            details: {
              requestId,
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              processingTimeMs: totalTime
            }
          }
        };
      }

      const data = await response.json();

      if (!data) {
        console.error(`❌ [${requestId}] No data returned from Edge Function`);
        return {
          success: false,
          error: {
            message: 'No data returned from AI service',
            code: 'NO_DATA_RETURNED',
            details: { requestId, processingTimeMs: totalTime }
          }
        };
      }

      // Edge Function returns the response directly
      const aiResponse = data as SupabaseAIGenerateResponse;

      if (!aiResponse.success) {
        console.error(`❌ [${requestId}] Edge Function returned error:`, aiResponse.error);
        return aiResponse;
      }

      console.log(`✅ [${requestId}] AI generation successful in ${totalTime}ms`);
      console.log(`🎨 [${requestId}] Generated image:`, {
        dimensions: aiResponse.data ? `${aiResponse.data.width}x${aiResponse.data.height}` : 'unknown',
        colorCount: aiResponse.data?.colorCount,
        processingTime: aiResponse.data?.processingTimeMs
      });

      return aiResponse;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Supabase AI service error:`, error);

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'SERVICE_ERROR',
          details: {
            requestId,
            processingTimeMs: totalTime,
            originalError: error
          }
        }
      };
    }
  }

  /**
   * Start async video generation job (NEW: Webhook-based)
   * Returns immediately with jobId - client must subscribe to updates
   */
  async generateVideo(params: SupabaseVideoGenerateRequest): Promise<SupabaseVideoGenerateResponse> {
    this.initialize();
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      console.log(`🎬 [${requestId}] Starting async video generation job`);
      console.log(`📝 [${requestId}] Request params:`, {
        prompt: params.prompt.substring(0, 50) + '...',
        dimensions: `${params.width}x${params.height}`,
        fps: params.fps || 24,
        colorCount: params.colorCount
      });

      // Get authentication - Use NextAuth session
      let userEmail: string | null = null;
      let userId: string | null = null;

      try {
        const { getSession } = await import('next-auth/react');
        const nextAuthSession = await getSession();

        console.log(`🔑 [${requestId}] NextAuth session check:`, {
          hasSession: !!nextAuthSession,
          hasUser: !!nextAuthSession?.user,
          userEmail: nextAuthSession?.user?.email
        });

        if (nextAuthSession?.user) {
          userEmail = nextAuthSession.user.email || null;
          // @ts-ignore - Custom property added in auth config
          userId = nextAuthSession.user.id || null;
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Auth check error:`, error);
      }

      // Additional debugging
      if (!userEmail) {
        console.log(`🔍 [${requestId}] Debugging - localStorage keys:`, Object.keys(localStorage));
        const authKeys = Object.keys(localStorage).filter(key =>
          key.includes('supabase') || key.includes('auth') || key.includes('nextauth')
        );
        console.log(`🔍 [${requestId}] Auth-related keys:`, authKeys);

        console.error(`❌ [${requestId}] No valid session found`);
        return {
          success: false,
          error: {
            message: 'Not authenticated. Please sign in.',
            code: 'NOT_AUTHENTICATED'
          }
        };
      }

      console.log(`✅ [${requestId}] Using NextAuth user: ${userEmail}`);

      // Call video-generate Edge Function (NEW endpoint)
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/video-generate`;

      console.log(`🚀 [${requestId}] Calling Edge Function:`, {
        url: edgeFunctionUrl,
        headers: {
          'x-user-email': userEmail,
          'x-user-id': userId || 'nextauth-user'
        },
        params: {
          prompt: params.prompt.substring(0, 50) + '...',
          dimensions: `${params.width}x${params.height}`
        }
      });

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
          // Send NextAuth user info as custom headers
          'x-user-email': userEmail,
          'x-user-id': userId || 'nextauth-user'
        },
        body: JSON.stringify(params)
      });

      const totalTime = Date.now() - startTime;

      console.log(`📡 [${requestId}] Edge Function response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${requestId}] Edge Function error:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          errorPreview: errorText.substring(0, 200)
        });

        return {
          success: false,
          error: {
            message: `Video generation job creation failed: ${response.statusText}`,
            code: 'JOB_CREATION_ERROR',
            details: {
              requestId,
              status: response.status,
              error: errorText,
              processingTimeMs: totalTime
            }
          }
        };
      }

      const result = await response.json();

      if (!result.success) {
        console.error(`❌ [${requestId}] Job creation failed:`, result.error);
        return result;
      }

      console.log(`✅ [${requestId}] Video job created:`, result.data.jobId);
      console.log(`⏱️  [${requestId}] Estimated completion: ${result.data.estimatedTimeSeconds}s`);

      return result;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Video generation error:`, error);

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'VIDEO_GENERATION_ERROR',
          details: {
            requestId,
            processingTimeMs: totalTime,
            originalError: error
          }
        }
      };
    }
  }

  /**
   * Subscribe to video generation job updates
   * Returns unsubscribe function
   */
  subscribeToVideoJob(
    jobId: string,
    onUpdate: (job: VideoGenerationJob) => void,
    onError?: (error: Error) => void
  ): () => void {
    this.initialize();

    console.log(`📡 Subscribing to video job updates: ${jobId}`);

    // Use singleton Supabase client
    import('@/lib/supabase/client').then(({ supabase }) => {

      const channel = supabase
        .channel(`video-job-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'video_generation_jobs',
            filter: `id=eq.${jobId}`
          },
          (payload) => {
            console.log(`📊 Job update received:`, payload.new);
            onUpdate(payload.new as VideoGenerationJob);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to job updates: ${jobId}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Channel error for job: ${jobId}`);
            onError?.(new Error('Realtime subscription error'));
          }
        });

      // Return cleanup function
      return () => {
        console.log(`🔌 Unsubscribing from job: ${jobId}`);
        supabase.removeChannel(channel);
      };
    }).catch((error) => {
      console.error('Failed to create Supabase client:', error);
      onError?.(error);
    });

    // Return no-op for immediate return
    return () => {};
  }

  /**
   * Get job status
   */
  async getVideoJob(jobId: string): Promise<VideoGenerationJob | null> {
    this.initialize();

    try {
      const { supabase } = await import('@/lib/supabase/client');

      const { data, error } = await supabase
        .from('video_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Failed to fetch job:', error);
        return null;
      }

      return data as VideoGenerationJob;
    } catch (error) {
      console.error('Failed to get video job:', error);
      return null;
    }
  }

  /**
   * Check if AI service is available
   */
  async healthCheck(): Promise<{ available: boolean; error?: string }> {
    this.initialize();
    try {
      // Simple test call to check if the Edge Function is responsive
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/ai-generate`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey
        },
        body: JSON.stringify({
          prompt: 'test',
          width: 16,
          height: 16,
          colorCount: 4
        })
      });

      // If we get any response (even an error), the service is available
      return { available: true };

    } catch (error) {
      console.error('Supabase AI health check failed:', error);
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get service configuration info
   */
  getServiceInfo() {
    return {
      provider: 'Supabase Edge Functions',
      endpoint: 'ai-generate',
      features: [
        'Text-to-image generation',
        'Image-to-image editing',
        'Pixel art optimization',
        'Color quantization',
        'CORS support'
      ]
    };
  }
}

// Singleton instance
export const supabaseAI = new SupabaseAIService();

// Export for backward compatibility
export default supabaseAI;