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
      <div className="space-y-2">
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
                className="w-full justify-start text-left"
                onClick={() => handleToolChange(tool.id)}
                aria-label={`${tool.name} tool (keyboard shortcut: ${tool.shortcut})`}
                aria-pressed={isActive}
                role="button"
                tabIndex={0}
              >
                <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
                <span className="flex-1">{tool.name}</span>
                <span className="text-xs text-gray-500" aria-label={`Shortcut: ${tool.shortcut}`}>
                  {tool.shortcut}
                </span>
              </Button>
            </Tooltip>
          )
        })}
      </div>

      {/* Brush Size Control */}
      <div className="border-t border-gray-200 pt-4">
        <div className="mb-2 text-xs font-medium text-gray-600">BRUSH SIZE</div>
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <input
              type="range"
              min="1"
              max="10"
              value={canvasState.brushSize}
              onChange={(e) => 
                updateCanvasState(activeTabId, { brushSize: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>
          <div className="text-xs text-gray-500 w-8 text-right">
            {canvasState.brushSize}px
          </div>
        </div>
      </div>
    </div>
  )
}