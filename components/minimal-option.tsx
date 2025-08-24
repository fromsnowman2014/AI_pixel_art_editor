'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface MinimalOptionProps {
  emoji: string
  label: string
  tooltip: string
  colorPreview?: string[]
  recommended?: boolean
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function MinimalOption({
  emoji,
  label,
  tooltip,
  colorPreview = [],
  recommended = false,
  selected = false,
  onClick,
  className
}: MinimalOptionProps) {
  const [showTooltip, setShowTooltip] = React.useState(false)
  const [tooltipTimer, setTooltipTimer] = React.useState<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    const timer = setTimeout(() => {
      setShowTooltip(true)
    }, 200)
    setTooltipTimer(timer)
  }

  const handleMouseLeave = () => {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer)
      setTooltipTimer(null)
    }
    setShowTooltip(false)
  }

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        className={cn(
          "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          selected
            ? "border-blue-500 bg-blue-50"
            : recommended
            ? "border-green-200 bg-green-50 hover:border-green-300"
            : "border-gray-200 bg-white hover:border-gray-300",
          className
        )}
        type="button"
        aria-label={`${label} - ${tooltip}`}
      >
        {/* Emoji + Label Row */}
        <div className="flex items-center gap-1.5">
          <span className="text-lg leading-none">{emoji}</span>
          <span className={cn(
            "text-sm font-medium",
            selected ? "text-blue-700" : "text-gray-900"
          )}>
            {label}
          </span>
          {recommended && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
              ⭐
            </span>
          )}
        </div>

        {/* Color Preview Row - directly below label */}
        {colorPreview.length > 0 && (
          <div className="flex gap-0.5 justify-center">
            {colorPreview.slice(0, 8).map((color, index) => (
              <div
                key={`${color}-${index}`}
                className="w-3 h-3 rounded-sm border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </button>

      {/* Smart Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap max-w-xs">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </div>
  )
}