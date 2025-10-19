'use client'

import { useState, useEffect } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { Wand2, Square, Circle } from 'lucide-react'

export type SelectionToolType = 'magic-wand' | 'rectangle' | 'circle'

interface ToolOption {
  id: SelectionToolType
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut: string
  description: string
}

const TOOL_OPTIONS: ToolOption[] = [
  {
    id: 'magic-wand',
    label: 'Magic Wand',
    icon: Wand2,
    shortcut: 'W',
    description: 'Select connected pixels of similar color'
  },
  {
    id: 'rectangle',
    label: 'Rectangle Select',
    icon: Square,
    shortcut: 'M',
    description: 'Select rectangular area (Shift: square)'
  },
  {
    id: 'circle',
    label: 'Circle Select',
    icon: Circle,
    shortcut: 'O',
    description: 'Select circular area (Shift: perfect circle)'
  },
]

export function SelectionToolGroup() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { activeTabId, getActiveTab, updateCanvasState } = useProjectStore()

  const activeTab = getActiveTab()
  const canvasState = activeTab?.canvasState

  // Get current selection tool type (default to magic-wand)
  const currentToolType = (canvasState?.selectionToolType || 'magic-wand') as SelectionToolType
  const isSelectionToolActive = canvasState?.tool === 'magic-wand'

  const handleLongPress = () => {
    setIsMenuOpen(true)
  }

  const handleClick = () => {
    // Short click: activate the current selection tool
    if (!activeTabId || !canvasState) return
    updateCanvasState(activeTabId, { tool: 'magic-wand' })
  }

  const handleSelectTool = (toolId: SelectionToolType) => {
    if (!activeTabId) return

    // Update selection tool type and activate magic-wand tool
    updateCanvasState(activeTabId, {
      selectionToolType: toolId,
      tool: 'magic-wand' // Use magic-wand as the base tool ID
    })
    setIsMenuOpen(false)

    // Save to localStorage
    localStorage.setItem('lastSelectionTool', toolId)
  }

  // Load last selection tool from localStorage on mount
  useEffect(() => {
    const lastTool = localStorage.getItem('lastSelectionTool') as SelectionToolType
    if (lastTool && activeTabId && TOOL_OPTIONS.find(t => t.id === lastTool)) {
      updateCanvasState(activeTabId, { selectionToolType: lastTool })
    }
  }, [activeTabId, updateCanvasState])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = e.key.toLowerCase()
      const tool = TOOL_OPTIONS.find(t => t.shortcut.toLowerCase() === key)

      if (tool && activeTabId) {
        e.preventDefault()
        handleSelectTool(tool.id)
      }

      // ESC to close menu
      if (key === 'escape' && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, isMenuOpen])

  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    delay: 500,
  })

  if (!activeTabId || !canvasState) {
    return null
  }

  const currentTool = TOOL_OPTIONS.find(t => t.id === currentToolType) || TOOL_OPTIONS[0]!
  const CurrentIcon = currentTool.icon

  return (
    <div className="relative">
      <Tooltip
        content={`${currentTool.label} - ${currentTool.description} (Press ${currentTool.shortcut} or long-press for more)`}
        side="right"
      >
        <Button
          {...longPressHandlers}
          variant={isSelectionToolActive ? 'default' : 'outline'}
          size="icon"
          className={cn(
            "relative w-11 h-11 lg:w-12 lg:h-12 rounded-lg transition-all duration-200",
            "border-2 shadow-sm hover:shadow-lg transform hover:scale-105 active:scale-95",
            "focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-1",
            "group",
            isSelectionToolActive
              ? "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-500 shadow-lg"
              : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:text-gray-900"
          )}
          aria-label={`Selection tools - ${currentTool.label} selected (keyboard shortcut: ${currentTool.shortcut})`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-pressed={isSelectionToolActive}
          role="button"
          tabIndex={0}
        >
          <CurrentIcon
            className={cn(
              "h-4 w-4 lg:h-5 lg:w-5 transition-all duration-200",
              "group-hover:scale-110",
              isSelectionToolActive
                ? "text-white drop-shadow-sm"
                : "text-gray-600 group-hover:text-gray-900"
            )}
            aria-hidden="true"
          />

          {/* Multi-tool indicator badge */}
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
              isSelectionToolActive
                ? "bg-white text-blue-600 shadow-md"
                : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
            )}
            style={{ fontSize: '0.6rem' }}
            aria-hidden="true"
          >
            {currentTool.shortcut}
          </span>
        </Button>
      </Tooltip>

      {/* Desktop: Popup Menu */}
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
            aria-label="Selection tool options"
            className={cn(
              "absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border-2 border-gray-200 z-20 py-2",
              "animate-in fade-in slide-in-from-top-2 duration-200"
            )}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Selection Tools
              </p>
            </div>

            {TOOL_OPTIONS.map((tool) => {
              const Icon = tool.icon
              const isActive = currentToolType === tool.id

              return (
                <button
                  key={tool.id}
                  role="menuitem"
                  aria-current={isActive ? 'true' : 'false'}
                  onClick={() => handleSelectTool(tool.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3",
                    "transition-colors duration-150 focus:outline-none focus:bg-blue-50",
                    "border-l-4",
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-blue-500 font-medium'
                      : 'border-transparent text-gray-700 hover:border-blue-200'
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-500"
                  )} />

                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "text-sm font-medium",
                      isActive ? "text-blue-700" : "text-gray-900"
                    )}>
                      {tool.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {tool.description}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
                      {tool.shortcut}
                    </kbd>
                    {isActive && (
                      <span className="text-blue-600 text-lg">✓</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
