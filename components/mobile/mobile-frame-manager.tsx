'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Frame } from '@/lib/types/api'
import {
  Play,
  Square,
  Plus,
  Copy,
  Trash2,
  SkipBack,
  SkipForward,
  RotateCcw
} from 'lucide-react'

interface MobileFrameManagerProps {
  frames: Frame[]
  activeFrameId: string | null
  className?: string
}

export function MobileFrameManager({ frames, activeFrameId, className }: MobileFrameManagerProps) {
  const {
    activeTabId,
    addFrame,
    deleteFrame,
    duplicateFrame,
    setActiveFrame,
    getFrameThumbnail,
    startPlayback,
    stopPlayback,
    togglePlayback,
    setPlaybackFrame,
    resetPlaybackToStart,
    getActiveTab,
  } = useProjectStore()

  const activeTab = getActiveTab()
  const isPlaying = activeTab?.isPlaying || false
  const playbackFrameIndex = activeTab?.playbackFrameIndex || 0
  
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const activeFrameIndex = frames.findIndex(f => f.id === activeFrameId)

  const handlePlayPause = (e: React.MouseEvent): void => {
    e.stopPropagation()
    
    if (!activeTabId || frames.length <= 1) {
      return
    }

    if (isPlaying) {
      stopPlayback(activeTabId)
    } else {
      startPlayback(activeTabId)
    }
  }

  const handleStop = (e: React.MouseEvent): void => {
    e.stopPropagation()
    
    if (!activeTabId || !isPlaying) return
    
    stopPlayback(activeTabId)
    setPlaybackFrame(activeTabId, 0)
    
    if (frames.length > 0 && frames[0]) {
      setActiveFrame(activeTabId, frames[0].id)
    }
  }

  const handleFrameSelect = (frameId: string) => {
    if (!frameId || !activeTabId || !frames?.length) {
      return
    }

    const targetFrame = frames.find(f => f.id === frameId)
    if (!targetFrame || activeFrameId === frameId) {
      return
    }

    if (!isPlaying) {
      setActiveFrame(activeTabId, frameId)
    }
    
    const frameIndex = frames.findIndex(f => f.id === frameId)
    if (frameIndex >= 0) {
      setPlaybackFrame(activeTabId, frameIndex)
    }
  }

  const handleNextFrame = (e?: React.MouseEvent): void => {
    e?.stopPropagation()
    if (!activeTabId) return
    
    if (isPlaying) {
      const nextIndex = (playbackFrameIndex + 1) % frames.length
      setPlaybackFrame(activeTabId, nextIndex)
    } else {
      if (activeFrameIndex < frames.length - 1) {
        const nextFrame = frames[activeFrameIndex + 1]
        if (nextFrame) {
          setActiveFrame(activeTabId, nextFrame.id)
        }
      }
    }
  }

  const handlePrevFrame = (e?: React.MouseEvent): void => {
    e?.stopPropagation()
    if (!activeTabId) return
    
    if (isPlaying) {
      const prevIndex = Math.max(playbackFrameIndex - 1, 0)
      setPlaybackFrame(activeTabId, prevIndex)
    } else {
      if (activeFrameIndex > 0) {
        const prevFrame = frames[activeFrameIndex - 1]
        if (prevFrame) {
          setActiveFrame(activeTabId, prevFrame.id)
        }
      }
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Compact Animation Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Play/Stop button */}
          <Button
            variant={isPlaying ? 'secondary' : 'default'}
            size="sm"
            onClick={isPlaying ? handleStop : handlePlayPause}
            disabled={frames.length <= 1}
            className={cn(
              "px-3 min-h-[44px]",
              isPlaying && "bg-green-100 border-green-300 text-green-700"
            )}
          >
            {isPlaying ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Play
              </>
            )}
          </Button>

          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevFrame}
            disabled={activeFrameIndex <= 0}
            className="min-h-[44px] min-w-[44px] p-2"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextFrame}
            disabled={activeFrameIndex >= frames.length - 1}
            className="min-h-[44px] min-w-[44px] p-2"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (activeTabId) {
                resetPlaybackToStart(activeTabId)
              }
            }}
            disabled={frames.length <= 1 || playbackFrameIndex === 0}
            className="min-h-[44px] min-w-[44px] p-2"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => activeTabId && addFrame(activeTabId)}
          className="min-h-[44px] px-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Frame Timeline - Horizontal scroll optimized for mobile */}
      <div 
        ref={timelineScrollRef}
        className="overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex space-x-2 min-w-max pb-1">
          {frames.map((frame, index) => {
            const thumbnail = activeTabId ? getFrameThumbnail(activeTabId, frame.id) : null
            
            return (
              <div
                key={frame.id}
                className={cn(
                  'group relative flex-shrink-0 cursor-pointer rounded border-2 p-2 transition-all',
                  activeFrameId === frame.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white',
                  isPlaying && playbackFrameIndex === index && 'ring-2 ring-green-400 scale-105 shadow-lg bg-green-50 border-green-400'
                )}
                onClick={() => handleFrameSelect(frame.id)}
              >
                {/* Frame Preview - Larger for mobile */}
                <div className="h-14 w-14 rounded bg-gray-100 border border-gray-200 overflow-hidden relative">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={`Frame ${index + 1}`}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-sm text-gray-500">{index + 1}</span>
                    </div>
                  )}
                </div>

                {/* Frame Info */}
                <div className="mt-1 text-center">
                  <div className="text-xs text-gray-600">
                    {frame.delayMs}ms
                  </div>
                </div>

                {/* Frame Actions - Show on hover/active */}
                <div className="absolute -top-1 -right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 bg-white hover:bg-blue-50 border-gray-300"
                    onClick={(e) => {
                      e.stopPropagation()
                      activeTabId && duplicateFrame(activeTabId, frame.id)
                    }}
                  >
                    <Copy className="h-3 w-3 text-blue-600" />
                  </Button>

                  {frames.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0 bg-white hover:bg-red-50 border-gray-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        activeTabId && deleteFrame(activeTabId, frame.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  )}
                </div>

                {/* Active Frame Indicator */}
                {activeFrameId === frame.id && (
                  <div className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-blue-500 border-2 border-white" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Status */}
      <div className="text-center">
        <div className="text-sm text-gray-600">
          {isPlaying ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Playing: Frame {playbackFrameIndex + 1} of {frames.length}
            </span>
          ) : (
            <span>Frame {activeFrameIndex + 1} of {frames.length}</span>
          )}
        </div>
      </div>
    </div>
  )
}