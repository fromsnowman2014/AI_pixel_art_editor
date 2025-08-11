'use client'

import React from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Pencil,
  Eraser,
  Paintbrush,
  Droplets,
  Move,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut
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
  { id: 'eyedropper', name: 'Eyedropper', icon: Droplets, shortcut: 'I' },
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

  if (!activeTabId || !canvasState) {
    return null
  }

  const handleToolChange = (tool: Tool) => {
    updateCanvasState(activeTabId, { tool })
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(32, canvasState.zoom * 1.5)
    updateCanvasState(activeTabId, { zoom: newZoom })
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(1, canvasState.zoom / 1.5)
    updateCanvasState(activeTabId, { zoom: newZoom })
  }

  const handleUndo = () => undo(activeTabId)
  const handleRedo = () => redo(activeTabId)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drawing Tools */}
      <div className="space-y-2">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Button
              key={tool.id}
              variant={canvasState.tool === tool.id ? 'default' : 'outline'}
              size="lg"
              className="w-full justify-start text-left"
              onClick={() => handleToolChange(tool.id)}
              title={`${tool.name} (${tool.shortcut})`}
            >
              <Icon className="mr-3 h-5 w-5" />
              <span className="flex-1">{tool.name}</span>
              <span className="text-xs text-gray-500">{tool.shortcut}</span>
            </Button>
          )
        })}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="mb-2 text-xs font-medium text-gray-600">ACTIONS</div>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleUndo}
            disabled={!activeTab?.historyIndex || activeTab.historyIndex <= 0}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Undo
            <span className="ml-auto text-xs text-gray-500">⌘Z</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleRedo}
            disabled={
              !activeTab?.history || 
              activeTab.historyIndex >= activeTab.history.length - 1
            }
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Redo
            <span className="ml-auto text-xs text-gray-500">⌘⇧Z</span>
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="mb-2 text-xs font-medium text-gray-600">ZOOM</div>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleZoomIn}
            disabled={canvasState.zoom >= 32}
          >
            <ZoomIn className="mr-2 h-4 w-4" />
            Zoom In
            <span className="ml-auto text-xs text-gray-500">+</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleZoomOut}
            disabled={canvasState.zoom <= 1}
          >
            <ZoomOut className="mr-2 h-4 w-4" />
            Zoom Out
            <span className="ml-auto text-xs text-gray-500">-</span>
          </Button>
        </div>
        
        <div className="mt-2 text-center text-xs text-gray-500">
          Current: {canvasState.zoom.toFixed(1)}x
        </div>
      </div>

      {/* Brush Size (for future implementation) */}
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