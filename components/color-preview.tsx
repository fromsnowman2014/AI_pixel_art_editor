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