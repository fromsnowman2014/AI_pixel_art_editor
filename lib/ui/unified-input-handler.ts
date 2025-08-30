/**
 * Unified Input Handler for Desktop/Mobile UI
 * 
 * Consolidates mouse, touch, and keyboard input handling with structured logging
 * and error recovery patterns following the refactoring strategy.
 */

import * as React from 'react'
import { createComponentLogger } from '@/lib/ui/smart-logger'
import { triggerHaptic } from '@/lib/utils/haptic-feedback'

export interface InputPoint {
  x: number
  y: number
  pressure: number
  timestamp: number
  inputType: 'mouse' | 'touch' | 'pen'
  identifier?: number
}

export interface InputGesture {
  type: 'tap' | 'drag' | 'long-press' | 'pan' | 'zoom' | 'multi-touch'
  startTime: number
  duration: number
  points: InputPoint[]
  center?: { x: number, y: number }
  scale?: number
  confidence: number
}

export interface UnifiedInputHandlers {
  onDrawStart?: (point: InputPoint) => void
  onDrawMove?: (point: InputPoint, gesture: InputGesture) => void
  onDrawEnd?: (point: InputPoint, gesture: InputGesture) => void
  onPan?: (delta: { x: number, y: number }, gesture: InputGesture) => void
  onZoom?: (scale: number, center: { x: number, y: number }, gesture: InputGesture) => void
  onToolSelect?: (tool: string) => void
  onLongPress?: (point: InputPoint) => void
  onError?: (error: Error, context: string) => void
}

export interface UnifiedInputConfig {
  element: HTMLElement
  handlers: UnifiedInputHandlers
  enableHaptics: boolean
  performanceMode: 'high' | 'balanced' | 'battery-saver'
  debugMode: boolean
  component: string
}

/**
 * Central error handler for input events
 */
class InputErrorHandler {
  private static componentLogger = createComponentLogger('UnifiedInputHandler')

  static handle(error: Error, context: string, recovery?: () => void): void {
    this.componentLogger.error(
      'INPUT_ERROR_OCCURRED',
      {
        errorContext: context,
        errorMessage: error.message,
        stack: error.stack,
        recoveryAvailable: !!recovery
      },
      error
    )

    // Attempt recovery if provided
    if (recovery) {
      try {
        recovery()
        this.componentLogger.info(
          'INPUT_ERROR_RECOVERY_SUCCESS',
          { recoveryContext: context }
        )
      } catch (recoveryError) {
        this.componentLogger.error(
          'INPUT_ERROR_RECOVERY_FAILED',
          { 
            originalContext: context,
            recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
          }
        )
      }
    }
  }

  static createUserFriendlyMessage(error: Error): string {
    // Convert technical errors to user-friendly messages
    if (error.message.includes('touch')) {
      return 'Touch interaction temporarily unavailable. Please try using mouse input.'
    }
    if (error.message.includes('gesture')) {
      return 'Gesture recognition failed. Please use the toolbar buttons instead.'
    }
    if (error.message.includes('performance')) {
      return 'Drawing may feel slower than usual. Please try simpler strokes.'
    }
    return 'Something went wrong. Please refresh the page if the issue persists.'
  }
}

/**
 * Unified Input Handler Class
 */
export class UnifiedInputHandler {
  private config: UnifiedInputConfig
  private componentLogger = createComponentLogger('UnifiedInputHandler')
  private activeGesture: InputGesture | null = null
  private activeTouches: Map<number, InputPoint> = new Map()
  private performanceMonitor: {
    lastFrameTime: number
    frameCount: number
    avgFrameTime: number
  } = {
    lastFrameTime: 0,
    frameCount: 0,
    avgFrameTime: 16
  }

  constructor(config: UnifiedInputConfig) {
    this.config = config
    this.componentLogger.info(
      'UNIFIED_INPUT_HANDLER_INITIALIZED',
      {
        component: config.component,
        performanceMode: config.performanceMode,
        enableHaptics: config.enableHaptics
      }
    )
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    const element = this.config.element

    // Mouse events (desktop)
    element.addEventListener('mousedown', this.handleMouseDown.bind(this), { passive: false })
    element.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: false })
    element.addEventListener('mouseup', this.handleMouseUp.bind(this), { passive: false })

    // Touch events (mobile)
    element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false })

    // Keyboard events (universal)
    document.addEventListener('keydown', this.handleKeyDown.bind(this))

    this.componentLogger.debug(
      'EVENT_LISTENERS_ATTACHED',
      {
        element: element.tagName,
        eventTypes: ['mouse', 'touch', 'keyboard']
      }
    )
  }

  private createInputPoint(
    clientX: number, 
    clientY: number, 
    inputType: 'mouse' | 'touch' | 'pen',
    identifier?: number,
    pressure: number = 1
  ): InputPoint {
    return {
      x: clientX,
      y: clientY,
      pressure,
      timestamp: performance.now(),
      inputType,
      identifier
    }
  }

  private measurePerformance<T>(operation: string, fn: () => T): T {
    const startTime = performance.now()
    
    try {
      const result = fn()
      const duration = performance.now() - startTime

      this.performanceMonitor.frameCount++
      this.performanceMonitor.avgFrameTime = 
        (this.performanceMonitor.avgFrameTime * (this.performanceMonitor.frameCount - 1) + duration) / 
        this.performanceMonitor.frameCount

      if (duration > 16) { // Above 60fps threshold
        this.componentLogger.warn(
          'PERFORMANCE_WARNING',
          {
            operation,
            processingTime: duration,
            threshold: 16,
            avgFrameTime: this.performanceMonitor.avgFrameTime
          }
        )
      } else {
        this.componentLogger.debug(
          'PERFORMANCE_METRIC',
          {
            operation,
            duration,
            avgFrameTime: this.performanceMonitor.avgFrameTime
          }
        )
      }

      return result
    } catch (error) {
      InputErrorHandler.handle(
        error instanceof Error ? error : new Error(String(error)),
        `performance-measurement-${operation}`
      )
      throw error
    }
  }

  // Mouse Event Handlers
  private handleMouseDown(event: MouseEvent): void {
    this.measurePerformance('mouse-down', () => {
      const point = this.createInputPoint(event.clientX, event.clientY, 'mouse')
      
      this.componentLogger.debug(
        'INPUT_EVENT',
        {
          inputType: 'mouse',
          action: 'down',
          coordinates: { x: point.x, y: point.y }
        }
      )

      try {
        this.startDrawingGesture(point)
        this.config.handlers.onDrawStart?.(point)
      } catch (error) {
        InputErrorHandler.handle(
          error instanceof Error ? error : new Error(String(error)),
          'mouse-draw-start',
          () => this.componentLogger.warn('FALLBACK_MOUSE_ONLY_MODE_ACTIVATED')
        )
      }
    })
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.activeGesture) return

    this.measurePerformance('mouse-move', () => {
      const point = this.createInputPoint(event.clientX, event.clientY, 'mouse')
      
      try {
        this.config.handlers.onDrawMove?.(point, this.activeGesture!)
      } catch (error) {
        InputErrorHandler.handle(
          error instanceof Error ? error : new Error(String(error)),
          'mouse-draw-move'
        )
      }
    })
  }

  private handleMouseUp(event: MouseEvent): void {
    this.measurePerformance('mouse-up', () => {
      const point = this.createInputPoint(event.clientX, event.clientY, 'mouse')
      
      this.componentLogger.debug(
        'INPUT_EVENT',
        {
          inputType: 'mouse',
          action: 'up',
          gestureDuration: this.activeGesture?.duration || 0
        }
      )

      try {
        this.config.handlers.onDrawEnd?.(point, this.activeGesture!)
        this.endGesture()
      } catch (error) {
        InputErrorHandler.handle(
          error instanceof Error ? error : new Error(String(error)),
          'mouse-draw-end'
        )
      }
    })
  }

  // Touch Event Handlers
  private handleTouchStart(event: TouchEvent): void {
    this.measurePerformance('touch-start', () => {
      const touches = Array.from(event.touches)
      
      this.componentLogger.debug(
        'INPUT_EVENT',
        {
          inputType: 'touch',
          action: 'start',
          touchCount: touches.length,
          coordinates: touches.map(t => ({ x: t.clientX, y: t.clientY }))
        }
      )

      try {
        if (touches.length === 1) {
          // Single touch - drawing
          event.preventDefault()
          const point = this.createInputPoint(
            touches[0].clientX, 
            touches[0].clientY, 
            'touch',
            touches[0].identifier
          )
          this.activeTouches.set(touches[0].identifier, point)
          this.startDrawingGesture(point)
          this.config.handlers.onDrawStart?.(point)
          
          if (this.config.enableHaptics) {
            triggerHaptic('light')
          }
        } else if (touches.length === 2) {
          // Two finger - pan/zoom
          event.preventDefault()
          this.startNavigationGesture(touches)
        } else {
          // 3+ fingers - gesture shortcuts
          this.handleGestureShortcuts(touches)
        }
      } catch (error) {
        InputErrorHandler.handle(
          error instanceof Error ? error : new Error(String(error)),
          'touch-start',
          () => this.componentLogger.warn('GESTURE_FALLBACK_ACTIVATED')
        )
      }
    })
  }

  private handleTouchMove(event: TouchEvent): void {
    this.measurePerformance('touch-move', () => {
      const touches = Array.from(event.touches)
      
      try {
        if (touches.length === 1 && this.activeGesture?.type === 'drag') {
          // Single touch drawing
          event.preventDefault()
          const touch = touches[0]
          const point = this.createInputPoint(
            touch.clientX, 
            touch.clientY, 
            'touch',
            touch.identifier
          )
          
          this.activeTouches.set(touch.identifier, point)
          this.config.handlers.onDrawMove?.(point, this.activeGesture)
        } else if (touches.length === 2 && this.activeGesture?.type === 'pan') {
          // Two finger navigation
          event.preventDefault()
          this.updateNavigationGesture(touches)
        }
      } catch (error) {
        InputErrorHandler.handle(
          error instanceof Error ? error : new Error(String(error)),
          'touch-move'
        )
      }
    })
  }

  private handleTouchEnd(event: TouchEvent): void {
    this.measurePerformance('touch-end', () => {
      const changedTouches = Array.from(event.changedTouches)
      
      this.componentLogger.debug(
        'INPUT_EVENT',
        {
          inputType: 'touch',
          action: 'end',
          changedTouchCount: changedTouches.length,
          remainingTouchCount: event.touches.length
        }
      )

      try {
        changedTouches.forEach(touch => {
          const point = this.activeTouches.get(touch.identifier)
          if (point) {
            const finalPoint = this.createInputPoint(
              touch.clientX,
              touch.clientY,
              'touch',
              touch.identifier
            )
            
            this.config.handlers.onDrawEnd?.(finalPoint, this.activeGesture!)
            this.activeTouches.delete(touch.identifier)
          }
        })

        if (event.touches.length === 0) {
          this.endGesture()
        }
      } catch (error) {
        InputErrorHandler.handle(
          error instanceof Error ? error : new Error(String(error)),
          'touch-end'
        )
      }
    })
  }

  private handleTouchCancel(event: TouchEvent): void {
    this.componentLogger.warn(
      'TOUCH_CANCELLED',
      {
        reason: 'system-interruption',
        activeTouches: this.activeTouches.size
      }
    )

    this.activeTouches.clear()
    this.endGesture()
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Don't handle if user is typing in input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    const key = event.key.toLowerCase()
    const toolShortcuts: Record<string, string> = {
      'p': 'pencil',
      'e': 'eraser',
      'b': 'fill',
      'w': 'magic-wand',
      'i': 'eyedropper',
      'h': 'pan'
    }

    if (toolShortcuts[key]) {
      event.preventDefault()
      
      this.componentLogger.debug(
        'KEYBOARD_SHORTCUT',
        {
          key,
          tool: toolShortcuts[key],
          inputMethod: 'keyboard'
        }
      )

      try {
        this.config.handlers.onToolSelect?.(toolShortcuts[key])
        
        if (this.config.enableHaptics) {
          triggerHaptic('selection')
        }
      } catch (error) {
        InputErrorHandler.handle(
          error instanceof Error ? error : new Error(String(error)),
          'keyboard-shortcut'
        )
      }
    }
  }

  private startDrawingGesture(point: InputPoint): void {
    this.activeGesture = {
      type: 'tap',
      startTime: point.timestamp,
      duration: 0,
      points: [point],
      confidence: 1.0
    }

    this.componentLogger.debug(
      'GESTURE_START',
      {
        gestureType: 'drawing',
        inputType: point.inputType,
        confidence: this.activeGesture.confidence
      }
    )
  }

  private startNavigationGesture(touches: Touch[]): void {
    const points = touches.map(touch => 
      this.createInputPoint(touch.clientX, touch.clientY, 'touch', touch.identifier)
    )
    
    const center = this.calculateCenter(points)
    const distance = this.calculateDistance(points[0], points[1])

    this.activeGesture = {
      type: 'pan',
      startTime: performance.now(),
      duration: 0,
      points,
      center,
      scale: 1.0,
      confidence: 0.8
    }

    this.componentLogger.debug(
      'GESTURE_START',
      {
        gestureType: 'navigation',
        touchCount: touches.length,
        center,
        initialDistance: distance
      }
    )

    points.forEach(point => {
      this.activeTouches.set(point.identifier!, point)
    })
  }

  private updateNavigationGesture(touches: Touch[]): void {
    if (!this.activeGesture || touches.length !== 2) return

    const currentPoints = touches.map(touch => 
      this.createInputPoint(touch.clientX, touch.clientY, 'touch', touch.identifier)
    )
    
    const currentCenter = this.calculateCenter(currentPoints)
    const currentDistance = this.calculateDistance(currentPoints[0], currentPoints[1])
    
    // Calculate deltas
    const deltaX = currentCenter.x - this.activeGesture.center!.x
    const deltaY = currentCenter.y - this.activeGesture.center!.y
    const scale = currentDistance / this.activeGesture.points[0] ? 
      this.calculateDistance(this.activeGesture.points[0], this.activeGesture.points[1]) : 1

    // Determine if this is pan or zoom
    const isZoom = Math.abs(scale - 1) > 0.1
    const isPan = Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5

    if (isZoom) {
      this.activeGesture.type = 'zoom'
      this.config.handlers.onZoom?.(scale, currentCenter, this.activeGesture)
      
      this.componentLogger.debug(
        'GESTURE_UPDATE',
        {
          gestureType: 'zoom',
          scale,
          center: currentCenter
        }
      )
    } else if (isPan) {
      this.activeGesture.type = 'pan'
      this.config.handlers.onPan?.({ x: deltaX, y: deltaY }, this.activeGesture)
      
      this.componentLogger.debug(
        'GESTURE_UPDATE',
        {
          gestureType: 'pan',
          delta: { x: deltaX, y: deltaY }
        }
      )
    }

    // Update gesture state
    this.activeGesture.center = currentCenter
    this.activeGesture.scale = scale
    this.activeGesture.duration = performance.now() - this.activeGesture.startTime
  }

  private handleGestureShortcuts(touches: Touch[]): void {
    if (touches.length < 3) return

    this.componentLogger.info(
      'GESTURE_SHORTCUT_DETECTED',
      {
        fingerCount: touches.length,
        shortcutType: touches.length === 3 ? 'tool-switch' : 
                     touches.length === 4 ? 'undo-redo' : 'custom'
      }
    )

    // Implement gesture shortcuts based on finger count
    if (touches.length === 3) {
      // 3-finger: tool switching (placeholder)
      this.config.handlers.onToolSelect?.('pencil')
    } else if (touches.length === 4) {
      // 4-finger: undo/redo (placeholder)
      // Would need to connect to actual undo/redo handlers
    }

    if (this.config.enableHaptics) {
      triggerHaptic('medium')
    }
  }

  private endGesture(): void {
    if (this.activeGesture) {
      this.activeGesture.duration = performance.now() - this.activeGesture.startTime
      
      this.componentLogger.debug(
        'GESTURE_END',
        {
          gestureType: this.activeGesture.type,
          duration: this.activeGesture.duration,
          confidence: this.activeGesture.confidence
        }
      )
    }

    this.activeGesture = null
  }

  private calculateCenter(points: InputPoint[]): { x: number, y: number } {
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 })

    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    }
  }

  private calculateDistance(point1: InputPoint, point2: InputPoint): number {
    const dx = point2.x - point1.x
    const dy = point2.y - point1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<UnifiedInputConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    this.componentLogger.info(
      'CONFIG_UPDATE',
      {
        updatedFields: Object.keys(newConfig),
        newPerformanceMode: this.config.performanceMode
      }
    )
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): object {
    return {
      avgFrameTime: this.performanceMonitor.avgFrameTime,
      frameCount: this.performanceMonitor.frameCount,
      isPerformanceHealthy: this.performanceMonitor.avgFrameTime <= 16
    }
  }

  /**
   * Cleanup and remove event listeners
   */
  destroy(): void {
    const element = this.config.element

    // Remove all event listeners
    element.removeEventListener('mousedown', this.handleMouseDown.bind(this))
    element.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    element.removeEventListener('mouseup', this.handleMouseUp.bind(this))
    element.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    element.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    element.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this))
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))

    this.activeTouches.clear()
    this.activeGesture = null

    this.componentLogger.info(
      'UNIFIED_INPUT_HANDLER_DESTROYED',
      {
        component: this.config.component,
        finalPerformanceMetrics: this.getPerformanceMetrics()
      }
    )
  }
}

/**
 * React hook for unified input handling
 */
export function useUnifiedInput(
  elementRef: React.RefObject<HTMLElement>,
  handlers: UnifiedInputHandlers,
  config: {
    enableHaptics?: boolean
    performanceMode?: 'high' | 'balanced' | 'battery-saver'
    debugMode?: boolean
    component: string
  }
): {
  performanceMetrics: object
  updateConfig: (newConfig: Partial<UnifiedInputConfig>) => void
} {
  const [inputHandler, setInputHandler] = React.useState<UnifiedInputHandler | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = React.useState<object>({})

  React.useEffect(() => {
    if (!elementRef.current) return

    const handler = new UnifiedInputHandler({
      element: elementRef.current,
      handlers,
      enableHaptics: config.enableHaptics ?? true,
      performanceMode: config.performanceMode ?? 'balanced',
      debugMode: config.debugMode ?? false,
      component: config.component
    })

    setInputHandler(handler)

    // Update performance metrics periodically
    const metricsInterval = setInterval(() => {
      setPerformanceMetrics(handler.getPerformanceMetrics())
    }, 1000)

    return () => {
      handler.destroy()
      clearInterval(metricsInterval)
    }
  }, [elementRef, handlers, config])

  const updateConfig = React.useCallback((newConfig: Partial<UnifiedInputConfig>) => {
    inputHandler?.updateConfig(newConfig)
  }, [inputHandler])

  return {
    performanceMetrics,
    updateConfig
  }
}

export { InputErrorHandler }