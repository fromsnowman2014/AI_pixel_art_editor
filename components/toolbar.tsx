'use client'

import React from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Pencil,
  Eraser,
  Paintbrush,
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
  { id: 'fill', name: 'Paint Bucket', icon: Paintbrush, shortcut: 'B' },
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
      {/* Drawing Tools */}
      <div className="space-y-1">
        {tools.map((tool) => {
          const Icon = tool.icon
          const isActive = canvasState.tool === tool.id
          return (
            <Tooltip
              key={tool.id}
              content={`${tool.name} (Press ${tool.shortcut})`}
              side="right"
            >
              <Button
                variant={isActive ? 'default' : 'outline'}
                size="lg"
                className={cn(
                  "w-full h-12 justify-start text-left font-medium transition-all duration-200",
                  "border-2 rounded-lg shadow-sm hover:shadow-md",
                  "focus:ring-2 focus:ring-blue-400/30 focus:ring-offset-2",
                  isActive
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md"
                    : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
                )}
                onClick={() => handleToolChange(tool.id)}
                aria-label={`${tool.name} tool (keyboard shortcut: ${tool.shortcut})`}
                aria-pressed={isActive}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <Icon 
                      className={cn(
                        "mr-3 h-5 w-5 transition-colors",
                        isActive ? "text-white" : "text-gray-600"
                      )} 
                      aria-hidden="true" 
                    />
                    <span className={cn(
                      "text-sm font-medium",
                      isActive ? "text-white" : "text-gray-700"
                    )}>
                      {tool.name}
                    </span>
                  </div>
                  <span 
                    className={cn(
                      "text-xs font-mono px-1.5 py-0.5 rounded bg-opacity-20",
                      isActive 
                        ? "text-blue-100 bg-white" 
                        : "text-gray-500 bg-gray-200"
                    )}
                    aria-label={`Shortcut: ${tool.shortcut}`}
                  >
                    {tool.shortcut}
                  </span>
                </div>
              </Button>
            </Tooltip>
          )
        })}
      </div>

      {/* Brush Size Control */}
      <div className="border-t border-gray-200 pt-4">
        <div className="mb-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">BRUSH SIZE</div>
        <div className="bg-white rounded-lg border-2 border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Size</span>
            <span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded text-gray-600 font-semibold">
              {canvasState.brushSize}px
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={canvasState.brushSize}
            onChange={(e) => 
              updateCanvasState(activeTabId, { brushSize: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 custom-slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(canvasState.brushSize - 1) * 11.11}%, #e5e7eb ${(canvasState.brushSize - 1) * 11.11}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      </div>
    </div>
  )
}