'use client'

import React, { useState } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, Palette, X } from 'lucide-react'

interface MobileColorPaletteProps {
  className?: string
}

export function MobileColorPalette({ className }: MobileColorPaletteProps) {
  const {
    activeTabId,
    getActiveTab,
    updateCanvasState,
    updateProject,
  } = useProjectStore()

  const [isOpen, setIsOpen] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customColor, setCustomColor] = useState('#000000')

  const activeTab = getActiveTab()
  const project = activeTab?.project
  const canvasState = activeTab?.canvasState

  if (!activeTabId || !project || !canvasState) {
    return null
  }

  const handleColorSelect = (color: string) => {
    updateCanvasState(activeTabId, { color })
    setIsOpen(false) // Close palette after selection on mobile
  }

  const handleAddCustomColor = () => {
    if (project.palette.includes(customColor)) {
      return // Color already exists
    }

    const newPalette = [...project.palette, customColor]
    updateProject(activeTabId, { palette: newPalette })
    updateCanvasState(activeTabId, { color: customColor })
    setShowColorPicker(false)
    setIsOpen(false)
  }

  const handleRemoveColor = (colorToRemove: string) => {
    if (project.palette.length <= 2) {
      return // Don't allow removing if only 2 colors left
    }

    const newPalette = project.palette.filter(color => color !== colorToRemove)
    updateProject(activeTabId, { palette: newPalette })

    // If removed color was selected, switch to first color
    if (canvasState.color === colorToRemove) {
      updateCanvasState(activeTabId, { color: newPalette[0] })
    }
  }

  // Color palette trigger button (always visible)
  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsOpen(!isOpen)}
      className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg bg-white border-2 border-gray-200"
    >
      <div className="flex items-center justify-center">
        <div
          className="h-6 w-6 rounded-full border-2 border-gray-300"
          style={{ backgroundColor: canvasState.color }}
        />
      </div>
    </Button>
  )

  // Mobile modal overlay
  if (isOpen) {
    return (
      <>
        {trigger}
        
        {/* Modal overlay */}
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50">
          <div className="w-full max-h-[70vh] bg-white rounded-t-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Color Palette</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Current Color Display */}
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 text-sm font-medium text-gray-600">CURRENT COLOR</div>
                <div className="flex items-center space-x-3">
                  <div
                    className="h-12 w-12 rounded border-2 border-gray-300 shadow-sm"
                    style={{ backgroundColor: canvasState.color }}
                  />
                  <div className="flex-1">
                    <div className="text-lg font-medium text-gray-800">
                      {canvasState.color.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Grid - Larger touch targets */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    PALETTE ({project.palette.length}/{project.colorLimit})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    disabled={project.palette.length >= project.colorLimit}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {project.palette.map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      className={cn(
                        'h-12 w-12 rounded border-2 transition-all hover:scale-105 active:scale-95',
                        canvasState.color === color
                          ? 'border-blue-500 shadow-md ring-2 ring-blue-200'
                          : 'border-gray-300'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(color)}
                      onDoubleClick={() => handleRemoveColor(color)}
                      title={`${color.toUpperCase()} - Tap to select, double-tap to remove`}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color Picker */}
              {showColorPicker && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 text-sm font-medium text-gray-600">ADD CUSTOM COLOR</div>
                  <div className="space-y-4">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="h-12 w-full rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="#000000"
                      className="w-full rounded border border-gray-300 px-3 py-3 text-sm"
                    />
                    <div className="flex space-x-3">
                      <Button
                        size="sm"
                        onClick={handleAddCustomColor}
                        disabled={project.palette.includes(customColor)}
                        className="flex-1 h-10"
                      >
                        Add Color
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowColorPicker(false)}
                        className="flex-1 h-10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Palettes */}
              <div className="border-t border-gray-200 pt-4">
                <div className="mb-3 text-sm font-medium text-gray-600">
                  QUICK PALETTES
                </div>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm h-12 px-3"
                    onClick={() => {
                      const basicPalette = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00']
                      updateProject(activeTabId, { palette: basicPalette.slice(0, project.colorLimit) })
                      setIsOpen(false)
                    }}
                  >
                    <Palette className="mr-3 h-4 w-4" />
                    <span className="flex-1 text-left">Basic Colors</span>
                    <div className="flex space-x-1">
                      {['#000000', '#FFFFFF', '#FF0000', '#00FF00'].map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm h-12 px-3"
                    onClick={() => {
                      const retroPalette = ['#000000', '#FFFFFF', '#880000', '#AAFFEE', '#CC44CC', '#00CC55', '#0000AA', '#EEEE77']
                      updateProject(activeTabId, { palette: retroPalette.slice(0, project.colorLimit) })
                      setIsOpen(false)
                    }}
                  >
                    <Palette className="mr-3 h-4 w-4" />
                    <span className="flex-1 text-left">Retro Gaming</span>
                    <div className="flex space-x-1">
                      {['#000000', '#FFFFFF', '#880000', '#AAFFEE'].map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return trigger
}