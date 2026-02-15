'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Minus, X, Square } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

interface SelectionControlsProps {
  selectedPixelCount: number
  onExpand: () => void
  onContract: () => void
  onClear: () => void
  onInvert?: () => void
  disabled?: boolean
}

/**
 * Selection Controls Component
 * Photoshop-style selection modification controls
 * Provides expand, contract, clear, and invert operations
 */
export function SelectionControls({
  selectedPixelCount,
  onExpand,
  onContract,
  onClear,
  onInvert,
  disabled = false,
}: SelectionControlsProps) {
  if (selectedPixelCount === 0) return null

  return (
    <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 transform">
      <div className="flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 shadow-lg">
        {/* Selection info */}
        <div className="flex items-center gap-2 border-r border-gray-300 pr-3">
          <Square className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            {selectedPixelCount.toLocaleString()} px
          </span>
        </div>

        {/* Expand button */}
        <Tooltip content="Expand Selection (Shift++)">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpand}
            disabled={disabled}
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
            aria-label="Expand selection"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </Tooltip>

        {/* Contract button */}
        <Tooltip content="Contract Selection (Shift+-)">
          <Button
            variant="ghost"
            size="sm"
            onClick={onContract}
            disabled={disabled}
            className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
            aria-label="Contract selection"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </Tooltip>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Clear selection button */}
        <Tooltip content="Clear Selection (Esc)">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={disabled}
            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </Tooltip>

        {/* Optional: Invert selection */}
        {onInvert && (
          <>
            <div className="h-6 w-px bg-gray-300" />
            <Tooltip content="Invert Selection (Ctrl+Shift+I)">
              <Button
                variant="ghost"
                size="sm"
                onClick={onInvert}
                disabled={disabled}
                className="h-8 px-3 text-xs hover:bg-purple-50 hover:text-purple-600"
                aria-label="Invert selection"
              >
                Invert
              </Button>
            </Tooltip>
          </>
        )}
      </div>

      {/* Additional info hint */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500">
          Press <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px]">Delete</kbd> to clear pixels
        </p>
      </div>
    </div>
  )
}
