'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SmartTooltipProps {
  content: React.ReactNode
  delay?: number
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export function SmartTooltip({
  content,
  delay = 200,
  side = 'top',
  align = 'center',
  children,
  disabled = false,
  className
}: SmartTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [timer, setTimer] = React.useState<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    if (disabled) return
    
    const timeoutId = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    setTimer(timeoutId)
  }

  const hideTooltip = () => {
    if (timer) {
      clearTimeout(timer)
      setTimer(null)
    }
    setIsVisible(false)
  }

  const getPositionClasses = () => {
    const positions = {
      top: {
        tooltip: 'bottom-full mb-2',
        arrow: 'top-full -mt-1'
      },
      bottom: {
        tooltip: 'top-full mt-2',
        arrow: 'bottom-full -mb-1'
      },
      left: {
        tooltip: 'right-full mr-2',
        arrow: 'left-full -ml-1'
      },
      right: {
        tooltip: 'left-full ml-2',
        arrow: 'right-full -mr-1'
      }
    }

    const alignments = {
      start: side === 'top' || side === 'bottom' ? 'left-0' : 'top-0',
      center: side === 'top' || side === 'bottom' ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2',
      end: side === 'top' || side === 'bottom' ? 'right-0' : 'bottom-0'
    }

    const arrowAlignments = {
      start: side === 'top' || side === 'bottom' ? 'left-3' : 'top-3',
      center: side === 'top' || side === 'bottom' ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2',
      end: side === 'top' || side === 'bottom' ? 'right-3' : 'bottom-3'
    }

    return {
      tooltip: `${positions[side].tooltip} ${alignments[align]}`,
      arrow: `${positions[side].arrow} ${arrowAlignments[align]}`
    }
  }

  const positionClasses = getPositionClasses()

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && !disabled && (
        <div 
          className={cn(
            "absolute z-50 pointer-events-none",
            positionClasses.tooltip
          )}
        >
          <div className={cn(
            "px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg max-w-xs",
            "whitespace-normal break-words",
            className
          )}>
            {content}
            
            {/* Arrow */}
            <div 
              className={cn(
                "absolute w-2 h-2 bg-gray-900 rotate-45",
                positionClasses.arrow
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Rich tooltip with enhanced content support
interface RichTooltipProps extends Omit<SmartTooltipProps, 'content'> {
  title?: string
  description: string
  details?: string
  colorPreview?: string[]
  recommended?: boolean
}

export function RichTooltip({
  title,
  description,
  details,
  colorPreview,
  recommended,
  ...props
}: RichTooltipProps) {
  const content = (
    <div className="space-y-1.5">
      {title && (
        <div className="font-semibold text-white">{title}</div>
      )}
      
      <div className="text-gray-200">{description}</div>
      
      {details && (
        <div className="text-xs text-gray-300">{details}</div>
      )}
      
      {colorPreview && colorPreview.length > 0 && (
        <div className="flex gap-1 pt-1">
          {colorPreview.slice(0, 6).map((color, index) => (
            <div
              key={`${color}-${index}`}
              className="w-3 h-3 rounded-sm border border-gray-600"
              style={{ backgroundColor: color }}
            />
          ))}
          {colorPreview.length > 6 && (
            <div className="text-xs text-gray-400 ml-1">
              +{colorPreview.length - 6}
            </div>
          )}
        </div>
      )}
      
      {recommended && (
        <div className="text-xs text-green-300 font-medium pt-1">
          ⭐ Recommended
        </div>
      )}
    </div>
  )

  return <SmartTooltip {...props} content={content} />
}