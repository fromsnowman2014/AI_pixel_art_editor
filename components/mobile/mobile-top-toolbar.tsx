'use client'

import React from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Settings,
  Palette
} from 'lucide-react'

interface MobileTopToolbarProps {
  className?: string
}

export function MobileTopToolbar({ className }: MobileTopToolbarProps) {
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

  // Check undo/redo availability from active tab state
  const canUndoAction = activeTab ? activeTab.historyIndex > 0 : false
  const canRedoAction = activeTab ? activeTab.historyIndex < activeTab.history.length - 1 : false

  const handleZoomIn = () => {
    const newZoom = Math.min(32, canvasState.zoom * 1.5)
    updateCanvasState(activeTabId, { zoom: newZoom })
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(1, canvasState.zoom / 1.5)
    updateCanvasState(activeTabId, { zoom: newZoom })
  }

  const handleResetView = () => {
    updateCanvasState(activeTabId, { 
      zoom: 4, 
      panX: 0, 
      panY: 0 
    })
  }

  return (
    <div className={cn('border-b border-gray-200 bg-white px-3 py-2', className)}>
      <div className="flex items-center justify-between">
        {/* Left - History controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => undo(activeTabId)}
            disabled={!canUndoAction}
            className="min-h-[36px] min-w-[36px] p-2"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => redo(activeTabId)}
            disabled={!canRedoAction}
            className="min-h-[36px] min-w-[36px] p-2"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Center - Zoom info */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>{Math.round(canvasState.zoom * 100)}%</span>
        </div>

        {/* Right - View controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={canvasState.zoom <= 1}
            className="min-h-[36px] min-w-[36px] p-2"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={canvasState.zoom >= 32}
            className="min-h-[36px] min-w-[36px] p-2"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetView}
            className="min-h-[36px] min-w-[36px] p-2"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}