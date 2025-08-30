/**
 * Mobile Gesture Recognition Utilities
 * 
 * This module provides comprehensive touch gesture recognition for mobile devices.
 * It handles single-touch drawing, multi-touch pan/zoom, and other gesture patterns.
 */

export interface TouchPoint {
  id: number
  x: number
  y: number
  startX: number
  startY: number
  startTime: number
  moved: boolean
  pressure?: number
}

export interface TouchGesture {
  type: 'single-tap' | 'single-drag' | 'double-tap' | 'long-press' | 'two-finger-pan' | 'pinch-zoom'
  fingers: number
  startTime: number
  duration: number
  distance: number
  center?: { x: number, y: number }
  scale?: number
  delta?: { x: number, y: number }
}

export interface TouchGestureHandler {
  onSingleTap?: (point: TouchPoint) => void
  onSingleDrag?: (points: TouchPoint[], currentPoint: TouchPoint) => void
  onDoubleTap?: (point: TouchPoint) => void
  onLongPress?: (point: TouchPoint) => void
  onTwoFingerPan?: (delta: { x: number, y: number }, center: { x: number, y: number }) => void
  onPinchZoom?: (scale: number, center: { x: number, y: number }) => void
  onGestureStart?: (gesture: TouchGesture) => void
  onGestureEnd?: (gesture: TouchGesture) => void
}

export interface GestureConfig {
  /** Maximum time for tap gesture in milliseconds */
  tapTimeout: number
  /** Minimum time for long press in milliseconds */
  longPressTimeout: number
  /** Maximum distance for tap detection in pixels */
  tapThreshold: number
  /** Minimum distance for drag detection in pixels */
  dragThreshold: number
  /** Maximum time between taps for double tap in milliseconds */
  doubleTapTimeout: number
  /** Enable haptic feedback (if supported) */
  hapticFeedback: boolean
  /** Debug mode for logging gesture events */
  debug: boolean
}

const DEFAULT_CONFIG: GestureConfig = {
  tapTimeout: 200,
  longPressTimeout: 500,
  tapThreshold: 10,
  dragThreshold: 5,
  doubleTapTimeout: 300,
  hapticFeedback: true,
  debug: false
}

/**
 * Mobile Gesture Recognizer Class
 * 
 * Handles touch event processing and gesture recognition for canvas drawing.
 * Supports single-touch drawing, multi-touch pan/zoom, and other gestures.
 */
export class MobileGestureRecognizer {
  private touchHistory: Map<number, TouchPoint[]> = new Map()
  private activeTouches: Map<number, TouchPoint> = new Map()
  private activeGesture: TouchGesture | null = null
  private config: GestureConfig
  private handlers: TouchGestureHandler
  private longPressTimer: number | null = null
  private lastTapTime: number = 0
  private lastTapPosition: { x: number, y: number } | null = null

  constructor(handlers: TouchGestureHandler, config: Partial<GestureConfig> = {}) {
    this.handlers = handlers
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Handle touch start event
   */
  handleTouchStart(event: TouchEvent): void {
    event.preventDefault() // Prevent scrolling

    const touches = Array.from(event.touches)
    const newTouches: TouchPoint[] = []

    touches.forEach(touch => {
      const touchPoint: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        moved: false,
        pressure: (touch as any).force || 1
      }

      this.activeTouches.set(touch.identifier, touchPoint)
      newTouches.push(touchPoint)
      
      // Initialize touch history
      this.touchHistory.set(touch.identifier, [touchPoint])
    })

    this.log('Touch start', { touchCount: touches.length, touches: newTouches })

    // Determine gesture type based on number of touches
    if (touches.length === 1) {
      this.handleSingleTouchStart(newTouches[0])
    } else if (touches.length === 2) {
      this.handleMultiTouchStart(newTouches)
    } else {
      // More than 2 touches - ignore for now
      this.clearActiveGesture()
    }
  }

  /**
   * Handle touch move event
   */
  handleTouchMove(event: TouchEvent): void {
    event.preventDefault()

    const touches = Array.from(event.touches)
    const updatedTouches: TouchPoint[] = []

    touches.forEach(touch => {
      const existing = this.activeTouches.get(touch.identifier)
      if (!existing) return

      const distance = this.calculateDistance(
        existing.startX, existing.startY,
        touch.clientX, touch.clientY
      )

      const updatedTouch: TouchPoint = {
        ...existing,
        x: touch.clientX,
        y: touch.clientY,
        moved: distance > this.config.dragThreshold,
        pressure: (touch as any).force || 1
      }

      this.activeTouches.set(touch.identifier, updatedTouch)
      updatedTouches.push(updatedTouch)

      // Update touch history
      const history = this.touchHistory.get(touch.identifier) || []
      history.push(updatedTouch)
      
      // Keep only recent history (last 10 points for performance)
      if (history.length > 10) {
        history.shift()
      }
      this.touchHistory.set(touch.identifier, history)
    })

    // Clear long press timer if touch moved
    if (updatedTouches.some(t => t.moved) && this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }

    // Handle gesture updates based on current gesture type
    if (this.activeGesture) {
      this.updateActiveGesture(updatedTouches)
    } else {
      // Start new gesture if movement detected
      if (touches.length === 1 && updatedTouches[0].moved) {
        this.startSingleDragGesture(updatedTouches[0])
      } else if (touches.length === 2) {
        this.handleMultiTouchMove(updatedTouches)
      }
    }
  }

  /**
   * Handle touch end event
   */
  handleTouchEnd(event: TouchEvent): void {
    const changedTouches = Array.from(event.changedTouches)
    
    changedTouches.forEach(touch => {
      const touchPoint = this.activeTouches.get(touch.identifier)
      if (touchPoint) {
        const duration = performance.now() - touchPoint.startTime
        const distance = this.calculateDistance(
          touchPoint.startX, touchPoint.startY,
          touchPoint.x, touchPoint.y
        )

        this.log('Touch end', {
          id: touch.identifier,
          duration,
          distance,
          moved: touchPoint.moved
        })

        // Clean up
        this.activeTouches.delete(touch.identifier)
        this.touchHistory.delete(touch.identifier)
      }
    })

    // Clear timers
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }

    // Handle gesture completion
    if (this.activeTouches.size === 0) {
      this.finalizeGesture()
    } else if (this.activeTouches.size === 1 && this.activeGesture?.type.includes('two-finger')) {
      // Switched from multi-touch to single touch
      this.clearActiveGesture()
    }
  }

  /**
   * Handle single touch start
   */
  private handleSingleTouchStart(touch: TouchPoint): void {
    // Check for double tap
    const now = performance.now()
    const isDoubleTap = this.lastTapPosition && 
      now - this.lastTapTime < this.config.doubleTapTimeout &&
      this.calculateDistance(
        this.lastTapPosition.x, this.lastTapPosition.y,
        touch.x, touch.y
      ) < this.config.tapThreshold

    if (isDoubleTap) {
      this.log('Double tap detected')
      this.triggerHapticFeedback('light')
      this.handlers.onDoubleTap?.(touch)
      this.lastTapPosition = null
      return
    }

    // Set up long press detection
    this.longPressTimer = window.setTimeout(() => {
      if (this.activeTouches.has(touch.id) && !touch.moved) {
        this.log('Long press detected')
        this.triggerHapticFeedback('medium')
        this.handlers.onLongPress?.(touch)
      }
    }, this.config.longPressTimeout)
  }

  /**
   * Handle multi-touch start (2+ fingers)
   */
  private handleMultiTouchStart(touches: TouchPoint[]): void {
    if (touches.length === 2) {
      const center = this.calculateCenter(touches)
      const distance = this.calculateDistance(
        touches[0].x, touches[0].y,
        touches[1].x, touches[1].y
      )

      this.activeGesture = {
        type: 'two-finger-pan', // Will be updated to pinch-zoom if distance changes
        fingers: 2,
        startTime: performance.now(),
        duration: 0,
        distance,
        center,
        scale: 1
      }

      this.handlers.onGestureStart?.(this.activeGesture)
      this.log('Multi-touch gesture started', this.activeGesture)
    }
  }

  /**
   * Start single drag gesture
   */
  private startSingleDragGesture(touch: TouchPoint): void {
    this.activeGesture = {
      type: 'single-drag',
      fingers: 1,
      startTime: touch.startTime,
      duration: performance.now() - touch.startTime,
      distance: this.calculateDistance(touch.startX, touch.startY, touch.x, touch.y)
    }

    const history = this.touchHistory.get(touch.id) || []
    this.handlers.onSingleDrag?.(history, touch)
    this.handlers.onGestureStart?.(this.activeGesture)
  }

  /**
   * Handle multi-touch move
   */
  private handleMultiTouchMove(touches: TouchPoint[]): void {
    if (touches.length !== 2 || !this.activeGesture) return

    const center = this.calculateCenter(touches)
    const distance = this.calculateDistance(
      touches[0].x, touches[0].y,
      touches[1].x, touches[1].y
    )

    const scale = distance / this.activeGesture.distance!
    const deltaX = center.x - this.activeGesture.center!.x
    const deltaY = center.y - this.activeGesture.center!.y

    // Determine if this is pan or zoom based on scale change
    const scaleThreshold = 0.1
    const isZoom = Math.abs(scale - 1) > scaleThreshold

    if (isZoom) {
      // Pinch zoom gesture
      if (this.activeGesture.type !== 'pinch-zoom') {
        this.activeGesture.type = 'pinch-zoom'
        this.triggerHapticFeedback('light')
        this.log('Gesture type changed to pinch-zoom')
      }
      
      this.handlers.onPinchZoom?.(scale, center)
    } else {
      // Two-finger pan
      this.handlers.onTwoFingerPan?.({ x: deltaX, y: deltaY }, center)
    }

    // Update gesture state
    this.activeGesture.center = center
    this.activeGesture.distance = distance
    this.activeGesture.scale = scale
    this.activeGesture.delta = { x: deltaX, y: deltaY }
  }

  /**
   * Update active gesture
   */
  private updateActiveGesture(touches: TouchPoint[]): void {
    if (!this.activeGesture) return

    if (this.activeGesture.type === 'single-drag' && touches.length === 1) {
      const touch = touches[0]
      const history = this.touchHistory.get(touch.id) || []
      this.handlers.onSingleDrag?.(history, touch)
    }
  }

  /**
   * Finalize gesture when all touches end
   */
  private finalizeGesture(): void {
    if (!this.activeGesture) {
      // Check if this was a simple tap
      const touchArray = Array.from(this.touchHistory.values())
      if (touchArray.length === 1 && touchArray[0].length === 1) {
        const touch = touchArray[0][0]
        const duration = performance.now() - touch.startTime
        
        if (duration < this.config.tapTimeout && !touch.moved) {
          this.log('Single tap detected')
          this.triggerHapticFeedback('light')
          this.handlers.onSingleTap?.(touch)
          
          // Store for double tap detection
          this.lastTapTime = performance.now()
          this.lastTapPosition = { x: touch.x, y: touch.y }
        }
      }
    } else {
      // Complete active gesture
      this.activeGesture.duration = performance.now() - this.activeGesture.startTime
      this.handlers.onGestureEnd?.(this.activeGesture)
      this.log('Gesture completed', this.activeGesture)
    }

    this.clearActiveGesture()
  }

  /**
   * Clear active gesture state
   */
  private clearActiveGesture(): void {
    this.activeGesture = null
    this.touchHistory.clear()
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Calculate center point of touches
   */
  private calculateCenter(touches: TouchPoint[]): { x: number, y: number } {
    const sum = touches.reduce(
      (acc, touch) => ({ x: acc.x + touch.x, y: acc.y + touch.y }),
      { x: 0, y: 0 }
    )
    return {
      x: sum.x / touches.length,
      y: sum.y / touches.length
    }
  }

  /**
   * Trigger haptic feedback if supported
   */
  private triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!this.config.hapticFeedback) return

    // Import haptic feedback dynamically to avoid circular dependencies
    import('./haptic-feedback').then(({ triggerHaptic }) => {
      const hapticType = type === 'light' ? 'selection' : 
                        type === 'medium' ? 'medium' : 'heavy'
      triggerHaptic(hapticType)
    }).catch(() => {
      // Fallback to simple vibration
      try {
        if ('vibrate' in navigator) {
          const patterns = {
            light: [10],
            medium: [20],
            heavy: [30]
          }
          navigator.vibrate(patterns[type])
        }
      } catch (error) {
        // Haptic feedback not supported, silently fail
      }
    })
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[MobileGesture] ${message}`, data)
    }
  }

  /**
   * Get current active gesture
   */
  getCurrentGesture(): TouchGesture | null {
    return this.activeGesture
  }

  /**
   * Get current active touches
   */
  getActiveTouches(): TouchPoint[] {
    return Array.from(this.activeTouches.values())
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Reset gesture recognizer state
   */
  reset(): void {
    this.clearActiveGesture()
    this.activeTouches.clear()
    this.lastTapPosition = null
    this.lastTapTime = 0
  }
}

/**
 * Utility function to create a gesture recognizer with default handlers
 */
export function createGestureRecognizer(
  handlers: TouchGestureHandler,
  config?: Partial<GestureConfig>
): MobileGestureRecognizer {
  return new MobileGestureRecognizer(handlers, config)
}

/**
 * Utility function to detect if device supports touch
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Utility function to get optimal touch target size based on device
 */
export function getOptimalTouchTargetSize(): number {
  // iOS Human Interface Guidelines recommend 44pt minimum
  // Android recommends 48dp minimum
  // We use 44px as base minimum
  const devicePixelRatio = window.devicePixelRatio || 1
  return Math.max(44, 44 / devicePixelRatio)
}

/**
 * Utility function to prevent default touch behaviors
 */
export function preventTouchDefaults(element: HTMLElement): () => void {
  const preventDefault = (e: Event) => e.preventDefault()
  
  // Prevent scrolling, zooming, and other default behaviors
  element.addEventListener('touchstart', preventDefault, { passive: false })
  element.addEventListener('touchmove', preventDefault, { passive: false })
  element.addEventListener('touchend', preventDefault, { passive: false })
  
  // Prevent context menu on long press
  element.addEventListener('contextmenu', preventDefault)
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', preventDefault)
    element.removeEventListener('touchmove', preventDefault)
    element.removeEventListener('touchend', preventDefault)
    element.removeEventListener('contextmenu', preventDefault)
  }
}