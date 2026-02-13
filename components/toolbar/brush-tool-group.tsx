'use client'

import { useState, useEffect, useCallback } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import { Square, Circle } from 'lucide-react'

const SNAP_POINTS = [1, 2, 4, 8, 16, 32, 64] as const

interface BrushToolGroupProps {
  toolId: 'pencil' | 'eraser'
  toolName: string
  toolDescription: string
  toolShortcut: string
  icon: React.ComponentType<{ className?: string }>
}

function getSnapIndex(brushSize: number): number {
  const idx = SNAP_POINTS.indexOf(brushSize as typeof SNAP_POINTS[number])
  if (idx >= 0) return idx
  // Find closest snap point
  return Math.max(0, SNAP_POINTS.findIndex(s => s >= brushSize))
}

export function BrushToolGroup({
  toolId,
  toolName,
  toolDescription,
  toolShortcut,
  icon: Icon,
}: BrushToolGroupProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { activeTabId, getActiveTab, updateCanvasState } = useProjectStore()

  const activeTab = getActiveTab()
  const canvasState = activeTab?.canvasState
  const isActive = canvasState?.tool === toolId
  const brushSize = canvasState?.brushSize || 1
  const brushShape = canvasState?.brushShape || 'square'

  // Persist brush settings to localStorage
  const persistSettings = useCallback((settings: { brushSize: number; brushShape: 'square' | 'circle' }) => {
    try {
      localStorage.setItem('brushSettings', JSON.stringify(settings))
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Load brush settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('brushSettings')
      if (saved && activeTabId) {
        const settings = JSON.parse(saved)
        if (settings.brushSize && settings.brushShape) {
          updateCanvasState(activeTabId, {
            brushSize: settings.brushSize,
            brushShape: settings.brushShape,
          })
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [activeTabId, updateCanvasState])

  const handleLongPress = useCallback(() => {
    setIsMenuOpen(true)
  }, [])

  const handleClick = useCallback(() => {
    if (!activeTabId || !canvasState) return
    updateCanvasState(activeTabId, { tool: toolId })
  }, [activeTabId, canvasState, toolId, updateCanvasState])

  const handleSizeChange = useCallback((index: number) => {
    if (!activeTabId) return
    const newSize = SNAP_POINTS[index] ?? 1
    updateCanvasState(activeTabId, { brushSize: newSize })
    persistSettings({ brushSize: newSize, brushShape })
  }, [activeTabId, brushShape, updateCanvasState, persistSettings])

  const handleShapeChange = useCallback((shape: 'square' | 'circle') => {
    if (!activeTabId) return
    updateCanvasState(activeTabId, { brushShape: shape })
    persistSettings({ brushSize, brushShape: shape })
  }, [activeTabId, brushSize, updateCanvasState, persistSettings])

  // Keyboard shortcuts: [ ] for size, Escape to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key.toLowerCase()

      // Tool activation shortcut
      if (key === toolShortcut.toLowerCase() && activeTabId) {
        e.preventDefault()
        updateCanvasState(activeTabId, { tool: toolId })
        return
      }

      // Brush size shortcuts (only when this tool is active)
      if (canvasState?.tool === toolId) {
        if (e.key === '[') {
          e.preventDefault()
          const currentIdx = getSnapIndex(brushSize)
          if (currentIdx > 0) handleSizeChange(currentIdx - 1)
        } else if (e.key === ']') {
          e.preventDefault()
          const currentIdx = getSnapIndex(brushSize)
          if (currentIdx < SNAP_POINTS.length - 1) handleSizeChange(currentIdx + 1)
        }
      }

      // ESC to close menu
      if (key === 'escape' && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, toolId, toolShortcut, canvasState?.tool, brushSize, isMenuOpen, handleSizeChange, updateCanvasState])

  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    delay: 500,
  })

  if (!activeTabId || !canvasState) return null

  const snapIndex = getSnapIndex(brushSize)

  return (
    <div className="relative">
      <Tooltip
        content={`${toolName} - ${toolDescription} (Press ${toolShortcut} or long-press for brush settings)`}
        side="right"
      >
        <Button
          {...longPressHandlers}
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
          aria-label={`${toolName} tool - brush settings available (keyboard shortcut: ${toolShortcut})`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
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

          {/* Multi-tool indicator badge (blue "+") */}
          <span
            className={cn(
              "absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 rounded-full",
              "flex items-center justify-center text-white text-xs font-bold",
              "transition-all duration-200 pointer-events-none shadow-md",
              "bg-gradient-to-br from-blue-500 to-blue-600"
            )}
            style={{ fontSize: '0.6rem' }}
            aria-hidden="true"
          >
            +
          </span>

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
            {toolShortcut}
          </span>
        </Button>
      </Tooltip>

      {/* Popover Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu */}
          <div
            role="menu"
            aria-label={`${toolName} brush settings`}
            className={cn(
              "absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border-2 border-gray-200 z-20",
              "animate-popover-bounce-in"
            )}
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {toolName} Settings
              </p>
            </div>

            {/* Size Slider Section */}
            <div className="px-4 py-3 space-y-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Size</span>
                <span className="text-sm font-bold text-blue-600">{brushSize}px</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Small dot indicator */}
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />

                <Slider
                  min={0}
                  max={6}
                  step={1}
                  value={[snapIndex]}
                  onValueChange={([idx]) => {
                    if (idx !== undefined) handleSizeChange(idx)
                  }}
                />

                {/* Large dot indicator */}
                <div className="w-3.5 h-3.5 rounded-full bg-gray-400 flex-shrink-0" />
              </div>

              {/* Snap point labels */}
              <div className="flex justify-between px-4 text-xxs text-gray-400">
                {SNAP_POINTS.map(s => (
                  <span
                    key={s}
                    className={cn(
                      "transition-colors",
                      s === brushSize ? "text-blue-600 font-bold" : ""
                    )}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Shape Selection Section */}
            <div className="px-4 py-3 space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Shape</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  role="menuitem"
                  onClick={() => handleShapeChange('square')}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-150",
                    brushShape === 'square'
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <Square className={cn(
                    "h-6 w-6",
                    brushShape === 'square' ? "text-blue-600" : "text-gray-500"
                  )} />
                  <span className="text-xs font-medium">Block Mode</span>
                </button>

                <button
                  role="menuitem"
                  onClick={() => handleShapeChange('circle')}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-150",
                    brushShape === 'circle'
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <Circle className={cn(
                    "h-6 w-6",
                    brushShape === 'circle' ? "text-blue-600" : "text-gray-500"
                  )} />
                  <span className="text-xs font-medium">Marble Mode</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
