'use client'

import React from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Move,
  Wand2
} from 'lucide-react'
import { useHapticFeedback } from '@/lib/utils/haptic-feedback'
import { createComponentLogger } from '@/lib/ui/smart-logger'

interface ToolbarProps {
  className?: string
  touchTargetSize?: number
  placement?: 'sidebar' | 'floating' | 'compact' | 'bottom-bar'
}

type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'pan' | 'magic-wand'

const tools: Array<{
  id: Tool
  name: string
  icon: React.ComponentType<{ className?: string }>
  shortcut: string
  description?: string
}> = [
  { id: 'pencil', name: 'Pencil', icon: Pencil, shortcut: 'P', description: 'Draw pixels one by one' },
  { id: 'eraser', name: 'Eraser', icon: Eraser, shortcut: 'E', description: 'Erase pixels to transparency' },
  { id: 'fill', name: 'Paint Bucket', icon: PaintBucket, shortcut: 'B', description: 'Fill connected areas with color' },
  { id: 'magic-wand', name: 'Magic Wand', icon: Wand2, shortcut: 'W', description: 'Select connected pixels of same color' },
  { id: 'eyedropper', name: 'Color Picker', icon: Pipette, shortcut: 'I', description: 'Pick color from canvas' },
  { id: 'pan', name: 'Pan', icon: Move, shortcut: 'H', description: 'Move around the canvas' },
]

export function Toolbar({ className, touchTargetSize = 44, placement = 'sidebar' }: ToolbarProps) {
  const {
    activeTabId,
    getActiveTab,
    updateCanvasState,
    undo,
    redo,
  } = useProjectStore()

  const componentLogger = createComponentLogger('Toolbar')
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const { trigger: triggerHaptic } = useHapticFeedback({ enabled: isTouch })
  const activeTab = getActiveTab()
  const canvasState = activeTab?.canvasState

  const handleToolChange = React.useCallback(async (tool: Tool) => {
    if (!canvasState || !activeTabId) {
      componentLogger.warn(
        'TOOL_CHANGE_BLOCKED',
        {
          reason: 'missing-state',
          hasCanvasState: !!canvasState,
          hasActiveTab: !!activeTabId
        }
      )
      return
    }
    
    componentLogger.debug(
      'TOOL_CHANGE_REQUESTED',
      {
        fromTool: canvasState.tool,
        toTool: tool,
        inputMethod: isTouch ? 'touch' : 'mouse',
        placement
      }
    )

    try {
      // Trigger haptic feedback for tool selection
      if (isTouch) {
        await triggerHaptic('selection')
      }
      
      // Clear selection when switching away from magic wand
      if (canvasState.tool === 'magic-wand' && tool !== 'magic-wand' && canvasState.selection?.isActive) {
        updateCanvasState(activeTabId, { 
          tool,
          selection: {
            ...canvasState.selection,
            isActive: false,
            selectedPixels: new Set(),
            bounds: null
          }
        })
        
        componentLogger.info(
          'TOOL_CHANGED_WITH_SELECTION_CLEAR',
          {
            tool,
            previousTool: canvasState.tool,
            selectionCleared: true
          }
        )
      } else {
        updateCanvasState(activeTabId, { tool })
        
        componentLogger.info(
          'TOOL_CHANGED',
          {
            tool,
            previousTool: canvasState.tool
          }
        )
      }
    } catch (error) {
      componentLogger.error(
        'TOOL_CHANGE_ERROR',
        {
          tool,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        error
      )
    }
  }, [canvasState, activeTabId, updateCanvasState, isTouch, triggerHaptic, placement])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = e.key.toLowerCase()
      const tool = tools.find(t => t.shortcut.toLowerCase() === key)
      
      if (tool) {
        e.preventDefault()
        handleToolChange(tool.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleToolChange])

  if (!activeTabId || !canvasState) {
    componentLogger.warn(
      'TOOLBAR_RENDER_BLOCKED',
      {
        reason: 'missing-state',
        hasActiveTab: !!activeTabId,
        hasCanvasState: !!canvasState
      }
    )
    return null
  }

  // Calculate layout configuration based on placement
  const getLayoutConfig = () => {
    const baseConfig = {
      spacing: touchTargetSize < 44 ? 'gap-1' : 'gap-2',
      buttonSize: touchTargetSize,
      showLabels: placement !== 'compact',
      gridCols: placement === 'compact' ? 'grid-cols-1' : 
                placement === 'floating' ? 'grid-cols-6' : 
                'lg:grid-cols-3 md:grid-cols-2 grid-cols-3'
    }

    componentLogger.debug(
      'TOOLBAR_LAYOUT_CONFIG',
      {
        placement,
        touchTargetSize,
        layoutConfig: baseConfig
      }
    )

    return baseConfig
  }

  const layoutConfig = getLayoutConfig()

  return (
    <div className={cn(
      'space-y-2', 
      className
    )}>
      {/* Drawing Tools - Unified Responsive Layout */}
      <div className="space-y-2">
        {/* Header - Conditional based on placement */}
        {layoutConfig.showLabels && (
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            {placement === 'compact' ? 'TOOLS' : 'DRAWING TOOLS'}
          </div>
        )}
        
        {/* Tools Grid - Unified Responsive Layout */}
        <div className={cn(
          "grid",
          layoutConfig.spacing,
          layoutConfig.gridCols
        )}>
          {tools.map((tool) => {
            const Icon = tool.icon
            const isActive = canvasState.tool === tool.id
            
            // Don't show pan tool on touch devices (use native gestures)
            if (isTouch && tool.id === 'pan') {
              componentLogger.debug(
                'TOOL_HIDDEN_FOR_TOUCH',
                {
                  tool: tool.id,
                  reason: 'native-gesture-preferred'
                }
              )
              return null
            }
            
            return (
              <Tooltip
                key={tool.id}
                content={isTouch 
                  ? `${tool.name}${tool.id === 'eyedropper' ? ' (or long press canvas)' : ''}`
                  : `${tool.name} - ${tool.description} (Press ${tool.shortcut})`
                }
                side="right"
              >
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  size="icon"
                  className={cn(
                    "relative rounded-lg transition-all duration-200 border-2 shadow-sm group",
                    // Unified sizing based on touchTargetSize
                    `w-[${layoutConfig.buttonSize}px] h-[${layoutConfig.buttonSize}px]`,
                    // Touch feedback
                    isTouch && "touch-button touch-feedback",
                    // Hover and active states
                    "hover:shadow-lg transform hover:scale-105 active:scale-95",
                    "focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-1",
                    isActive
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-500 shadow-lg"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                  )}
                  onClick={() => {
                    componentLogger.debug(
                      'TOOL_BUTTON_CLICKED',
                      {
                        tool: tool.id,
                        currentTool: canvasState.tool,
                        inputMethod: 'click'
                      }
                    )
                    handleToolChange(tool.id)
                  }}
                  aria-label={`${tool.name} tool${!isTouch ? ` (keyboard shortcut: ${tool.shortcut})` : ''}`}
                  aria-pressed={isActive}
                  role="button"
                  tabIndex={0}
                >
                  <Icon 
                    className={cn(
                      "transition-all duration-200 group-hover:scale-110",
                      // Unified icon sizing based on button size
                      layoutConfig.buttonSize >= 44 ? "h-5 w-5" : "h-4 w-4",
                      isActive 
                        ? "text-white drop-shadow-sm" 
                        : "text-gray-600 group-hover:text-gray-900"
                    )} 
                    aria-hidden="true" 
                  />
                  
                  {/* Keyboard shortcut indicator - Show based on placement */}
                  {!isTouch && layoutConfig.showLabels && (
                    <span 
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 text-xs font-mono font-bold",
                        "w-3 h-3 lg:w-4 lg:h-4 rounded-full flex items-center justify-center",
                        "transition-all duration-200 pointer-events-none",
                        isActive 
                          ? "bg-white text-blue-600 shadow-md" 
                          : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
                      )}
                      style={{ fontSize: '0.6rem' }}
                      aria-hidden="true"
                    >
                      {tool.shortcut}
                    </span>
                  )}
                </Button>
              </Tooltip>
            )
          })}
        </div>
        
        {/* Touch instructions - Show based on placement and device */}
        {isTouch && placement !== 'compact' && (
          <div className="text-xs text-gray-500 text-center bg-blue-50 rounded-lg p-2">
            💡 Long press canvas for color picker • Pinch to zoom • Swipe to pan
          </div>
        )}
      </div>
    </div>
  )
}