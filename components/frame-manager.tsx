'use client'

import React, { useState } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Frame } from '@/lib/types/api'
import {
  Play,
  Pause,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  SkipBack,
  SkipForward
} from 'lucide-react'

interface FrameManagerProps {
  frames: Frame[]
  activeFrameId: string | null
  className?: string
}

export function FrameManager({ frames, activeFrameId, className }: FrameManagerProps) {
  const {
    activeTabId,
    addFrame,
    deleteFrame,
    duplicateFrame,
    setActiveFrame,
    updateProject,
    getFrameThumbnail,
    regenerateFrameThumbnail,
  } = useProjectStore()

  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackFrame, setPlaybackFrame] = useState(0)

  // Animation playback (simplified) - moved before early return
  React.useEffect(() => {
    if (!isPlaying || frames.length <= 1) return

    const interval = setInterval(() => {
      setPlaybackFrame((prev) => (prev + 1) % frames.length)
    }, 500) // 500ms per frame

    return () => clearInterval(interval)
  }, [isPlaying, frames.length])

  if (!activeTabId) {
    return null
  }

  const activeFrameIndex = frames.findIndex(f => f.id === activeFrameId)

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    if (isPlaying) {
      setPlaybackFrame(activeFrameIndex >= 0 ? activeFrameIndex : 0)
    }
  }

  const handleAddFrame = () => {
    addFrame(activeTabId)
  }

  const handleDuplicateFrame = (frameId: string) => {
    // Enhanced debug logging for frame duplication
    const DEBUG_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')
    const debugLog = (category: string, message: string, data?: any) => {
      if (DEBUG_MODE) {
        const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
        console.log(`[${timestamp}] 🎞️  FrameManager [${category}]:`, message, data || '')
      }
    }

    debugLog('DUPLICATE_FRAME_START', `Initiating frame duplication`, {
      frameId,
      activeTabId,
      activeFrameId,
      totalFrames: frames.length
    })

    duplicateFrame(activeTabId, frameId)
    
    debugLog('DUPLICATE_FRAME_COMPLETE', `Frame duplication completed`, {
      frameId,
      newTotalFrames: frames.length + 1
    })
  }

  const handleDeleteFrame = (frameId: string) => {
    if (frames.length > 1) {
      deleteFrame(activeTabId, frameId)
    }
  }

  const handleFrameSelect = (frameId: string) => {
    // Enhanced debug logging for frame switching
    const DEBUG_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')
    const debugLog = (category: string, message: string, data?: any) => {
      if (DEBUG_MODE) {
        const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
        console.log(`[${timestamp}] 🎞️  FrameManager [${category}]:`, message, data || '')
      }
    }

    // EDGE CASE: Validate inputs
    if (!frameId || typeof frameId !== 'string') {
      debugLog('FRAME_SELECT_ERROR', 'Invalid frameId provided', { frameId, type: typeof frameId })
      return
    }

    if (!activeTabId || typeof activeTabId !== 'string') {
      debugLog('FRAME_SELECT_ERROR', 'Invalid activeTabId', { activeTabId, type: typeof activeTabId })
      return
    }

    if (!frames || frames.length === 0) {
      debugLog('FRAME_SELECT_ERROR', 'No frames available', { framesLength: frames?.length || 0 })
      return
    }

    // EDGE CASE: Verify frame exists
    const targetFrame = frames.find(f => f.id === frameId)
    if (!targetFrame) {
      debugLog('FRAME_SELECT_ERROR', 'Target frame not found', { 
        frameId, 
        availableFrames: frames.map(f => f.id),
        totalFrames: frames.length
      })
      return
    }

    const currentActiveFrameId = frames.find(f => f.id === activeFrameId)?.id
    debugLog('FRAME_SELECT_START', `User clicked frame ${frameId}`, {
      currentActiveFrameId,
      targetFrameId: frameId,
      totalFrames: frames.length,
      isPlaying,
      activeTabId
    })

    // Check if we're actually switching frames
    if (currentActiveFrameId === frameId) {
      debugLog('FRAME_SELECT_SAME', 'Selected same frame, no action needed', { frameId })
      return
    }

    // EDGE CASE: Prevent rapid clicking
    if (isPlaying) {
      debugLog('FRAME_SELECT_BLOCKED', 'Frame switching blocked during playback', { frameId })
      return
    }

    debugLog('FRAME_SELECT_EXECUTE', 'Calling setActiveFrame', {
      from: currentActiveFrameId,
      to: frameId
    })

    try {
      setActiveFrame(activeTabId, frameId)
      
      const frameIndex = frames.findIndex(f => f.id === frameId)
      if (frameIndex >= 0) {
        setPlaybackFrame(frameIndex)
        debugLog('FRAME_SELECT_PLAYBACK_UPDATE', 'Updated playback frame index', {
          frameIndex,
          frameId
        })
      } else {
        debugLog('FRAME_SELECT_WARNING', 'Could not find frame index for playback update', {
          frameId,
          availableFrames: frames.map((f, i) => ({ id: f.id, index: i }))
        })
      }

      debugLog('FRAME_SELECT_COMPLETE', 'Frame selection process completed successfully', {
        targetFrameId: frameId
      })
    } catch (error) {
      debugLog('FRAME_SELECT_ERROR', 'Error during frame selection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        frameId,
        activeTabId
      })
    }
  }

  const handleFrameVisibilityToggle = (frameId: string) => {
    const frame = frames.find(f => f.id === frameId)
    if (frame) {
      // Toggle frame inclusion in animation
      // This would update the frame's included property
      console.log('Toggle frame visibility:', frameId)
    }
  }

  const handlePrevFrame = () => {
    if (activeFrameIndex > 0) {
      const prevFrame = frames[activeFrameIndex - 1]
      if (prevFrame) {
        setActiveFrame(activeTabId, prevFrame.id)
      }
    }
  }

  const handleNextFrame = () => {
    if (activeFrameIndex < frames.length - 1) {
      const nextFrame = frames[activeFrameIndex + 1]
      if (nextFrame) {
        setActiveFrame(activeTabId, nextFrame.id)
      }
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Animation Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            disabled={frames.length <= 1}
            className="px-3"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevFrame}
              disabled={activeFrameIndex <= 0}
              className="px-2"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextFrame}
              disabled={activeFrameIndex >= frames.length - 1}
              className="px-2"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            Frame {activeFrameIndex + 1} of {frames.length}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddFrame}
          className="px-3"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Frame
        </Button>
      </div>

      {/* Frame Timeline */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">Timeline</span>
          <span className="text-xs text-gray-500">
            {frames.filter(f => f.included).length} frames in animation
          </span>
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              className={cn(
                'group relative flex-shrink-0 cursor-pointer rounded border-2 p-2 transition-all',
                activeFrameId === frame.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
                isPlaying && playbackFrame === index && 'ring-2 ring-green-400'
              )}
              onClick={() => handleFrameSelect(frame.id)}
            >
              {/* Frame Preview with Thumbnail */}
              <div className="h-12 w-12 rounded bg-gray-100 border border-gray-200 overflow-hidden relative">
                {(() => {
                  let thumbnail = activeTabId ? getFrameThumbnail(activeTabId, frame.id) : null
                  
                  // REAL-TIME SYNC: If no thumbnail exists but we have active frame data, try to regenerate
                  if (!thumbnail && activeTabId && activeFrameId === frame.id) {
                    // For active frame, force thumbnail regeneration if missing
                    setTimeout(() => {
                      regenerateFrameThumbnail(activeTabId, frame.id)
                    }, 0)
                  }
                  
                  if (thumbnail) {
                    return (
                      <img
                        key={`${frame.id}-${thumbnail.length}`} // Force re-render when thumbnail changes
                        src={thumbnail}
                        alt={`Frame ${index + 1}`}
                        className="w-full h-full object-cover"
                        style={{ imageRendering: 'pixelated' }}
                        onError={() => {
                          // If thumbnail fails to load, regenerate it
                          if (activeTabId) {
                            console.log('Thumbnail failed to load, regenerating...')
                            regenerateFrameThumbnail(activeTabId, frame.id)
                          }
                        }}
                      />
                    )
                  } else {
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-gray-500">{index + 1}</span>
                      </div>
                    )
                  }
                })()}
              </div>

              {/* Frame Info */}
              <div className="mt-1 text-center">
                <div className="text-xs text-gray-600">
                  {frame.delayMs}ms
                </div>
              </div>

              {/* Frame Actions */}
              <div className="absolute -top-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0 bg-white hover:bg-green-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFrameVisibilityToggle(frame.id)
                  }}
                  title={frame.included ? 'Hide from animation' : 'Include in animation'}
                >
                  {frame.included ? (
                    <Eye className="h-3 w-3 text-green-600" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-gray-400" />
                  )}
                </Button>
              </div>

              <div className="absolute -bottom-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0 bg-white hover:bg-blue-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDuplicateFrame(frame.id)
                  }}
                  title="Duplicate frame"
                >
                  <Copy className="h-3 w-3 text-blue-600" />
                </Button>

                {frames.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 bg-white hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFrame(frame.id)
                    }}
                    title="Delete frame"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </Button>
                )}
              </div>

              {/* Active Frame Indicator */}
              {activeFrameId === frame.id && (
                <div className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white" />
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Quick Tips */}
      <div className="rounded bg-amber-50 p-2 text-xs text-amber-700">
        💡 <strong>Tip:</strong> Click frames to switch between them, or use the play button to preview your animation
      </div>
    </div>
  )
}