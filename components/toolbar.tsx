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

interface ToolbarProps {
  className?: string
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

export function Toolbar({ className }: ToolbarProps) {
  const {
    activeTabId,
    getActiveTab,
    updateCanvasState,
    undo,
    redo,
  } = useProjectStore()

  const activeTab = getActiveTab()
  const canvasState = activeTab?.canvasState

  // Debug logging utility (disabled)
  const debugLog = (category: string, message: string, data?: any) => {
    // Debug logs disabled for playback optimization
  }

  const handleToolChange = React.useCallback((tool: Tool) => {
    if (!canvasState || !activeTabId) return
    
    // Tool changed
    
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
    } else {
      updateCanvasState(activeTabId, { tool })
    }
  }, [canvasState, activeTabId, updateCanvasState])

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
    // Render error: missing state
    return null
  }


  return (
    <div className={cn('space-y-3', className)}>
      {/* Drawing Tools - Responsive Grid Layout */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          DRAWING TOOLS
        </div>
        
        {/* Tools Grid - Responsive Layout */}
        <div className={cn(
          "grid gap-2",
          // Desktop: 3 columns (3x2 layout)
          "lg:grid-cols-3",
          // Tablet: 2 columns (3x2 layout) 
          "md:grid-cols-2",
          // Mobile: 3 columns (compact)
          "grid-cols-3"
        )}>
          {/* First Row - Primary Tools */}
          {tools.slice(0, 3).map((tool) => {
            const Icon = tool.icon
            const isActive = canvasState.tool === tool.id
            return (
              <Tooltip
                key={tool.id}
                content={`${tool.name} - ${tool.description} (Press ${tool.shortcut})`}
                side="right"
              >
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  size="icon"
                  className={cn(
                    "relative w-11 h-11 lg:w-12 lg:h-12 rounded-lg transition-all duration-200",
                    "border-2 shadow-sm hover:shadow-lg transform hover:scale-105 active:scale-95",
                    "focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-1",
                    "group",
                    isActive
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-500 shadow-lg"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                  )}
                  onClick={() => handleToolChange(tool.id)}
                  aria-label={`${tool.name} tool (keyboard shortcut: ${tool.shortcut})`}
                  aria-pressed={isActive}
                  role="button"
                  tabIndex={0}
                >
                  <Icon 
                    className={cn(
                      "h-4 w-4 lg:h-5 lg:w-5 transition-all duration-200",
                      "group-hover:scale-110",
                      isActive 
                        ? "text-white drop-shadow-sm" 
                        : "text-gray-600 group-hover:text-gray-900"
                    )} 
                    aria-hidden="true" 
                  />
                  {/* Keyboard shortcut indicator */}
                  <span 
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 text-xs font-mono font-bold",
                      "w-3 h-3 lg:w-4 lg:h-4 rounded-full flex items-center justify-center",
                      "transition-all duration-200 pointer-events-none text-xs",
                      isActive 
                        ? "bg-white text-blue-600 shadow-md" 
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
                    )}
                    style={{ fontSize: '0.6rem' }}
                    aria-hidden="true"
                  >
                    {tool.shortcut}
                  </span>
                </Button>
              </Tooltip>
            )
          })}
          
          {/* Second Row - Secondary Tools (Centered on larger screens) */}
          {tools.slice(3).map((tool, index) => {
            const Icon = tool.icon
            const isActive = canvasState.tool === tool.id
            return (
              <Tooltip
                key={tool.id}
                content={`${tool.name} - ${tool.description} (Press ${tool.shortcut})`}
                side="right"
              >
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  size="icon"
                  className={cn(
                    "relative w-11 h-11 lg:w-12 lg:h-12 rounded-lg transition-all duration-200",
                    "border-2 shadow-sm hover:shadow-lg transform hover:scale-105 active:scale-95",
                    "focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-1",
                    "group",
                    // Center the last row on desktop (3-column layout)
                    index === 0 && tools.slice(3).length === 2 && "lg:col-start-2",
                    isActive
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-500 shadow-lg"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                  )}
                  onClick={() => handleToolChange(tool.id)}
                  aria-label={`${tool.name} tool (keyboard shortcut: ${tool.shortcut})`}
                  aria-pressed={isActive}
                  role="button"
                  tabIndex={0}
                >
                  <Icon 
                    className={cn(
                      "h-4 w-4 lg:h-5 lg:w-5 transition-all duration-200",
                      "group-hover:scale-110",
                      isActive 
                        ? "text-white drop-shadow-sm" 
                        : "text-gray-600 group-hover:text-gray-900"
                    )} 
                    aria-hidden="true" 
                  />
                  {/* Keyboard shortcut indicator */}
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
                </Button>
              </Tooltip>
            )
          })}
        </div>
      </div>

      {/* Tips and Shortcuts */}
      <div className="mt-4">
        <div className="space-y-2">
          <div className="rounded bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
            ⌨️ <strong>Shortcuts:</strong> P-Pencil, E-Eraser, B-Fill, W-Magic Wand, I-Color Picker, H-Pan
          </div>
          
          <div className="rounded bg-green-50 border border-green-200 p-2 text-xs text-green-700">
            💡 <strong>Tip:</strong> Use Magic Wand (W) to select similar colors. Esc to clear, Del to delete selection.
          </div>
          
          {canvasState.selection?.isActive && canvasState.selection.selectedPixels.size > 0 && (
            <div className="rounded bg-purple-50 border border-purple-200 p-2 text-xs text-purple-700">
              🪄 <strong>Selection Active:</strong> {canvasState.selection.selectedPixels.size} pixels selected
              <br />
              <span className="text-xs text-purple-600">
                Use pencil/eraser to edit selection, or paint bucket to fill all selected pixels
              </span>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}