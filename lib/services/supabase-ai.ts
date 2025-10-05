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

// Video generation interfaces
export interface SupabaseVideoGenerateRequest {
  prompt: string;
  width: number;  // Target pixel art dimensions
  height: number;
  colorCount: number;
  fps?: 12 | 24 | 30;
}

export interface SupabaseVideoGenerateResponse {
  success: boolean;
  data?: {
    frames: Array<{
      frame: Frame;
      imageData: number[];
    }>;
    totalFrames: number;
    fps: number;
    processingTimeMs: number;
    prompt: string;
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
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
   * Generate AI video and convert to pixel art frames
   * Reuses existing FastVideoProcessor infrastructure
   */
  async generateVideo(params: SupabaseVideoGenerateRequest): Promise<SupabaseVideoGenerateResponse> {
    this.initialize();
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      console.log(`🎬 [${requestId}] Starting video-to-frames generation`);
      console.log(`📝 [${requestId}] Request params:`, {
        prompt: params.prompt.substring(0, 50) + '...',
        dimensions: `${params.width}x${params.height}`,
        fps: params.fps || 24,
        colorCount: params.colorCount
      });

      // Step 1: Call Edge Function to generate video
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/ai-generate-video`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey
        },
        body: JSON.stringify({
          ...params,
          duration: 1.0 // MVP: Always 1 second (backend will enforce this)
        })
      });

      const totalTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${requestId}] Edge Function error:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });

        return {
          success: false,
          error: {
            message: `Video generation failed: ${response.statusText}`,
            code: 'VIDEO_GENERATION_ERROR',
            details: {
              requestId,
              status: response.status,
              error: errorText,
              processingTimeMs: totalTime
            }
          }
        };
      }

      const videoData = await response.json();

      if (!videoData.success || !videoData.data) {
        console.error(`❌ [${requestId}] No video data returned`);
        return {
          success: false,
          error: {
            message: videoData.error?.message || 'No video data returned',
            code: videoData.error?.code || 'NO_VIDEO_DATA',
            details: { requestId, processingTimeMs: totalTime }
          }
        };
      }

      console.log(`✅ [${requestId}] Video generated:`, videoData.data.videoUrl);

      // Step 2: Download video and process with FastVideoProcessor
      // This is where the magic happens - reusing existing infrastructure!

      const { FastVideoProcessor } = await import('@/lib/domain/fast-video-processor');

      const processingOptions = {
        width: params.width,
        height: params.height,
        colorCount: params.colorCount,
        maxFrames: params.fps === 12 ? 12 : params.fps === 24 ? 24 : 30
      };

      console.log(`🔄 [${requestId}] Processing video with FastVideoProcessor...`);

      // Use existing video processor (already handles pixel art conversion!)
      const importResult = await FastVideoProcessor.processVideoFast(
        videoData.data.videoUrl,
        processingOptions,
        (progress: number, message: string) => {
          console.log(`📊 [${requestId}] ${progress}%: ${message}`);
        }
      );

      const finalTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] Extracted ${importResult.frames.length} pixel art frames in ${finalTime}ms`);

      // Step 3: Return processed frames (already in pixel art format!)
      return {
        success: true,
        data: {
          frames: importResult.frames, // Already pixel art!
          totalFrames: importResult.frames.length,
          fps: params.fps || 24,
          processingTimeMs: finalTime,
          prompt: params.prompt
        }
      };

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