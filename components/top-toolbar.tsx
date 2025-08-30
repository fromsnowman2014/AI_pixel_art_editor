'use client'

import React from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Upload
} from 'lucide-react'
import { ImportModal } from '@/components/import-modal'

interface TopToolbarProps {
  className?: string
}

export function TopToolbar({ className }: TopToolbarProps) {
  const {
    activeTabId,
    getActiveTab,
    updateCanvasState,
    undo,
    redo
  } = useProjectStore()

  const [showImportModal, setShowImportModal] = React.useState(false)

  const activeTab = getActiveTab()

  // Global keyboard shortcuts for undo/redo - Hook MUST be called unconditionally
  React.useEffect(() => {
    if (!activeTab || !activeTabId) return // Guard clause inside useEffect
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        
        if (e.shiftKey) {
          // Ctrl+Shift+Z or Cmd+Shift+Z for redo
          if (activeTabId) {
            redo(activeTabId)
          }
        } else {
          // Ctrl+Z or Cmd+Z for undo
          if (activeTabId) {
            undo(activeTabId)
          }
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        // Ctrl+Y for redo (Windows style)
        e.preventDefault()
        if (activeTabId) {
          redo(activeTabId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, undo, redo, activeTab])

  // Early return after all hooks
  if (!activeTab || !activeTabId) {
    return null
  }

  const canvasState = activeTab.canvasState

  const handleUndo = () => {
    if (activeTabId) {
      undo(activeTabId)
    }
  }

  const handleRedo = () => {
    if (activeTabId) {
      redo(activeTabId)
    }
  }

  const handleZoomIn = () => {
    if (activeTabId) {
      const newZoom = Math.min(32, canvasState.zoom * 1.5)
      updateCanvasState(activeTabId, { zoom: newZoom })
    }
  }

  const handleZoomOut = () => {
    if (activeTabId) {
      const newZoom = Math.max(1, canvasState.zoom / 1.5)
      updateCanvasState(activeTabId, { zoom: newZoom })
    }
  }

  const handleFitToScreen = () => {
    if (activeTabId) {
      // Reset zoom to fit screen optimally (you can customize this logic)
      updateCanvasState(activeTabId, { zoom: 4, panX: 0, panY: 0 })
    }
  }

  const handleResetView = () => {
    if (activeTabId) {
      // Reset to 1x zoom and center view
      updateCanvasState(activeTabId, { zoom: 1, panX: 0, panY: 0 })
    }
  }

  const canUndo = activeTab?.historyIndex && activeTab.historyIndex > 0
  const canRedo = activeTab?.history && activeTab.historyIndex < activeTab.history.length - 1
  const canZoomIn = canvasState.zoom < 32
  const canZoomOut = canvasState.zoom > 1

  const handleImportClick = () => {
    setShowImportModal(true)
  }

  return (
    <>
      {/* Main Toolbar - Responsive Layout */}
      <div className={cn(
        'bg-gradient-to-r from-white via-gray-50 to-white',
        'border-b border-gray-200/70 backdrop-blur-sm shadow-sm',
        className
      )}>
        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between px-6 py-3">
          {/* Left Section - Import & History Actions */}
          <div className="flex items-center space-x-3">
            {/* Import Button - Prominent placement */}
            <Tooltip content="Import Media (Images, GIFs, Videos)" side="bottom">
              <Button
                variant="default"
                size="sm"
                onClick={handleImportClick}
                className={cn(
                  'h-9 px-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
                  'text-white shadow-md hover:shadow-lg transition-all duration-200',
                  'focus:ring-2 focus:ring-blue-400/30 focus:ring-offset-2',
                  'transform hover:scale-105 active:scale-95'
                )}
                aria-label="Import external media as frames"
              >
                <Upload className="h-4 w-4 mr-2" />
                <span className="font-medium">Import</span>
              </Button>
            </Tooltip>
            
            {/* History Controls */}
            <div className="flex items-center rounded-lg bg-white/60 p-1 shadow-sm ring-1 ring-gray-200/50">
              <Tooltip content="Undo (⌘Z)" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={cn(
                    'h-8 w-8 p-0 transition-all duration-200',
                    'hover:bg-blue-50 hover:text-blue-600 hover:shadow-sm',
                    'disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-current',
                    'focus:ring-2 focus:ring-blue-400/30 focus:ring-offset-1'
                  )}
                  aria-label="Undo last action (Command+Z)"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Redo (⌘⇧Z)" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={cn(
                    'h-8 w-8 p-0 transition-all duration-200',
                    'hover:bg-blue-50 hover:text-blue-600 hover:shadow-sm',
                    'disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-current',
                    'focus:ring-2 focus:ring-blue-400/30 focus:ring-offset-1'
                  )}
                  aria-label="Redo last undone action (Command+Shift+Z)"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Center Section - Zoom Level Display */}
          <div className="flex items-center space-x-3">
            <div className="rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-3 py-1.5 text-sm font-medium text-gray-700">
              <span className="text-xs text-gray-500 mr-1">Zoom:</span>
              <span className="font-mono font-semibold text-indigo-600">
                {canvasState.zoom.toFixed(1)}×
              </span>
            </div>
          </div>

          {/* Right Section - Zoom Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center rounded-lg bg-white/60 p-1 shadow-sm ring-1 ring-gray-200/50">
              <Tooltip content="Zoom Out (−)" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={!canZoomOut}
                  className={cn(
                    'h-8 w-8 p-0 transition-all duration-200',
                    'hover:bg-emerald-50 hover:text-emerald-600 hover:shadow-sm',
                    'disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-current',
                    'focus:ring-2 focus:ring-emerald-400/30 focus:ring-offset-1'
                  )}
                  aria-label={`Zoom out (Minus key) - Current: ${canvasState.zoom.toFixed(1)}x`}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Zoom In (+)" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={!canZoomIn}
                  className={cn(
                    'h-8 w-8 p-0 transition-all duration-200',
                    'hover:bg-emerald-50 hover:text-emerald-600 hover:shadow-sm',
                    'disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-current',
                    'focus:ring-2 focus:ring-emerald-400/30 focus:ring-offset-1'
                  )}
                  aria-label={`Zoom in (Plus key) - Current: ${canvasState.zoom.toFixed(1)}x`}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>

            {/* Additional Zoom Shortcuts */}
            <div className="flex items-center rounded-lg bg-white/60 p-1 shadow-sm ring-1 ring-gray-200/50">
              <Tooltip content="Fit to Screen" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFitToScreen}
                  className={cn(
                    'h-8 w-8 p-0 transition-all duration-200',
                    'hover:bg-purple-50 hover:text-purple-600 hover:shadow-sm',
                    'focus:ring-2 focus:ring-purple-400/30 focus:ring-offset-1'
                  )}
                  aria-label="Fit canvas to screen (4x zoom)"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Reset View (1×)" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetView}
                  className={cn(
                    'h-8 w-8 p-0 transition-all duration-200',
                    'hover:bg-purple-50 hover:text-purple-600 hover:shadow-sm',
                    'focus:ring-2 focus:ring-purple-400/30 focus:ring-offset-1'
                  )}
                  aria-label="Reset view to 1x zoom and center"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Mobile Layout - Stacked and Compact */}
        <div className="sm:hidden px-4 py-2 space-y-2">
          {/* Top Row - Import and Zoom Level */}
          <div className="flex items-center justify-between">
            <Tooltip content="Import Media" side="bottom">
              <Button
                variant="default"
                size="sm"
                onClick={handleImportClick}
                className={cn(
                  'h-8 px-3 bg-gradient-to-r from-blue-500 to-purple-600',
                  'text-white shadow-md text-sm font-medium'
                )}
              >
                <Upload className="h-3 w-3 mr-1.5" />
                Import
              </Button>
            </Tooltip>
            
            <div className="rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-3 py-1 text-sm font-medium text-gray-700">
              <span className="text-xs text-gray-500 mr-1">Zoom:</span>
              <span className="font-mono font-semibold text-indigo-600 text-sm">
                {canvasState.zoom.toFixed(1)}×
              </span>
            </div>
          </div>

          {/* Bottom Row - History and Zoom Controls */}
          <div className="flex items-center justify-between">
            {/* History Controls */}
            <div className="flex items-center rounded-lg bg-white/60 p-1 shadow-sm ring-1 ring-gray-200/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={!canUndo}
                className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={!canRedo}
                className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1">
              <div className="flex items-center rounded-lg bg-white/60 p-1 shadow-sm ring-1 ring-gray-200/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={!canZoomOut}
                  className="h-7 w-7 p-0 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={!canZoomIn}
                  className="h-7 w-7 p-0 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              <div className="flex items-center rounded-lg bg-white/60 p-1 shadow-sm ring-1 ring-gray-200/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFitToScreen}
                  className="h-7 w-7 p-0 hover:bg-purple-50 hover:text-purple-600"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetView}
                  className="h-7 w-7 p-0 hover:bg-purple-50 hover:text-purple-600"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
      />
    </>
  )
}