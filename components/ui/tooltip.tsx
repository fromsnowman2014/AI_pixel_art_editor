'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  children: React.ReactNode
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  disabled?: boolean
}

export function Tooltip({ 
  children, 
  content, 
  side = 'right', 
  className,
  disabled = false
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const tooltipRef = React.useRef<HTMLDivElement>(null)

  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current || typeof window === 'undefined') return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let x = 0, y = 0

    switch (side) {
      case 'top':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        y = triggerRect.top - tooltipRect.height - 8
        break
      case 'bottom':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        y = triggerRect.bottom + 8
        break
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        break
      case 'right':
      default:
        x = triggerRect.right + 8
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        break
    }

    // Keep tooltip within viewport
    x = Math.max(8, Math.min(x, viewport.width - tooltipRect.width - 8))
    y = Math.max(8, Math.min(y, viewport.height - tooltipRect.height - 8))

    setPosition({ x, y })
  }, [side])

  const showTooltip = React.useCallback(() => {
    if (disabled || typeof window === 'undefined') return
    setIsVisible(true)
    // Delay position calculation to ensure tooltip is rendered
    setTimeout(calculatePosition, 0)
  }, [disabled, calculatePosition])

  const hideTooltip = React.useCallback(() => {
    setIsVisible(false)
  }, [])

  React.useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      window.addEventListener('scroll', calculatePosition)
      window.addEventListener('resize', calculatePosition)
      return () => {
        window.removeEventListener('scroll', calculatePosition)
        window.removeEventListener('resize', calculatePosition)
      }
    }
    return () => {} // Return cleanup function for all code paths
  }, [isVisible, calculatePosition])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && !disabled && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'fixed z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            className
          )}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          {content}
          <div
            className={cn(
              'absolute w-2 h-2 bg-gray-900 rotate-45',
              side === 'top' && 'bottom-[-4px] left-1/2 transform -translate-x-1/2',
              side === 'bottom' && 'top-[-4px] left-1/2 transform -translate-x-1/2',
              side === 'left' && 'right-[-4px] top-1/2 transform -translate-y-1/2',
              side === 'right' && 'left-[-4px] top-1/2 transform -translate-y-1/2'
            )}
          />
        </div>
      )}
    </>
  )
}

// Compound components for more advanced usage
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipTrigger({ children, asChild, ...props }: { 
  children: React.ReactNode
  asChild?: boolean
  [key: string]: any
}) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props)
  }
  return <div {...props}>{children}</div>
}

export function TooltipContent({ children, side = 'top', className, ...props }: {
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  [key: string]: any
}) {
  return <span className={className} {...props}>{children}</span>
}