'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ColorPreviewProps {
  colors: string[]
  maxColors?: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  className?: string
  onColorClick?: (color: string, index: number) => void
}

export function ColorPreview({
  colors,
  maxColors = 8,
  size = 'md',
  showCount = false,
  className,
  onColorClick
}: ColorPreviewProps) {
  const visibleColors = colors.slice(0, maxColors)
  const remainingCount = Math.max(0, colors.length - maxColors)
  
  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  }

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-0.5',
    lg: 'gap-1'
  }

  if (colors.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className={cn(
          "border-2 border-dashed border-gray-300 rounded-sm",
          sizeClasses[size]
        )} />
        {showCount && (
          <span className="text-xs text-gray-400 ml-1">0</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center", gapClasses[size], className)}>
      {visibleColors.map((color, index) => (
        <button
          key={`${color}-${index}`}
          onClick={() => onColorClick?.(color, index)}
          className={cn(
            "border border-gray-300 rounded-sm flex-shrink-0 transition-transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-1 focus:ring-blue-500",
            sizeClasses[size],
            onColorClick && "cursor-pointer"
          )}
          style={{ backgroundColor: color }}
          title={color.toUpperCase()}
          type="button"
          disabled={!onColorClick}
        />
      ))}
      
      {remainingCount > 0 && (
        <div className="text-xs text-gray-500 ml-1 font-medium">
          +{remainingCount}
        </div>
      )}
      
      {showCount && (
        <div className="text-xs text-gray-500 ml-2">
          {colors.length} color{colors.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

// Specialized component for palette comparison
interface PaletteComparisonProps {
  originalColors?: string[]
  targetColors: string[]
  title?: string
  className?: string
}

export function PaletteComparison({
  originalColors,
  targetColors,
  title,
  className
}: PaletteComparisonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <div className="text-xs font-medium text-gray-700">{title}</div>
      )}
      
      {originalColors && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-12">Original:</span>
          <ColorPreview colors={originalColors} size="sm" />
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-12">Target:</span>
        <ColorPreview colors={targetColors} size="sm" showCount />
      </div>
    </div>
  )
}

// Quick palette generator component
interface QuickPaletteProps {
  onPaletteSelect: (colors: string[]) => void
  className?: string
}

export function QuickPalette({ onPaletteSelect, className }: QuickPaletteProps) {
  const presets = [
    {
      name: 'Retro',
      colors: ['#000000', '#FFFFFF', '#880000', '#AAFFEE', '#CC44CC', '#00CC55']
    },
    {
      name: 'Pastel',
      colors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFBA', '#BAE1FF', '#FFBAF5']
    },
    {
      name: 'Mono',
      colors: ['#000000', '#404040', '#808080', '#C0C0C0', '#E0E0E0', '#FFFFFF']
    },
    {
      name: 'Earthy',
      colors: ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#FFDAB9']
    }
  ]

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {presets.map((preset) => (
        <button
          key={preset.name}
          onClick={() => onPaletteSelect(preset.colors)}
          className="p-2 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-left"
          type="button"
        >
          <div className="text-xs font-medium text-gray-900 mb-1">
            {preset.name}
          </div>
          <ColorPreview colors={preset.colors} size="sm" />
        </button>
      ))}
    </div>
  )
}