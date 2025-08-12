'use client'

import React, { useState } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, Palette } from 'lucide-react'

interface ColorPaletteProps {
  className?: string
}

export function ColorPalette({ className }: ColorPaletteProps) {
  const {
    activeTabId,
    getActiveTab,
    updateCanvasState,
    updateProject,
  } = useProjectStore()

  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customColor, setCustomColor] = useState('#000000')

  const activeTab = getActiveTab()
  const project = activeTab?.project
  const canvasState = activeTab?.canvasState

  if (!activeTabId || !project || !canvasState) {
    return null
  }

  // Debug logging utility
  const DEBUG_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')
  const debugLog = (category: string, message: string, data?: any) => {
    if (DEBUG_MODE) {
      const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
      console.log(`[${timestamp}] 🎨 ColorPalette [${category}]:`, message, data || '')
    }
  }

  const handleColorSelect = (color: string) => {
    debugLog('COLOR_SELECT', `Color changed from ${canvasState.color} to ${color}`, {
      previousColor: canvasState.color,
      newColor: color,
      activeTabId: activeTabId
    })
    updateCanvasState(activeTabId, { color })
  }

  const handleAddCustomColor = () => {
    if (project.palette.includes(customColor)) {
      debugLog('ADD_COLOR_DUPLICATE', `Color ${customColor} already exists in palette`, {
        customColor: customColor,
        paletteLength: project.palette.length
      })
      return // Color already exists
    }

    debugLog('ADD_COLOR', `Adding custom color ${customColor}`, {
      customColor: customColor,
      oldPaletteLength: project.palette.length,
      newPaletteLength: project.palette.length + 1,
      colorLimit: project.colorLimit
    })

    const newPalette = [...project.palette, customColor]
    updateProject(activeTabId, { palette: newPalette })
    updateCanvasState(activeTabId, { color: customColor })
    setShowColorPicker(false)
  }

  const handleRemoveColor = (colorToRemove: string) => {
    if (project.palette.length <= 2) {
      debugLog('REMOVE_COLOR_BLOCKED', `Cannot remove color - only ${project.palette.length} colors left`, {
        colorToRemove: colorToRemove,
        currentPaletteLength: project.palette.length
      })
      return // Don't allow removing if only 2 colors left
    }

    debugLog('REMOVE_COLOR', `Removing color ${colorToRemove}`, {
      colorToRemove: colorToRemove,
      wasSelected: canvasState.color === colorToRemove,
      oldPaletteLength: project.palette.length,
      newPaletteLength: project.palette.length - 1
    })

    const newPalette = project.palette.filter(color => color !== colorToRemove)
    updateProject(activeTabId, { palette: newPalette })

    // If removed color was selected, switch to first color
    if (canvasState.color === colorToRemove) {
      debugLog('REMOVE_COLOR_SWITCH', `Switching color from removed ${colorToRemove} to ${newPalette[0]}`, {
        oldColor: colorToRemove,
        newColor: newPalette[0]
      })
      updateCanvasState(activeTabId, { color: newPalette[0] })
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Current Color Display */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 text-xs font-medium text-gray-600">CURRENT COLOR</div>
        <div className="flex items-center space-x-3">
          <div
            className="h-12 w-12 rounded border-2 border-gray-300 shadow-sm"
            style={{ backgroundColor: canvasState.color }}
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">
              {canvasState.color.toUpperCase()}
            </div>
            <div className="text-xs text-gray-500">
              Click colors below to change
            </div>
          </div>
        </div>
      </div>

      {/* Color Grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            PALETTE ({project.palette.length}/{project.colorLimit})
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowColorPicker(!showColorPicker)}
            disabled={project.palette.length >= project.colorLimit}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {project.palette.map((color, index) => (
            <button
              key={`${color}-${index}`}
              className={cn(
                'h-8 w-8 rounded border-2 transition-all hover:scale-110',
                canvasState.color === color
                  ? 'border-blue-500 shadow-md ring-2 ring-blue-200'
                  : 'border-gray-300 hover:border-gray-400'
              )}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              onDoubleClick={() => handleRemoveColor(color)}
              title={`${color.toUpperCase()} - Click to select, double-click to remove`}
            />
          ))}
        </div>
      </div>

      {/* Custom Color Picker */}
      {showColorPicker && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 text-xs font-medium text-gray-600">ADD CUSTOM COLOR</div>
          <div className="space-y-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="h-10 w-full rounded border border-gray-300"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#000000"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={handleAddCustomColor}
                disabled={project.palette.includes(customColor)}
                className="flex-1"
              >
                Add Color
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColorPicker(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Palette Presets */}
      <div className="border-t border-gray-200 pt-3">
        <div className="mb-2 text-xs font-medium text-gray-600">QUICK PALETTES</div>
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => {
              const basicPalette = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00']
              updateProject(activeTabId, { palette: basicPalette.slice(0, project.colorLimit) })
            }}
          >
            <Palette className="mr-2 h-3 w-3" />
            Basic Colors
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => {
              const retroPalette = ['#000000', '#FFFFFF', '#880000', '#AAFFEE', '#CC44CC', '#00CC55', '#0000AA', '#EEEE77']
              updateProject(activeTabId, { palette: retroPalette.slice(0, project.colorLimit) })
            }}
          >
            <Palette className="mr-2 h-3 w-3" />
            Retro Gaming
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => {
              const pastelPalette = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFBA', '#BAE1FF', '#FFBAF5', '#D4BAFF', '#BABAFFF']
              updateProject(activeTabId, { palette: pastelPalette.slice(0, project.colorLimit) })
            }}
          >
            <Palette className="mr-2 h-3 w-3" />
            Pastel Colors
          </Button>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded bg-blue-50 p-2 text-xs text-blue-700">
        💡 <strong>Tip:</strong> Double-click a color to remove it from the palette
      </div>
    </div>
  )
}