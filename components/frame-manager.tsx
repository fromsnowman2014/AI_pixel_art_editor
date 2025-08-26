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
import { createComponentLogger } from '@/lib/utils/smart-logger'
import { PlaybackDebugger } from '@/lib/utils/playback-debugger'

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
    startPlayback,
    stopPlayback,
    togglePlayback,
    setPlaybackFrame,
    setPlaybackSpeed,
    resetPlaybackToStart,
    getActiveTab,
  } = useProjectStore()

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
  
  // Simple interval-based playback
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

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
      logger.debug(() => 'Keyboard navigation listeners attached', { framesCount: frames.length })
    }

    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation)
      if (isFocused) {
        logger.debug(() => 'Keyboard navigation listeners removed')
      }
    }
  }, [handleKeyboardNavigation, isFocused, frames.length, logger])

  // Handle focus events for timeline
  const handleTimelineFocus = useCallback(() => {
    setIsFocused(true)
    logger.debug(() => 'Timeline focused - keyboard navigation enabled')
  }, [logger])

  const handleTimelineBlur = useCallback(() => {
    setIsFocused(false)
    logger.debug(() => 'Timeline blurred - keyboard navigation disabled')
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
      console.log('🧹 [FrameManager] Component unmount cleanup - checking playback')
      if (capturedActiveTabId) {
        const currentState = useProjectStore.getState()
        const currentTab = currentState.tabs.find(t => t.id === capturedActiveTabId)
        if (currentTab?.isPlaying && currentTab?.playbackIntervalId) {
          console.log('🧹 [FrameManager] Stopping playback on unmount')
          stopPlayback(capturedActiveTabId)
        }
      }
    }
  }, []) // 🚨 CRITICAL: Empty dependency array to only run on unmount!

  // Early return after all hooks are defined
  const activeFrameIndex = frames.findIndex(f => f.id === activeFrameId)

  // Simple interval-based auto-advance (arrow key simulation)
  const startSimpleAutoPlay = useCallback(() => {
    console.log('🚀 [startSimpleAutoPlay] Starting simple auto-advance', { 
      activeTabId, 
      framesLength: frames.length,
      currentPlaybackFrameId: playbackFrameId 
    })
    
    if (!activeTabId) {
      console.log('❌ [startSimpleAutoPlay] No activeTabId - RETURN')
      return
    }
    
    if (frames.length <= 1) {
      console.log('❌ [startSimpleAutoPlay] Not enough frames - RETURN', { framesLength: frames.length })
      return
    }
    
    // Clear any existing interval and stop any running frameLoop
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    // Stop any existing frameLoop system first
    if (activeTabId && isPlaying) {
      stopPlayback(activeTabId)
    }
    
    // Set playback state to true without frameLoop
    if (activeTabId && !isPlaying) {
      // Directly set playing state using Zustand setState
      useProjectStore.setState((state) => {
        const tab = state.tabs.find(t => t.id === activeTabId)
        if (tab) {
          tab.isPlaying = true
          tab.playbackFrameIndex = 0
        }
      })
    }
    
    // Start interval to advance frames every 500ms
    console.log('🔧 [startSimpleAutoPlay] About to create setInterval')
    
    // Immediate test to verify interval will work
    console.log('🧪 [startSimpleAutoPlay] Testing handleNextFrame before interval')
    try {
      const testResult = handleNextFrame()
      console.log('✅ [startSimpleAutoPlay] Test handleNextFrame succeeded:', testResult)
    } catch (error) {
      console.error('❌ [startSimpleAutoPlay] Test handleNextFrame failed:', error)
      return // Don't start interval if handleNextFrame is broken
    }
    
    intervalRef.current = setInterval(() => {
      const timestamp = Date.now()
      const currentFramesBefore = frames.length
      const currentIndexBefore = playbackFrameIndex
      
      console.log('⏰ [AutoAdvance] Interval executing at', timestamp, {
        framesBefore: currentFramesBefore,
        indexBefore: currentIndexBefore,
        activeTab: activeTabId
      })
      
      try {
        const result = handleNextFrame()
        console.log('✅ [AutoAdvance] Frame advanced successfully', {
          result,
          from: currentIndexBefore,
          to: playbackFrameIndex,
          totalFrames: currentFramesBefore,
          timestamp
        })
      } catch (error) {
        console.error('❌ [AutoAdvance] Critical error in handleNextFrame:', error)
        console.error('🛑 [AutoAdvance] Stopping interval due to error')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, 500)
    console.log('🔧 [startSimpleAutoPlay] setInterval created with ID:', intervalRef.current)
    
    console.log('✅ [startSimpleAutoPlay] Auto-advance started with interval:', intervalRef.current)
    logger.debug('Started simple auto-play with interval')
  }, [activeTabId, frames.length, playbackFrameId, isPlaying, startPlayback, handleNextFrame, logger])
  
  // Stop auto-advance
  const stopSimpleAutoPlay = useCallback(() => {
    console.log('⏹️ [stopSimpleAutoPlay] Stopping auto-advance')
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      console.log('✅ [stopSimpleAutoPlay] Interval cleared')
    }
    
    if (activeTabId && isPlaying) {
      stopPlayback(activeTabId)
      console.log('✅ [stopSimpleAutoPlay] Playback stopped')
    }
    
    logger.debug('Stopped simple auto-play')
  }, [activeTabId, isPlaying, stopPlayback, logger])

  // User interaction detection for auto-stop
  const handleUserInteraction = useCallback((e: Event) => {
    if (activeTabId && isPlaying) {
      // Check if click is outside frame manager area
      const target = e.target as HTMLElement
      const frameManagerArea = target.closest('[data-frame-manager]')
      
      if (!frameManagerArea) {
        // Click is outside frame manager, stop playback
        stopSimpleAutoPlay()
        stopPlayback(activeTabId)
        logger.debug(() => 'Playback stopped due to user interaction outside frame manager', {
          eventType: e.type,
          target: target.tagName
        })
      }
    }
  }, [activeTabId, isPlaying, stopPlayback, stopSimpleAutoPlay, logger])

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
    console.log('🎬 [FrameManager] handlePlayPause START')
    
    // 🚨 CRITICAL: Stop event bubbling to prevent handleGlobalClick from stopping playback
    e.stopPropagation()
    console.log('🛡️ [FrameManager] Event propagation stopped to prevent global click handler')
    
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
      
      console.log('✅ [FrameManager] PlaybackDebugger.log PLAY_BUTTON_CLICKED completed')
    
      console.log('🔍 [FrameManager] Checking activeTabId:', activeTabId)
      if (!activeTabId) {
        console.log('❌ [FrameManager] No activeTabId - RETURN')
        PlaybackDebugger.log('ERROR_OCCURRED', 'No active tab ID', activeTabId)
        return
      }
      console.log('✅ [FrameManager] activeTabId check passed')
      
      console.log('🔍 [FrameManager] Checking frames.length:', frames.length)
      if (frames.length <= 1) {
        console.log('❌ [FrameManager] Not enough frames - RETURN')
        PlaybackDebugger.log('ERROR_OCCURRED', 'Not enough frames for playback', activeTabId)
        logger.debug(() => 'Cannot play animation with only one frame', { framesLength: frames.length })
        return
      }
      console.log('✅ [FrameManager] frames.length check passed')
    
      console.log('🔍 [FrameManager] Creating state snapshot for activeTab')
      // 🔍 디버깅: 현재 탭 상태 스냅샷
      PlaybackDebugger.createStateSnapshot(activeTab)
      console.log('✅ [FrameManager] State snapshot created')
      
      console.log('🔍 [FrameManager] Calling logger.debug')
      logger.debug(() => isPlaying ? 'Pausing playback' : 'Starting playback', { 
        isPlaying, 
        framesLength: frames.length 
      })
      console.log('✅ [FrameManager] logger.debug completed')
      
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
    
      console.log('🕰️ [FrameManager] Setting timeout for result check')
      // 🔍 디버깅: togglePlayback 호출 후 상태 확인 (비동기적으로)
      setTimeout(() => {
        console.log('🔍 [FrameManager] Timeout callback - checking result')
        const updatedTab = getActiveTab()
        PlaybackDebugger.log('TOGGLE_PLAYBACK_RESULT', {
          newIsPlaying: updatedTab?.isPlaying,
          newPlaybackFrameIndex: updatedTab?.playbackFrameIndex,
          newPlaybackIntervalId: updatedTab?.playbackIntervalId
        }, activeTabId)
        console.log('✅ [FrameManager] Result check completed')
      }, 50)
      
      console.log('🎉 [FrameManager] handlePlayPause completed successfully')
      return
      
    } catch (error) {
      console.error('❌ [FrameManager] ERROR in handlePlayPause:', error)
      console.error('❌ [FrameManager] Error stack:', error instanceof Error ? error.stack : 'No stack')
      PlaybackDebugger.log('ERROR_OCCURRED', `handlePlayPause error: ${error instanceof Error ? error.message : 'Unknown error'}`, activeTabId)
      return
    }
  }

  const handleStop = (e: React.MouseEvent): void => {
    e.stopPropagation() // Prevent event bubbling
    console.log('🛡️ [FrameManager] handleStop - Event propagation stopped')
    
    if (!activeTabId) return
    
    // Prevent duplicate stop calls - check if already stopping
    if (!isPlaying && !intervalRef.current) {
      console.log('🚫 [handleStop] Already stopped - ignoring duplicate call')
      return
    }
    
    logger.debug(() => 'Stopping playback and resetting to first frame', { 
      isPlaying, 
      currentFrame: playbackFrameIndex,
      totalFrames: frames.length 
    })
    
    // Stop simple auto-play interval first
    stopSimpleAutoPlay()
    
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
    logger.debug(() => 'Frame duplication initiated', { frameId, totalFrames: frames.length })
    duplicateFrame(activeTabId, frameId)
    logger.debug(() => 'Frame duplication completed', { frameId })
  }

  const handleDeleteFrame = (frameId: string) => {
    if (frames.length > 1) {
      deleteFrame(activeTabId, frameId)
    }
  }

  const handleFrameSelect = (frameId: string) => {
    // Input validation
    if (!frameId || !activeTabId || !frames?.length) {
      logger.warn('Invalid frame selection parameters', { frameId, activeTabId, framesLength: frames?.length })
      return
    }

    // Verify frame exists
    const targetFrame = frames.find(f => f.id === frameId)
    if (!targetFrame) {
      logger.warn('Target frame not found', { frameId, availableFrames: frames.length })
      return
    }

    // Prevent selection of same frame
    if (activeFrameId === frameId && !isPlaying) {
      logger.debug(() => 'Same frame already selected', { frameId })
      return
    }

    try {
      logger.debug(() => 'Switching to frame', { from: activeFrameId, to: frameId })
      
      if (!isPlaying) {
        // Normal frame selection when not playing
        setActiveFrame(activeTabId, frameId)
      }
      
      // Update playback frame index for synchronization
      const frameIndex = frames.findIndex(f => f.id === frameId)
      if (frameIndex >= 0) {
        setPlaybackFrame(activeTabId, frameIndex)
      } else {
        logger.warn('Could not find frame index for playback', { frameId })
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
      console.log('Toggle frame visibility:', frameId)
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
    <div className={cn('space-y-3', className)}>
      {/* Animation Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Enhanced Unified Play/Stop Button with Tooltip */}
          <div className="relative group">
            <Button
              variant={isPlaying ? 'secondary' : 'default'}
              size="sm"
              onClick={isPlaying ? handleStop : handlePlayPause}
              disabled={frames.length <= 1}
              className={cn(
                "px-3 transition-all duration-200",
                isPlaying && "bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
              )}
            >
              {isPlaying ? (
                <>
                  <Square className="h-4 w-4 mr-2 animate-pulse" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
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

          {/* Speed Control */}
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

          {/* Reset to Start Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (activeTabId) {
                resetPlaybackToStart(activeTabId)
              }
            }}
            disabled={frames.length <= 1 || playbackFrameIndex === 0}
            className="px-2 ml-2"
            title="Reset to first frame"
          >
            <RotateCcw className="h-4 w-4" />
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
            {isPlaying ? (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Playing: Frame {playbackFrameIndex + 1} of {frames.length}
              </span>
            ) : (
              <span>Frame {activeFrameIndex + 1} of {frames.length}</span>
            )}
          </div>
        </div>

        <Button
          variant={frames.length <= 1 ? "default" : "outline"}
          size="sm"
          onClick={handleAddFrame}
          className={cn(
            "px-3 transition-all duration-200",
            frames.length <= 1 && "animate-pulse bg-blue-500 text-white hover:bg-blue-600"
          )}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Frame
          {frames.length <= 1 && (
            <span className="ml-2 text-xs">← 애니메이션 시작</span>
          )}
        </Button>
      </div>

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

        {/* Timeline container with dynamic minimum width */}
        <div 
          ref={timelineScrollRef}
          className="overflow-x-auto pb-2"
          style={{
            minWidth: Math.max(frames.length * 80, 400) + 'px'
          }}
        >
          <div className="flex space-x-2 w-max">
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              ref={el => { frameRefs.current[index] = el }}
              className={cn(
                'group relative flex-shrink-0 cursor-pointer rounded border-2 p-2 transition-all duration-200',
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
              tabIndex={-1} // Timeline container handles keyboard navigation
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

      </div>

      {/* Playback Info & Quick Tips */}
      <div className="space-y-2">
        {isPlaying && (
          <div className="rounded bg-green-50 border border-green-200 p-2 text-xs text-green-700">
            🎬 <strong>Playing Animation:</strong> {frames.filter(f => f.included).length} frames • 
            {frames[playbackFrameIndex]?.delayMs || 500}ms per frame • 
            Click frames to jump or use controls to navigate
          </div>
        )}
        
        <div className="rounded bg-amber-50 p-2 text-xs text-amber-700">
          💡 <strong>Tip:</strong> {isPlaying 
            ? 'Use ← → keys or buttons to scrub through frames, or click pause to edit'
            : isFocused
              ? 'Use ← → keys to navigate frames, Space to play/pause, Home/End for first/last frame'
              : 'Click the timeline to enable keyboard navigation, or click frames to switch between them'
          }
        </div>
      </div>
    </div>
  )
}