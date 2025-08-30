'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Frame } from '@/lib/types/api'
import {
  Play,
  Pause,
  Square,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  SkipBack,
  SkipForward,
  Gauge,
  RotateCcw
} from 'lucide-react'
import { createComponentLogger } from '@/lib/ui/smart-logger'
import { PlaybackDebugger } from '@/lib/ui/playback-debugger'
import { useMobileLayout, isTouchDevice } from '@/lib/utils/mobile-layout'

interface FrameManagerProps {
  frames: Frame[]
  activeFrameId: string | null
  className?: string
  layout?: import('@/lib/ui/responsive-layout-manager').LayoutConfiguration
}

export function FrameManager({ frames, activeFrameId, className, layout }: FrameManagerProps) {
  const {
    activeTabId,
    addFrame,
    deleteFrame,
    duplicateFrame,
    setActiveFrame,
    updateProject,
    getFrameThumbnail,
    regenerateFrameThumbnail,
    startPlayback,
    stopPlayback,
    togglePlayback,
    setPlaybackFrame,
    setPlaybackSpeed,
    resetPlaybackToStart,
    getActiveTab,
  } = useProjectStore()

  const { deviceInfo, optimalLayout } = useMobileLayout()
  const isTouch = isTouchDevice()

  // Get enhanced playback state from store
  const activeTab = getActiveTab()
  const isPlaying = activeTab?.isPlaying || false
  const playbackFrameIndex = activeTab?.playbackFrameIndex || 0
  const playbackFrameId = activeTab?.playbackFrameId
  const playbackSpeed = activeTab?.playbackSpeed || 1.0
  
  const logger = createComponentLogger('FrameManager')
  
  // Focus management for keyboard navigation
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const frameRefs = useRef<(HTMLDivElement | null)[]>([])
  const [isFocused, setIsFocused] = useState(false)
  
  // intervalRef - DEPRECATED: Removed in favor of RAF-based system

  // Enhanced keyboard navigation with safety checks
  const handleKeyboardNavigation = useCallback((e: KeyboardEvent) => {
    // Only handle keyboard events when timeline is focused
    if (!isFocused || !activeTabId || !frames.length) {
      return
    }

    // Prevent default behavior for navigation keys
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
    }

    // Handle navigation based on current state
    try {
      switch (e.key) {
        case 'ArrowLeft':
          logger.debug(() => 'Keyboard navigation: Previous frame', { 
            currentFrame: activeFrameId, 
            isPlaying, 
            totalFrames: frames.length 
          })
          if (frames.findIndex(f => f.id === activeFrameId) > 0) {
            const currentIndex = frames.findIndex(f => f.id === activeFrameId)
            const prevFrame = frames[currentIndex - 1]
            if (prevFrame && prevFrame.id !== activeFrameId) {
              setActiveFrame(activeTabId, prevFrame.id)
            }
          }
          break

        case 'ArrowRight':
          logger.debug(() => 'Keyboard navigation: Next frame', { 
            currentFrame: activeFrameId, 
            isPlaying, 
            totalFrames: frames.length 
          })
          if (frames.findIndex(f => f.id === activeFrameId) < frames.length - 1) {
            const currentIndex = frames.findIndex(f => f.id === activeFrameId)
            const nextFrame = frames[currentIndex + 1]
            if (nextFrame && nextFrame.id !== activeFrameId) {
              setActiveFrame(activeTabId, nextFrame.id)
            }
          }
          break

        case ' ':
        case 'Space':
          // Space bar for play/pause
          if (frames.length > 1) {
            e.preventDefault()
            togglePlayback(activeTabId)
          }
          break

        case 'Home':
          // Go to first frame
          if (frames.length > 0) {
            e.preventDefault()
            const firstFrame = frames[0]
            if (firstFrame && firstFrame.id !== activeFrameId) {
              setActiveFrame(activeTabId, firstFrame.id)
            }
          }
          break

        case 'End':
          // Go to last frame
          if (frames.length > 0) {
            e.preventDefault()
            const lastFrame = frames[frames.length - 1]
            if (lastFrame && lastFrame.id !== activeFrameId) {
              setActiveFrame(activeTabId, lastFrame.id)
            }
          }
          break
      }
    } catch (error) {
      logger.error('Keyboard navigation error', { key: e.key, activeFrameId }, error)
    }
  }, [isFocused, activeTabId, frames, activeFrameId, isPlaying, logger, setActiveFrame, togglePlayback])

  // Set up keyboard event listeners
  useEffect(() => {
    if (isFocused) {
      document.addEventListener('keydown', handleKeyboardNavigation)
      // Keyboard listeners attached
    }

    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation)
      // Keyboard listeners removed
    }
  }, [handleKeyboardNavigation, isFocused, frames.length, logger])

  // Handle focus events for timeline
  const handleTimelineFocus = useCallback(() => {
    setIsFocused(true)
    // Timeline focused
  }, [logger])

  const handleTimelineBlur = useCallback(() => {
    setIsFocused(false)
    // Timeline blurred
  }, [logger])

  // Handle clicks on timeline to set focus
  const handleTimelineClick = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.focus()
      setIsFocused(true)
    }
  }, [])

  // Clean up intervals ONLY on component unmount (not on every re-render)
  React.useEffect(() => {
    // Capture current values at effect creation time
    const capturedActiveTabId = activeTabId
    
    return () => {
      // 🚨 PROBLEM WAS HERE: This was running on every dependency change!
      // Only cleanup on actual component unmount
      // Component cleanup
      if (capturedActiveTabId) {
        const currentState = useProjectStore.getState()
        const currentTab = currentState.tabs.find(t => t.id === capturedActiveTabId)
        if (currentTab?.isPlaying && currentTab?.playbackIntervalId) {
          // Stop playback on unmount
          stopPlayback(capturedActiveTabId)
        }
      }
    }
  }, []) // 🚨 CRITICAL: Empty dependency array to only run on unmount!

  // Early return after all hooks are defined
  const activeFrameIndex = frames.findIndex(f => f.id === activeFrameId)

  // Simple interval-based auto-advance - DEPRECATED: Removed in favor of RAF-based system
  
  // stopSimpleAutoPlay - DEPRECATED: Removed in favor of RAF-based system

  // User interaction detection for auto-stop
  const handleUserInteraction = useCallback((e: Event) => {
    if (activeTabId && isPlaying) {
      // Check if click is outside frame manager area
      const target = e.target as HTMLElement
      const frameManagerArea = target.closest('[data-frame-manager]')
      
      if (!frameManagerArea) {
        // Click is outside frame manager, stop playback
        stopPlayback(activeTabId)
        logger.debug(() => 'Playback stopped due to user interaction outside frame manager', {
          eventType: e.type,
          target: target.tagName
        })
      }
    }
  }, [activeTabId, isPlaying, stopPlayback, logger])

  // Auto-scroll timeline to active frame
  const scrollToFrame = useCallback((frameIndex: number) => {
    const frameElement = frameRefs.current[frameIndex]
    if (frameElement && timelineScrollRef.current) {
      frameElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [])

  // Set up global event listeners for user interaction
  useEffect(() => {
    if (isPlaying) {
      document.addEventListener('click', handleUserInteraction)
      document.addEventListener('keydown', handleUserInteraction)
      
      return () => {
        document.removeEventListener('click', handleUserInteraction)
        document.removeEventListener('keydown', handleUserInteraction)
      }
    }
    
    // Return empty cleanup function when not playing
    return () => {}
  }, [isPlaying, handleUserInteraction])

  // Auto-scroll to active frame when it changes
  useEffect(() => {
    if (isPlaying && playbackFrameIndex >= 0) {
      scrollToFrame(playbackFrameIndex)
    }
  }, [isPlaying, playbackFrameIndex, scrollToFrame])

  // Early return after all hooks are defined
  if (!activeTabId) {
    return null
  }

  const handlePlayPause = (e: React.MouseEvent): void => {
    // handlePlayPause START
    
    // 🚨 CRITICAL: Stop event bubbling to prevent handleGlobalClick from stopping playback
    e.stopPropagation()
    // Event propagation stopped
    
    try {
      // 🔍 디버깅: Play 버튼 클릭 추적
      PlaybackDebugger.log('PLAY_BUTTON_CLICKED', {
        activeTabId,
        framesLength: frames.length,
        isCurrentlyPlaying: isPlaying,
        playbackFrameIndex,
        playbackFrameId,
        hasActiveTab: !!activeTab
      }, activeTabId)
      
      // PlaybackDebugger logged
    
      // Check activeTabId
      if (!activeTabId) {
        // No activeTabId - RETURN
        PlaybackDebugger.log('ERROR_OCCURRED', 'No active tab ID', activeTabId)
        return
      }
      // activeTabId check passed
      
      // Check frames.length
      if (frames.length <= 1) {
        // Not enough frames - RETURN
        PlaybackDebugger.log('ERROR_OCCURRED', 'Not enough frames for playback', activeTabId)
        logger.debug(() => 'Cannot play animation with only one frame', { framesLength: frames.length })
        return
      }
      // frames.length check passed
    
      // Create state snapshot
      // 🔍 디버깅: 현재 탭 상태 스냅샷
      PlaybackDebugger.createStateSnapshot(activeTab)
      // State snapshot created
      
      // Calling logger.debug
      logger.debug(() => isPlaying ? 'Pausing playback' : 'Starting playback', { 
        isPlaying, 
        framesLength: frames.length 
      })
      // logger.debug completed
      
      console.log('🔍 [FrameManager] About to log TOGGLE_PLAYBACK_CALLED')
      // 🔍 디버깅: togglePlayback 호출 전
      PlaybackDebugger.log('TOGGLE_PLAYBACK_CALLED', {
        targetTabId: activeTabId,
        currentState: isPlaying ? 'playing' : 'stopped'
      }, activeTabId)
      console.log('✅ [FrameManager] TOGGLE_PLAYBACK_CALLED logged')
      
      if (isPlaying) {
        console.log('🛑 [FrameManager] Stopping playback')
        stopPlayback(activeTabId)
      } else {
        console.log('🚀 [FrameManager] Starting RAF-based playback directly')
        startPlayback(activeTabId)
      }
    
      // Setting timeout for result check
      // 🔍 디버깅: togglePlayback 호출 후 상태 확인 (비동기적으로)
      setTimeout(() => {
        // Timeout callback - checking result
        const updatedTab = getActiveTab()
        PlaybackDebugger.log('TOGGLE_PLAYBACK_RESULT', {
          newIsPlaying: updatedTab?.isPlaying,
          newPlaybackFrameIndex: updatedTab?.playbackFrameIndex,
          newPlaybackIntervalId: updatedTab?.playbackIntervalId
        }, activeTabId)
        // Result check completed
      }, 50)
      
      // handlePlayPause completed successfully
      return
      
    } catch (error) {
      console.error('❌ [FrameManager] ERROR in handlePlayPause:', error)
      // Error stack logged
      PlaybackDebugger.log('ERROR_OCCURRED', `handlePlayPause error: ${error instanceof Error ? error.message : 'Unknown error'}`, activeTabId)
      return
    }
  }

  const handleStop = (e: React.MouseEvent): void => {
    e.stopPropagation() // Prevent event bubbling
    // handleStop - Event propagation stopped
    
    if (!activeTabId) return
    
    // Prevent duplicate stop calls - check if already stopping
    if (!isPlaying) {
      // Already stopped - ignoring duplicate call
      return
    }
    
    logger.debug(() => 'Stopping playback and resetting to first frame', { 
      isPlaying, 
      currentFrame: playbackFrameIndex,
      totalFrames: frames.length 
    })
    
    // Only call stopPlayback if currently playing
    if (isPlaying) {
      stopPlayback(activeTabId)
    }
    
    // Reset to first frame
    setPlaybackFrame(activeTabId, 0)
    
    // If we have frames, set the first frame as active
    if (frames.length > 0 && frames[0]) {
      setActiveFrame(activeTabId, frames[0].id)
    }
  }

  const handleAddFrame = (): void => {
    addFrame(activeTabId)
  }

  const handleDuplicateFrame = (frameId: string) => {
    duplicateFrame(activeTabId, frameId)
  }

  const handleDeleteFrame = (frameId: string) => {
    if (frames.length > 1) {
      deleteFrame(activeTabId, frameId)
    }
  }

  const handleFrameSelect = (frameId: string) => {
    // Input validation
    if (!frameId || !activeTabId || !frames?.length) {
      return
    }

    // Verify frame exists
    const targetFrame = frames.find(f => f.id === frameId)
    if (!targetFrame) {
      return
    }

    // Prevent selection of same frame
    if (activeFrameId === frameId && !isPlaying) {
      return
    }

    try {
      if (!isPlaying) {
        // Normal frame selection when not playing
        setActiveFrame(activeTabId, frameId)
      }
      
      // Update playback frame index for synchronization
      const frameIndex = frames.findIndex(f => f.id === frameId)
      if (frameIndex >= 0) {
        setPlaybackFrame(activeTabId, frameIndex)
      }
    } catch (error) {
      logger.error('Frame selection failed', { frameId, activeTabId }, error)
    }
  }

  const handleFrameVisibilityToggle = (frameId: string) => {
    const frame = frames.find(f => f.id === frameId)
    if (frame) {
      // Toggle frame inclusion in animation
      // This would update the frame's included property
      // Toggle frame visibility
    }
  }

  const handleNextFrame = (e?: React.MouseEvent): void => {
    e?.stopPropagation() // Prevent event bubbling when called from onClick
    if (!activeTabId) return
    
    if (isPlaying) {
      // During playback, advance with looping (cycle back to first frame after last)
      const nextIndex = (playbackFrameIndex + 1) % frames.length
      setPlaybackFrame(activeTabId, nextIndex)
    } else {
      // Normal navigation
      if (activeFrameIndex < frames.length - 1) {
        const nextFrame = frames[activeFrameIndex + 1]
        if (nextFrame) {
          setActiveFrame(activeTabId, nextFrame.id)
        }
      }
    }
  }

  const handlePrevFrame = (e?: React.MouseEvent): void => {
    e?.stopPropagation() // Prevent event bubbling when called from onClick
    if (!activeTabId) return
    
    if (isPlaying) {
      // During playback, just go back playback frame
      const prevIndex = Math.max(playbackFrameIndex - 1, 0)
      setPlaybackFrame(activeTabId, prevIndex)
    } else {
      // Normal navigation
      if (activeFrameIndex > 0) {
        const prevFrame = frames[activeFrameIndex - 1]
        if (prevFrame) {
          setActiveFrame(activeTabId, prevFrame.id)
        }
      }
    }
  }

  return (
    <div className={cn(
      deviceInfo.isMobile ? 'space-y-1' : 'space-y-2', 
      className
    )}>
      {/* Animation Controls - Mobile-optimized layout */}
      <div className={cn(
        "flex items-center gap-2",
        deviceInfo.isMobile 
          ? "justify-center flex-wrap" // Center controls on mobile
          : "justify-between flex-wrap"
      )}>
        <div className={cn(
          "flex items-center flex-wrap",
          deviceInfo.isMobile ? "space-x-1" : "space-x-2"
        )}>
          {/* Enhanced Unified Play/Stop Button with Mobile Optimization */}
          <div className="relative group">
            <Button
              variant={isPlaying ? 'secondary' : 'default'}
              size={deviceInfo.isMobile ? "default" : "sm"}
              onClick={isPlaying ? handleStop : handlePlayPause}
              disabled={frames.length <= 1}
              className={cn(
                "transition-all duration-200 touch-button",
                deviceInfo.isMobile ? "px-4 min-h-11" : "px-3",
                isPlaying && "bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
              )}
            >
              {isPlaying ? (
                <>
                  <Square className={cn(deviceInfo.isMobile ? "h-5 w-5 mr-2" : "h-4 w-4 mr-2", "animate-pulse")} />
                  Stop
                </>
              ) : (
                <>
                  <Play className={cn(deviceInfo.isMobile ? "h-5 w-5 mr-2" : "h-4 w-4 mr-2")} />
                  Play
                </>
              )}
            </Button>
            
            {/* Tooltip for disabled state */}
            {frames.length <= 1 && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                애니메이션을 재생하려면 최소 2개 프레임이 필요합니다
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            )}
          </div>

          {/* Speed Control - Mobile-optimized */}
          {!deviceInfo.isMobile && (
            <div className="flex items-center space-x-2 ml-2">
              <Gauge className="h-4 w-4 text-gray-500" />
              <select
                value={playbackSpeed}
                onChange={(e) => {
                  if (activeTabId) {
                    const newSpeed = parseFloat(e.target.value)
                    setPlaybackSpeed(activeTabId, newSpeed)
                  }
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!activeTabId || frames.length <= 1}
              >
                <option value={0.25}>0.25×</option>
                <option value={0.5}>0.5×</option>
                <option value={0.75}>0.75×</option>
                <option value={1.0}>1.0×</option>
                <option value={1.25}>1.25×</option>
                <option value={1.5}>1.5×</option>
                <option value={2.0}>2.0×</option>
                <option value={3.0}>3.0×</option>
              </select>
            </div>
          )}

          {/* Mobile Speed Control - Simplified */}
          {deviceInfo.isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (activeTabId) {
                  // Cycle through common speeds: 0.5x, 1x, 2x
                  const speeds = [0.5, 1.0, 2.0]
                  const currentIndex = speeds.indexOf(playbackSpeed)
                  const nextSpeed = speeds[(currentIndex + 1) % speeds.length] || 1.0
                  setPlaybackSpeed(activeTabId, nextSpeed)
                }
              }}
              disabled={!activeTabId || frames.length <= 1}
              className="px-3 touch-button"
              title={`Speed: ${playbackSpeed}x (tap to change)`}
            >
              <Gauge className="h-4 w-4 mr-1" />
              {playbackSpeed}×
            </Button>
          )}

          {/* Navigation Controls - Mobile-friendly */}
          <div className={cn(
            "flex items-center",
            deviceInfo.isMobile ? "space-x-1" : "space-x-1"
          )}>
            <Button
              variant="ghost"
              size={deviceInfo.isMobile ? "default" : "sm"}
              onClick={handlePrevFrame}
              disabled={activeFrameIndex <= 0}
              className={cn(
                deviceInfo.isMobile ? "px-3 min-h-11 touch-button" : "px-2"
              )}
              title="Previous frame"
            >
              <SkipBack className={cn(deviceInfo.isMobile ? "h-5 w-5" : "h-4 w-4")} />
            </Button>
            
            <Button
              variant="ghost"
              size={deviceInfo.isMobile ? "default" : "sm"}
              onClick={handleNextFrame}
              disabled={activeFrameIndex >= frames.length - 1}
              className={cn(
                deviceInfo.isMobile ? "px-3 min-h-11 touch-button" : "px-2"
              )}
              title="Next frame"
            >
              <SkipForward className={cn(deviceInfo.isMobile ? "h-5 w-5" : "h-4 w-4")} />
            </Button>
            
            {/* Reset Button - Hide on compact mobile */}
            {!className?.includes('mobile-timeline-compact') && (
              <Button
                variant="ghost"
                size={deviceInfo.isMobile ? "default" : "sm"}
                onClick={() => {
                  if (activeTabId) {
                    resetPlaybackToStart(activeTabId)
                  }
                }}
                disabled={frames.length <= 1 || playbackFrameIndex === 0}
                className={cn(
                  deviceInfo.isMobile ? "px-3 min-h-11 touch-button" : "px-2 ml-2"
                )}
                title="Reset to first frame"
              >
                <RotateCcw className={cn(deviceInfo.isMobile ? "h-5 w-5" : "h-4 w-4")} />
              </Button>
            )}
          </div>

          {/* Frame Info - Responsive */}
          <div className={cn(
            "text-gray-600",
            deviceInfo.isMobile ? "text-xs" : "text-sm"
          )}>
            {isPlaying ? (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                {deviceInfo.isMobile 
                  ? `${playbackFrameIndex + 1}/${frames.length}`
                  : `Playing: Frame ${playbackFrameIndex + 1} of ${frames.length}`
                }
              </span>
            ) : (
              <span>
                {deviceInfo.isMobile 
                  ? `${activeFrameIndex + 1}/${frames.length}`
                  : `Frame ${activeFrameIndex + 1} of ${frames.length}`
                }
              </span>
            )}
          </div>
        </div>

        {/* Add Frame Button - Mobile-optimized */}
        <Button
          variant="outline"
          size={deviceInfo.isMobile ? "default" : "sm"}
          onClick={handleAddFrame}
          className={cn(
            "flex-shrink-0",
            deviceInfo.isMobile ? "px-3 min-h-11 touch-button" : "px-3"
          )}
          title="Add new frame"
        >
          <Plus className={cn(deviceInfo.isMobile ? "h-5 w-5 mr-2" : "h-4 w-4 mr-2")} />
          {deviceInfo.isMobile ? "+" : "Add"}
        </Button>

        {/* Additional info - Desktop only */}
        {!deviceInfo.isMobile && (
          <div className="text-xs text-gray-500">
            {frames.filter(f => f.included).length} frames in animation
          </div>
        )}
      </div>

      {/* Mobile Speed Control Row - Separate for better UX */}
      {deviceInfo.isMobile && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-2">
            <Gauge className="h-4 w-4 text-gray-500" />
            <select
              value={playbackSpeed}
              onChange={(e) => {
                if (activeTabId) {
                  const newSpeed = parseFloat(e.target.value)
                  setPlaybackSpeed(activeTabId, newSpeed)
                }
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-11 touch-button"
              disabled={!activeTabId || frames.length <= 1}
            >
              <option value={0.5}>0.5× Speed</option>
              <option value={1.0}>1.0× Speed</option>
              <option value={2.0}>2.0× Speed</option>
            </select>
          </div>
        </div>
      )}

      {/* Frame Timeline */}
      <div 
        ref={timelineRef}
        className={cn(
          "rounded-lg border bg-white p-3 outline-none transition-all",
          isFocused 
            ? "border-blue-400 ring-2 ring-blue-100" 
            : "border-gray-200 hover:border-gray-300"
        )}
        tabIndex={0}
        role="tablist"
        aria-label="Frame timeline"
        onFocus={handleTimelineFocus}
        onBlur={handleTimelineBlur}
        onClick={handleTimelineClick}
        onKeyDown={(e) => {
          // Allow space and arrow keys to trigger keyboard navigation
          if ([' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            e.preventDefault()
          }
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">
            Timeline
            {isFocused && (
              <span className="ml-2 text-xs text-blue-600">
                (Use ← → keys to navigate)
              </span>
            )}
          </span>
          <span className="text-xs text-gray-500">
            {frames.filter(f => f.included).length} frames in animation
          </span>
        </div>

        {/* Timeline container with mobile-optimized design */}
        <div 
          ref={timelineScrollRef}
          className={cn(
            "overflow-x-auto pb-1",
            className?.includes('mobile-timeline') && "mobile-timeline",
            className?.includes('mobile-timeline-compact') && "mobile-timeline max-h-[60px]"
          )}
          style={{
            minWidth: deviceInfo.isMobile ? '100%' : Math.max(frames.length * 70, 350) + 'px'
          }}
        >
          <div className={cn(
            "flex w-max",
            deviceInfo.isMobile ? "space-x-2 px-2" : "space-x-1"
          )}>
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              ref={el => { frameRefs.current[index] = el }}
              className={cn(
                'group relative flex-shrink-0 cursor-pointer rounded border-2 transition-all duration-200',
                // Mobile-optimized sizing
                deviceInfo.isMobile 
                  ? "p-2 mobile-frame-thumbnail touch-button" 
                  : "p-1.5",
                // Touch-friendly feedback
                isTouch && "touch-feedback",
                // State-based styling
                activeFrameId === frame.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
                // Enhanced playing frame animation
                isPlaying && playbackFrameIndex === index && 'ring-2 ring-green-400 scale-105 shadow-lg bg-green-50 border-green-400',
                playbackFrameId === frame.id && isPlaying && 'animate-pulse'
              )}
              role="tab"
              aria-selected={activeFrameId === frame.id}
              aria-label={`Frame ${index + 1} of ${frames.length}, ${frame.delayMs}ms delay${frame.included ? ', included in animation' : ', excluded from animation'}`}
              title={`Frame ${index + 1} - ${frame.delayMs}ms delay${activeFrameId === frame.id ? ' (active)' : ''}`}
              onClick={() => handleFrameSelect(frame.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleFrameSelect(frame.id)
                }
              }}
              // Touch-friendly interaction
              onTouchStart={(e) => {
                if (isTouch) {
                  e.currentTarget.style.transform = 'scale(0.95)'
                }
              }}
              onTouchEnd={(e) => {
                if (isTouch) {
                  e.currentTarget.style.transform = ''
                }
              }}
              tabIndex={-1} // Timeline container handles keyboard navigation
            >
              {/* Frame Preview with Thumbnail - Mobile-optimized size */}
              <div className={cn(
                "rounded bg-gray-100 border border-gray-200 overflow-hidden relative",
                deviceInfo.isMobile 
                  ? "h-12 w-12" // 48px for mobile (better touch target)
                  : "h-10 w-10"  // 40px for desktop
              )}>
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
                          if (activeTabId) {
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

              {/* Frame Info - Compact */}
              <div className="mt-0.5 text-center">
                <div className="text-[10px] text-gray-600 leading-tight">
                  {frame.delayMs}ms
                </div>
              </div>

              {/* Frame Actions - Mobile-optimized layout */}
              <div className={cn(
                "absolute flex transition-opacity",
                deviceInfo.isMobile ? (
                  "top-0 right-0 flex-row space-x-1 opacity-100" // Always visible on mobile
                ) : (
                  "-top-1 -right-1 flex-col space-y-0.5 opacity-0 group-hover:opacity-100"
                )
              )}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "bg-white border-gray-300",
                    deviceInfo.isMobile 
                      ? "h-6 w-6 p-0 hover:bg-green-50" // Larger for mobile
                      : "h-5 w-5 p-0 hover:bg-green-50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFrameVisibilityToggle(frame.id)
                  }}
                  title={frame.included ? 'Hide from animation' : 'Include in animation'}
                >
                  {frame.included ? (
                    <Eye className={cn(deviceInfo.isMobile ? "h-3 w-3" : "h-2.5 w-2.5", "text-green-600")} />
                  ) : (
                    <EyeOff className={cn(deviceInfo.isMobile ? "h-3 w-3" : "h-2.5 w-2.5", "text-gray-400")} />
                  )}
                </Button>
              </div>

              <div className={cn(
                "absolute flex transition-opacity",
                deviceInfo.isMobile ? (
                  "bottom-0 right-0 flex-row space-x-1 opacity-100" // Always visible on mobile
                ) : (
                  "-bottom-1 -right-1 flex-row space-x-0.5 opacity-0 group-hover:opacity-100"
                )
              )}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "bg-white border-gray-300",
                    deviceInfo.isMobile 
                      ? "h-6 w-6 p-0 hover:bg-blue-50" // Larger for mobile
                      : "h-5 w-5 p-0 hover:bg-blue-50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDuplicateFrame(frame.id)
                  }}
                  title="Duplicate frame"
                >
                  <Copy className={cn(deviceInfo.isMobile ? "h-3 w-3" : "h-2.5 w-2.5", "text-blue-600")} />
                </Button>

                {frames.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "bg-white border-gray-300",
                      deviceInfo.isMobile 
                        ? "h-6 w-6 p-0 hover:bg-red-50" // Larger for mobile
                        : "h-5 w-5 p-0 hover:bg-red-50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFrame(frame.id)
                    }}
                    title="Delete frame"
                  >
                    <Trash2 className={cn(deviceInfo.isMobile ? "h-3 w-3" : "h-2.5 w-2.5", "text-red-600")} />
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

      </div>

      {/* Compact Playback Info & Tips */}
      <div className="space-y-1">
        {isPlaying && (
          <div className="rounded bg-green-50 border border-green-200 px-2 py-1 text-xs text-green-700">
            🎬 <strong>Playing:</strong> {frames.filter(f => f.included).length} frames @ {frames[playbackFrameIndex]?.delayMs || 500}ms
          </div>
        )}
        
        <div className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          💡 {isPlaying 
            ? 'Use ← → keys or controls to navigate'
            : isFocused
              ? 'Use ← → keys, Space to play/pause'
              : 'Click timeline for keyboard shortcuts'
          }
        </div>
      </div>
    </div>
  )
}