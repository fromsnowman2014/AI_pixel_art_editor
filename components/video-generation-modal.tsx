'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { X, Video, Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabaseAI, VideoGenerationJob } from '@/lib/services/supabase-ai'
import { useProjectStore } from '@/lib/stores/project-store'
import { FastVideoProcessor } from '@/lib/domain/fast-video-processor'

interface VideoGenerationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoGenerationModal({ open, onOpenChange }: VideoGenerationModalProps) {
  const [prompt, setPrompt] = useState('')
  const [fps, setFps] = useState<12 | 24 | 30>(24)
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<VideoGenerationJob | null>(null)
  const [processingVideo, setProcessingVideo] = useState(false)

  const { getActiveTab, addFrame, updateCanvasData } = useProjectStore()
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const activeTab = getActiveTab()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  // Subscribe to job updates
  useEffect(() => {
    if (!jobId || !open) return

    console.log('🔌 Setting up subscription for job:', jobId)

    const unsubscribe = supabaseAI.subscribeToVideoJob(
      jobId,
      (updatedJob) => {
        console.log('📊 Job updated:', updatedJob.status, updatedJob.progress)
        setJob(updatedJob)

        // When video is ready, process it
        if (
          updatedJob.status === 'processing' &&
          updatedJob.luma_video_url &&
          !processingVideo
        ) {
          processVideo(updatedJob.luma_video_url)
        }

        // Handle completion
        if (updatedJob.status === 'completed') {
          toast.success(`Video frames ready! ${updatedJob.total_frames || 0} frames extracted`)
        }

        // Handle failure
        if (updatedJob.status === 'failed') {
          toast.error(`Video generation failed: ${updatedJob.error_message || 'Unknown error'}`)
          setIsGenerating(false)
          setProcessingVideo(false)
        }
      },
      (err) => {
        console.error('❌ Subscription error:', err)
        toast.error(`Connection error: ${err.message}`)
      }
    )

    unsubscribeRef.current = unsubscribe

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [jobId, open, processingVideo])

  const processVideo = async (videoUrl: string) => {
    if (processingVideo || !activeTab) return

    setProcessingVideo(true)
    console.log('🎥 Processing video from:', videoUrl)

    try {
      const processingOptions = {
        width: activeTab.project.width,
        height: activeTab.project.height,
        colorCount: activeTab.project.colorLimit,
        maxFrames: fps === 12 ? 60 : fps === 24 ? 120 : 150
      }

      const result = await FastVideoProcessor.processVideoFast(
        videoUrl,
        processingOptions,
        (progress, message) => {
          console.log(`📊 ${progress}%: ${message}`)
        }
      )

      console.log('✅ Video processed:', result.frames.length, 'frames')

      // Add frames to project
      for (const frameData of result.frames) {
        addFrame(activeTab.id)
        const pixelData = {
          data: new Uint8ClampedArray(frameData.imageData),
          width: activeTab.project.width,
          height: activeTab.project.height
        }
        updateCanvasData(activeTab.id, pixelData)
      }

      toast.success(`🎉 ${result.frames.length} frames added to your project!`, { duration: 3000 })

      // Close modal and navigate to main page
      setTimeout(() => {
        handleClose()
        window.location.href = '/'
      }, 2000)

    } catch (err) {
      console.error('❌ Video processing error:', err)
      toast.error('Failed to process video')
    } finally {
      setProcessingVideo(false)
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (!activeTab) {
      toast.error('No active project')
      return
    }

    setIsGenerating(true)
    toast.loading('Creating AI animation...', { id: 'video-generation' })

    try {
      console.log('🎬 Starting async video generation...')

      const response = await supabaseAI.generateVideo({
        prompt: prompt.trim(),
        width: activeTab.project.width,
        height: activeTab.project.height,
        colorCount: activeTab.project.colorLimit,
        fps: fps,
        projectId: activeTab.id
      })

      console.log('📦 Response received:', response)

      if (!response.success || !response.data) {
        // Check for authentication error
        if (response.error?.code === 'NOT_AUTHENTICATED') {
          toast.dismiss('video-generation')
          const message = (
            <div className="flex flex-col gap-2">
              <span className="font-medium">Sign in required</span>
              <button
                onClick={() => window.location.href = '/auth/signin'}
                className="px-3 py-1.5 bg-white text-purple-600 rounded-md text-sm font-medium hover:bg-purple-50 transition-colors"
              >
                Go to Sign In
              </button>
            </div>
          )
          toast.error(message, { duration: 5000 })
          setIsGenerating(false)
          return
        }

        toast.dismiss('video-generation')
        console.error('❌ Error response:', response.error)
        throw new Error(response.error?.message || 'Video generation failed')
      }

      toast.dismiss('video-generation')
      setJobId(response.data.jobId)

      const initialJob = await supabaseAI.getVideoJob(response.data.jobId)
      if (initialJob) {
        setJob(initialJob)
      }

      toast.success('Video generation started! Processing in background...')

    } catch (error) {
      toast.dismiss('video-generation')
      console.error('❌ Video generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start video generation')
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }
    setPrompt('')
    setJobId(null)
    setJob(null)
    setIsGenerating(false)
    setProcessingVideo(false)
    onOpenChange(false)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent closing modal when generating or processing
    if (isGenerating || processingVideo) return
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!open) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      case 'processing':
      case 'dreaming': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'queued':
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed': return <XCircle className="h-5 w-5 text-red-600" />
      default: return <Loader2 className="h-5 w-5 animate-spin" />
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className={cn(
        "relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200",
        (isGenerating || processingVideo) && "pointer-events-auto opacity-100"
      )}>
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI Video to Frames</h2>
                <p className="text-sm text-gray-500">Generate animated pixel art</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
              disabled={isGenerating || processingVideo}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!jobId && (
            <>
              <div className="space-y-2">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                  Animation Prompt
                </label>
                <Input
                  id="prompt"
                  placeholder="a cute cat walking, a knight swinging sword..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="fps" className="block text-sm font-medium text-gray-700">
                  Frame Rate (FPS)
                </label>
                <select
                  id="fps"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value) as 12 | 24 | 30)}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value={12}>12 FPS - Retro</option>
                  <option value={24}>24 FPS - Smooth</option>
                  <option value={30}>30 FPS - Very Smooth</option>
                </select>
              </div>

              <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 text-purple-600" />
                  <div className="text-xs text-purple-900">
                    <p className="font-medium">How it works:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>AI generates 5-second video</li>
                      <li>Extract {fps} frames</li>
                      <li>Convert to pixel art</li>
                    </ul>
                    <p className="font-medium mt-2">⏱️ ~2-4 minutes</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {job && (
            <div className={cn("border rounded-lg p-4 space-y-3", getStatusColor(job.status))}>
              <div className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                <h3 className="font-semibold text-sm">Status: {job.status.toUpperCase()}</h3>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{job.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                {job.progress_message && <p className="text-xs mt-1">{job.progress_message}</p>}
              </div>

              {processingVideo && (
                <div className="flex items-center gap-2 text-xs bg-white/50 p-2 rounded">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Extracting frames...</span>
                </div>
              )}

              {job.error_message && (
                <div className="bg-red-100 border border-red-300 rounded p-2 text-xs text-red-800">
                  {job.error_message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-end gap-2">
            {!jobId ? (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={handleClose} disabled={processingVideo}>
                {job?.status === 'completed' || job?.status === 'failed' ? 'Close' : 'Background Processing'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
