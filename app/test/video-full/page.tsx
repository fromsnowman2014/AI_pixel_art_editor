'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabaseAI, VideoGenerationJob } from '@/lib/services/supabase-ai';
import { FastVideoProcessor } from '@/lib/domain/fast-video-processor';
import { MediaImporter } from '@/lib/services/media-importer';

export default function VideoFullTestPage() {
  const [prompt, setPrompt] = useState('a cute pixel art cat walking in a garden');
  const [width, setWidth] = useState(64);
  const [height, setHeight] = useState(64);
  const [colorCount, setColorCount] = useState(16);
  const [fps, setFps] = useState<12 | 24 | 30>(24);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<VideoGenerationJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<any[]>([]);
  const [processingVideo, setProcessingVideo] = useState(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Subscribe to job updates
  useEffect(() => {
    if (!jobId) return;

    console.log('🔌 Setting up subscription for job:', jobId);

    const unsubscribe = supabaseAI.subscribeToVideoJob(
      jobId,
      (updatedJob) => {
        console.log('📊 Job updated:', updatedJob);
        setJob(updatedJob);

        // When video is ready, process it
        if (
          updatedJob.status === 'processing' &&
          updatedJob.luma_video_url &&
          !processingVideo
        ) {
          processVideo(updatedJob.luma_video_url);
        }
      },
      (err) => {
        console.error('❌ Subscription error:', err);
        setError(err.message);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [jobId]);

  const handleStartGeneration = async () => {
    setLoading(true);
    setError(null);
    setJob(null);
    setJobId(null);
    setFrames([]);

    try {
      const result = await supabaseAI.generateVideo({
        prompt,
        width,
        height,
        colorCount,
        fps
      });

      if (!result.success) {
        setError(result.error?.message || 'Failed to start video generation');
        setLoading(false);
        return;
      }

      console.log('✅ Job created:', result.data);
      setJobId(result.data!.jobId);

      // Fetch initial job state
      const initialJob = await supabaseAI.getVideoJob(result.data!.jobId);
      if (initialJob) {
        setJob(initialJob);
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const processVideo = async (videoUrl: string) => {
    if (processingVideo) return;

    setProcessingVideo(true);
    setError(null);

    try {
      console.log('🎥 Processing video from:', videoUrl);

      const processingOptions = {
        width,
        height,
        colorCount,
        maxFrames: fps === 12 ? 60 : fps === 24 ? 120 : 150 // 5 seconds * fps
      };

      const result = await FastVideoProcessor.processVideoFast(
        videoUrl,
        processingOptions,
        (progress, message) => {
          console.log(`📊 ${progress}%: ${message}`);
        }
      );

      console.log('✅ Video processed:', result.frames.length, 'frames');
      setFrames(result.frames);
      setProcessingVideo(false);
    } catch (err) {
      console.error('❌ Video processing error:', err);
      setError(err instanceof Error ? err.message : 'Video processing failed');
      setProcessingVideo(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'processing':
      case 'dreaming':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'queued':
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'processing':
        return '🔄';
      case 'dreaming':
        return '🎨';
      case 'queued':
        return '⏳';
      case 'pending':
        return '📝';
      default:
        return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Complete Video-to-Frames Flow Test
          </h1>
          <p className="text-gray-600 mb-8">
            Webhook-based async architecture with Realtime updates
          </p>

          {/* Input Form */}
          <div className="space-y-6 mb-8">
            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want..."
                rows={3}
                className="mt-1"
                disabled={loading || !!jobId}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  min={8}
                  max={128}
                  className="mt-1"
                  disabled={loading || !!jobId}
                />
              </div>
              <div>
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min={8}
                  max={128}
                  className="mt-1"
                  disabled={loading || !!jobId}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="colorCount">Color Count</Label>
                <Input
                  id="colorCount"
                  type="number"
                  value={colorCount}
                  onChange={(e) => setColorCount(Number(e.target.value))}
                  min={2}
                  max={64}
                  className="mt-1"
                  disabled={loading || !!jobId}
                />
              </div>
              <div>
                <Label htmlFor="fps">FPS</Label>
                <select
                  id="fps"
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value) as 12 | 24 | 30)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={loading || !!jobId}
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={30}>30</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleStartGeneration}
              disabled={loading || !!jobId}
              className="w-full"
              size="lg"
            >
              {loading ? 'Starting...' : jobId ? 'Job Running...' : 'Start Video Generation'}
            </Button>

            {jobId && (
              <Button
                onClick={() => {
                  setJobId(null);
                  setJob(null);
                  setFrames([]);
                  if (unsubscribeRef.current) {
                    unsubscribeRef.current();
                  }
                }}
                variant="outline"
                className="w-full"
              >
                Reset / Start New Job
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Job Status */}
          {job && (
            <div className={`border rounded-lg p-6 mb-6 ${getStatusColor(job.status)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {getStatusEmoji(job.status)} Job Status: {job.status.toUpperCase()}
                </h3>
                <div className="text-sm font-mono">{job.id}</div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{job.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                {job.progress_message && (
                  <p className="text-sm mt-1">{job.progress_message}</p>
                )}
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Dimensions:</span> {job.width}x{job.height}
                </div>
                <div>
                  <span className="font-semibold">Colors:</span> {job.color_count}
                </div>
                <div>
                  <span className="font-semibold">FPS:</span> {job.fps}
                </div>
                <div>
                  <span className="font-semibold">Duration:</span> {job.duration}s
                </div>
              </div>

              {job.luma_generation_id && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm">
                    <span className="font-semibold">Luma ID:</span>
                    <code className="ml-2 bg-white/50 px-2 py-1 rounded text-xs">
                      {job.luma_generation_id}
                    </code>
                  </div>
                </div>
              )}

              {job.luma_video_url && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm mb-2">
                    <span className="font-semibold">Video URL:</span>
                  </div>
                  <a
                    href={job.luma_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                  >
                    {job.luma_video_url}
                  </a>
                </div>
              )}

              {job.error_message && (
                <div className="mt-4 pt-4 border-t border-red-300">
                  <div className="text-sm">
                    <span className="font-semibold">Error:</span> {job.error_message}
                  </div>
                  {job.error_code && (
                    <div className="text-xs mt-1">Code: {job.error_code}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Video Processing Status */}
          {processingVideo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-blue-800 font-semibold mb-2">
                🔄 Processing Video into Frames...
              </h3>
              <p className="text-blue-700 text-sm">
                Extracting frames and converting to pixel art. This may take a minute...
              </p>
            </div>
          )}

          {/* Frames Display */}
          {frames.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-green-800 font-semibold mb-4">
                ✅ Frames Extracted: {frames.length} frames
              </h3>

              <div className="grid grid-cols-8 gap-2 mb-4">
                {frames.slice(0, 32).map((frameData, index) => {
                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d')!;
                  const imageData = ctx.createImageData(width, height);
                  imageData.data.set(new Uint8ClampedArray(frameData.imageData));
                  ctx.putImageData(imageData, 0, 0);

                  return (
                    <div
                      key={index}
                      className="aspect-square border border-green-300 rounded overflow-hidden bg-white"
                    >
                      <img
                        src={canvas.toDataURL()}
                        alt={`Frame ${index + 1}`}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                  );
                })}
              </div>

              {frames.length > 32 && (
                <p className="text-sm text-green-700">
                  Showing first 32 of {frames.length} frames
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-green-300">
                <p className="text-green-800 font-semibold">🎉 Complete!</p>
                <p className="text-sm text-green-700 mt-1">
                  Video successfully converted to {frames.length} pixel art frames.
                  Ready to add to your project!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Architecture Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-blue-900 font-semibold mb-3">🏗️ Architecture Flow</h2>
          <ol className="space-y-2 text-blue-800 text-sm">
            <li>1️⃣ <strong>Client</strong> calls video-generate Edge Function</li>
            <li>2️⃣ <strong>video-generate</strong> creates DB job, calls Luma API with webhook URL</li>
            <li>3️⃣ <strong>Returns immediately</strong> with jobId (no waiting!)</li>
            <li>4️⃣ <strong>Client subscribes</strong> to job updates via Supabase Realtime</li>
            <li>5️⃣ <strong>Luma processes</strong> video (1-3 minutes) asynchronously</li>
            <li>6️⃣ <strong>Luma calls webhook</strong> when complete</li>
            <li>7️⃣ <strong>video-webhook</strong> updates job status to processing</li>
            <li>8️⃣ <strong>Client receives update</strong> via Realtime, downloads video</li>
            <li>9️⃣ <strong>FastVideoProcessor</strong> extracts frames client-side</li>
            <li>🔟 <strong>MediaImporter</strong> converts to pixel art</li>
          </ol>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <h3 className="text-blue-900 font-semibold mb-2">✨ Key Benefits</h3>
            <ul className="space-y-1 text-blue-700 text-sm">
              <li>• No Edge Function timeouts (immediate return)</li>
              <li>• Real-time progress updates</li>
              <li>• Client-side video processing (reuses existing code)</li>
              <li>• Scalable webhook architecture</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
