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
  Move
} from 'lucide-react'

interface ToolbarProps {
  className?: string
}

type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'pan'

const tools: Array<{
  id: Tool
  name: string
  icon: React.ComponentType<{ className?: string }>
  shortcut: string
}> = [
  { id: 'pencil', name: 'Pencil', icon: Pencil, shortcut: 'P' },
  { id: 'eraser', name: 'Eraser', icon: Eraser, shortcut: 'E' },
  { id: 'fill', name: 'Paint Bucket', icon: PaintBucket, shortcut: 'B' },
  { id: 'eyedropper', name: 'Color Picker', icon: Pipette, shortcut: 'I' },
  { id: 'pan', name: 'Pan', icon: Move, shortcut: 'H' },
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

  // Debug logging utility
  const DEBUG_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')
  const debugLog = (category: string, message: string, data?: any) => {
    if (DEBUG_MODE) {
      const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
      console.log(`[${timestamp}] 🛠️  Toolbar [${category}]:`, message, data || '')
    }
  }

  if (!activeTabId || !canvasState) {
    debugLog('RENDER_ERROR', 'Missing activeTabId or canvasState', { activeTabId, hasCanvasState: !!canvasState })
    return null
  }

  const handleToolChange = (tool: Tool) => {
    debugLog('TOOL_CHANGE', `Tool changed from ${canvasState.tool} to ${tool}`, {
      previousTool: canvasState.tool,
      newTool: tool,
      activeTabId: activeTabId
    })
    updateCanvasState(activeTabId, { tool })
  }


  return (
    <div className={cn('space-y-4', className)}>
      {/* Drawing Tools - Responsive Grid Layout */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          TOOLS
        </div>
        
        {/* Tools Grid - Responsive Layout */}
        <div className={cn(
          "grid gap-2",
          // Desktop: 3 columns (3x2 layout)
          "lg:grid-cols-3",
          // Tablet: 2 columns (2x3 layout) 
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
                content={`${tool.name} (${tool.shortcut})`}
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
                content={`${tool.name} (${tool.shortcut})`}
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

      {/* Brush Size Control - Compact Design */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
          BRUSH SIZE
        </div>
        
        <div className="bg-white rounded-lg border-2 border-gray-200 p-3 shadow-sm hover:shadow-md transition-all duration-200">
          {/* Size Display */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div 
                className="rounded-full bg-blue-500 transition-all duration-200"
                style={{
                  width: `${Math.max(8, canvasState.brushSize * 2)}px`,
                  height: `${Math.max(8, canvasState.brushSize * 2)}px`
                }}
              />
              <span className="text-sm text-gray-600">Preview</span>
            </div>
            <span className="text-sm font-mono font-bold px-2 py-1 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded text-blue-700">
              {canvasState.brushSize}px
            </span>
          </div>
          
          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={canvasState.brushSize}
              onChange={(e) => 
                updateCanvasState(activeTabId, { brushSize: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(canvasState.brushSize - 1) * 11.11}%, #e5e7eb ${(canvasState.brushSize - 1) * 11.11}%, #e5e7eb 100%)`
              }}
            />
            
            {/* Quick Size Buttons */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 font-mono">1px</span>
              <div className="flex gap-1">
                {[1, 2, 4, 6, 8, 10].map((size) => (
                  <button
                    key={size}
                    onClick={() => updateCanvasState(activeTabId, { brushSize: size })}
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-xs font-mono transition-all duration-200",
                      "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
                      canvasState.brushSize === size
                        ? "bg-blue-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                    aria-label={`Set brush size to ${size}px`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 font-mono">10px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}