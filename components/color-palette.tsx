'use client'

import React, { useState } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, Palette, Pipette } from 'lucide-react'
import { AdvancedColorPicker } from './advanced-color-picker'

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
  const [showAdvancedPicker, setShowAdvancedPicker] = useState(false)
  const [customColor, setCustomColor] = useState('#000000')

  const activeTab = getActiveTab()
  const project = activeTab?.project
  const canvasState = activeTab?.canvasState

  if (!activeTabId || !project || !canvasState) {
    return null
  }


  const handleColorSelect = (color: string) => {
    updateCanvasState(activeTabId, { color })
  }

  const handleAddCustomColor = () => {
    if (project.palette.includes(customColor)) {
      return // Color already exists
    }

    const newPalette = [...project.palette, customColor]
    updateProject(activeTabId, { palette: newPalette })
    updateCanvasState(activeTabId, { color: customColor })
    setShowColorPicker(false)
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

  return (
    <div className={cn('space-y-3', className)}>
      {/* Current Color Display - Compact */}
      <div className="rounded-lg border border-gray-200 p-2">
        <div className="mb-1 text-xs font-medium text-gray-600">CURRENT COLOR</div>
        <div className="flex items-center space-x-2">
          <div
            className="h-8 w-8 rounded border-2 border-gray-300 shadow-sm flex-shrink-0"
            style={{ backgroundColor: canvasState.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-800 truncate">
              {canvasState.color.toUpperCase()}
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
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedPicker(true)}
              title="Advanced Color Picker"
              className="h-6 w-6 p-0"
            >
              <Pipette className="h-3 w-3" />
            </Button>
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
        </div>

        {/* Scrollable color grid for 24+ colors */}
        <div className={cn(
          "grid grid-cols-6 gap-2",
          project.palette.length > 24 && "max-h-64 overflow-y-auto pr-1"
        )}>
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

      {/* Palette Presets - No Scroll */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <div className="mb-3 text-xs font-medium text-gray-600">
          QUICK PALETTES
        </div>
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-9 px-3"
            onClick={() => {
              const basicPalette = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00']
              updateProject(activeTabId, { palette: basicPalette.slice(0, project.colorLimit) })
            }}
          >
            <Palette className="mr-2 h-3 w-3" />
            <span className="flex-1 text-left">Basic Colors</span>
            <div className="flex space-x-1">
              {['#000000', '#FFFFFF', '#FF0000', '#00FF00'].map((color, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-sm border border-gray-300"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-9 px-3"
            onClick={() => {
              const retroPalette = ['#000000', '#FFFFFF', '#880000', '#AAFFEE', '#CC44CC', '#00CC55', '#0000AA', '#EEEE77']
              updateProject(activeTabId, { palette: retroPalette.slice(0, project.colorLimit) })
            }}
          >
            <Palette className="mr-2 h-3 w-3" />
            <span className="flex-1 text-left">Retro Gaming</span>
            <div className="flex space-x-1">
              {['#000000', '#FFFFFF', '#880000', '#AAFFEE'].map((color, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-sm border border-gray-300"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-9 px-3"
            onClick={() => {
              const pastelPalette = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFBA', '#BAE1FF', '#FFBAF5', '#D4BAFF', '#BABAFF']
              updateProject(activeTabId, { palette: pastelPalette.slice(0, project.colorLimit) })
            }}
          >
            <Palette className="mr-2 h-3 w-3" />
            <span className="flex-1 text-left">Pastel Colors</span>
            <div className="flex space-x-1">
              {['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFBA'].map((color, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-sm border border-gray-300"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-9 px-3"
            onClick={() => {
              const earthyPalette = ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#FFDAB9']
              updateProject(activeTabId, { palette: earthyPalette.slice(0, project.colorLimit) })
            }}
          >
            <Palette className="mr-2 h-3 w-3" />
            <span className="flex-1 text-left">Earthy Tones</span>
            <div className="flex space-x-1">
              {['#8B4513', '#D2691E', '#CD853F', '#DEB887'].map((color, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-sm border border-gray-300"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-9 px-3"
            onClick={() => {
              const oceanPalette = ['#000080', '#0000CD', '#4169E1', '#1E90FF', '#87CEEB', '#B0E0E6']
              updateProject(activeTabId, { palette: oceanPalette.slice(0, project.colorLimit) })
            }}
          >
            <Palette className="mr-2 h-3 w-3" />
            <span className="flex-1 text-left">Ocean Blues</span>
            <div className="flex space-x-1">
              {['#000080', '#0000CD', '#4169E1', '#1E90FF'].map((color, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-sm border border-gray-300"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-9 px-3"
            onClick={() => {
              const monochromePalette = ['#000000', '#404040', '#808080', '#C0C0C0', '#E0E0E0', '#FFFFFF']
              updateProject(activeTabId, { palette: monochromePalette.slice(0, project.colorLimit) })
            }}
          >
            <Palette className="mr-2 h-3 w-3" />
            <span className="flex-1 text-left">Monochrome</span>
            <div className="flex space-x-1">
              {['#000000', '#404040', '#808080', '#C0C0C0'].map((color, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-sm border border-gray-300"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Button>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700 mt-3">
        💡 <strong>Tip:</strong> Double-click a color to remove it from the palette. Use <Pipette className="h-3 w-3 inline" /> for advanced color picker.
      </div>

      {/* Advanced Color Picker Modal */}
      {showAdvancedPicker && (
        <AdvancedColorPicker
          color={canvasState.color}
          onChange={(newColor) => {
            // Add to palette if not already present
            if (!project.palette.includes(newColor)) {
              const newPalette = [...project.palette, newColor]
              updateProject(activeTabId, { palette: newPalette })
            }
            // Select the color
            updateCanvasState(activeTabId, { color: newColor })
          }}
          onClose={() => setShowAdvancedPicker(false)}
        />
      )}
    </div>
  )
}