/**
 * Gesture-based Shortcuts for Mobile Devices
 * 
 * This module provides advanced gesture recognition for tool switching and shortcuts.
 * Supports multi-finger gestures, edge swipes, and other mobile-specific interactions.
 */

import { triggerHaptic } from './haptic-feedback'

export interface GestureShortcut {
  id: string
  name: string
  description: string
  fingers: number
  direction?: 'up' | 'down' | 'left' | 'right'
  edgeSwipe?: boolean
  duration?: number
  distance?: number
  action: () => void | Promise<void>
}

export interface EdgeSwipeConfig {
  edgeWidth: number // Pixels from edge to detect swipe
  minimumDistance: number // Minimum swipe distance
  maximumDuration: number // Maximum time for swipe
}

export interface GestureShortcutConfig {
  enabled: boolean
  hapticFeedback: boolean
  edgeSwipe: EdgeSwipeConfig
  debugMode: boolean
}

const DEFAULT_CONFIG: GestureShortcutConfig = {
  enabled: true,
  hapticFeedback: true,
  edgeSwipe: {
    edgeWidth: 20,
    minimumDistance: 50,
    maximumDuration: 500
  },
  debugMode: false
}

/**
 * Gesture Shortcuts Manager
 */
export class GestureShortcutsManager {
  private config: GestureShortcutConfig
  private shortcuts: Map<string, GestureShortcut> = new Map()
  private activeGesture: {
    startTime: number
    startPoints: { x: number, y: number }[]
    currentPoints: { x: number, y: number }[]
    touchIds: number[]
  } | null = null

  constructor(config: Partial<GestureShortcutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Register a gesture shortcut
   */
  registerShortcut(shortcut: GestureShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut)
    this.log(`Registered gesture shortcut: ${shortcut.name}`)
  }

  /**
   * Unregister a gesture shortcut
   */
  unregisterShortcut(id: string): void {
    this.shortcuts.delete(id)
    this.log(`Unregistered gesture shortcut: ${id}`)
  }

  /**
   * Handle touch start for gesture shortcuts
   */
  handleTouchStart(event: TouchEvent): boolean {
    if (!this.config.enabled) return false

    const touches = Array.from(event.touches)
    
    // Only handle multi-finger gestures (3+ fingers)
    if (touches.length < 3) return false

    this.activeGesture = {
      startTime: performance.now(),
      startPoints: touches.map(t => ({ x: t.clientX, y: t.clientY })),
      currentPoints: touches.map(t => ({ x: t.clientX, y: t.clientY })),
      touchIds: touches.map(t => t.identifier)
    }

    this.log('Gesture shortcut started', { fingerCount: touches.length })
    return true
  }

  /**
   * Handle touch move for gesture shortcuts
   */
  handleTouchMove(event: TouchEvent): boolean {
    if (!this.activeGesture) return false

    const touches = Array.from(event.touches)
    
    // Update current points
    this.activeGesture.currentPoints = touches
      .filter(t => this.activeGesture!.touchIds.includes(t.identifier))
      .map(t => ({ x: t.clientX, y: t.clientY }))

    return true
  }

  /**
   * Handle touch end for gesture shortcuts
   */
  handleTouchEnd(event: TouchEvent): boolean {
    if (!this.activeGesture) return false

    const duration = performance.now() - this.activeGesture.startTime
    const fingerCount = this.activeGesture.startPoints.length

    // Check for edge swipes
    if (fingerCount === 1) {
      const edgeSwipe = this.detectEdgeSwipe()
      if (edgeSwipe) {
        this.executeShortcut(edgeSwipe)
        this.activeGesture = null
        return true
      }
    }

    // Check for multi-finger gestures
    if (fingerCount >= 3) {
      const direction = this.calculateSwipeDirection()
      const distance = this.calculateSwipeDistance()
      
      const matchingShortcut = this.findMatchingShortcut(fingerCount, direction, distance, duration)
      
      if (matchingShortcut) {
        this.executeShortcut(matchingShortcut)
        this.activeGesture = null
        return true
      }
    }

    this.activeGesture = null
    return false
  }

  /**
   * Detect edge swipe gestures
   */
  private detectEdgeSwipe(): GestureShortcut | null {
    if (!this.activeGesture || this.activeGesture.startPoints.length !== 1) return null

    const startPoint = this.activeGesture.startPoints[0]
    const currentPoint = this.activeGesture.currentPoints[0]
    
    if (!currentPoint) return null

    const { edgeWidth, minimumDistance, maximumDuration } = this.config.edgeSwipe
    const duration = performance.now() - this.activeGesture.startTime
    
    // Check if started from edge
    const isFromLeftEdge = startPoint.x <= edgeWidth
    const isFromRightEdge = startPoint.x >= window.innerWidth - edgeWidth
    const isFromTopEdge = startPoint.y <= edgeWidth
    const isFromBottomEdge = startPoint.y >= window.innerHeight - edgeWidth
    
    if (!isFromLeftEdge && !isFromRightEdge && !isFromTopEdge && !isFromBottomEdge) {
      return null
    }

    // Check swipe distance and duration
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - startPoint.x, 2) + 
      Math.pow(currentPoint.y - startPoint.y, 2)
    )
    
    if (distance < minimumDistance || duration > maximumDuration) {
      return null
    }

    // Determine swipe direction
    const deltaX = currentPoint.x - startPoint.x
    const deltaY = currentPoint.y - startPoint.y
    
    let direction: 'up' | 'down' | 'left' | 'right'
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }

    // Find matching edge swipe shortcut
    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.edgeSwipe && shortcut.direction === direction && shortcut.fingers === 1) {
        return shortcut
      }
    }

    return null
  }

  /**
   * Calculate swipe direction for multi-finger gestures
   */
  private calculateSwipeDirection(): 'up' | 'down' | 'left' | 'right' | null {
    if (!this.activeGesture) return null

    const startCenter = this.calculateCenter(this.activeGesture.startPoints)
    const currentCenter = this.calculateCenter(this.activeGesture.currentPoints)
    
    const deltaX = currentCenter.x - startCenter.x
    const deltaY = currentCenter.y - startCenter.y
    
    // Minimum movement threshold
    if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
      return null
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }

  /**
   * Calculate total swipe distance
   */
  private calculateSwipeDistance(): number {
    if (!this.activeGesture) return 0

    const startCenter = this.calculateCenter(this.activeGesture.startPoints)
    const currentCenter = this.calculateCenter(this.activeGesture.currentPoints)
    
    return Math.sqrt(
      Math.pow(currentCenter.x - startCenter.x, 2) + 
      Math.pow(currentCenter.y - startCenter.y, 2)
    )
  }

  /**
   * Calculate center point of touch points
   */
  private calculateCenter(points: { x: number, y: number }[]): { x: number, y: number } {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    }
  }

  /**
   * Find matching shortcut for gesture parameters
   */
  private findMatchingShortcut(
    fingers: number, 
    direction: string | null, 
    distance: number, 
    duration: number
  ): GestureShortcut | null {
    for (const shortcut of this.shortcuts.values()) {
      // Check finger count
      if (shortcut.fingers !== fingers) continue
      
      // Check direction if specified
      if (shortcut.direction && shortcut.direction !== direction) continue
      
      // Check minimum distance if specified
      if (shortcut.distance && distance < shortcut.distance) continue
      
      // Check maximum duration if specified
      if (shortcut.duration && duration > shortcut.duration) continue
      
      return shortcut
    }

    return null
  }

  /**
   * Execute a gesture shortcut
   */
  private async executeShortcut(shortcut: GestureShortcut): Promise<void> {
    this.log(`Executing gesture shortcut: ${shortcut.name}`)
    
    // Trigger haptic feedback
    if (this.config.hapticFeedback) {
      await triggerHaptic('medium')
    }

    try {
      await shortcut.action()
      this.log(`Gesture shortcut executed successfully: ${shortcut.name}`)
    } catch (error) {
      this.log(`Gesture shortcut execution failed:`, error)
      
      // Error haptic feedback
      if (this.config.hapticFeedback) {
        await triggerHaptic('error')
      }
    }
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): GestureShortcut[] {
    return Array.from(this.shortcuts.values())
  }

  /**
   * Clear all shortcuts
   */
  clearShortcuts(): void {
    this.shortcuts.clear()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GestureShortcutConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Reset active gesture state
   */
  reset(): void {
    this.activeGesture = null
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.debugMode) {
      console.log(`[GestureShortcuts] ${message}`, data)
    }
  }
}

/**
 * Create gesture shortcuts for PixelBuddy tools
 */
export function createPixelBuddyGestureShortcuts(
  toolChangeCallback: (tool: string) => void
): GestureShortcut[] {
  return [
    // 3-finger swipes for tool switching
    {
      id: 'tool-next',
      name: 'Next Tool',
      description: '3-finger swipe right to switch to next tool',
      fingers: 3,
      direction: 'right',
      distance: 50,
      duration: 800,
      action: async () => {
        // Cycle through tools
        const tools = ['pencil', 'eraser', 'fill', 'magic-wand', 'eyedropper']
        // This would need to be implemented with current tool state
        toolChangeCallback('pencil') // Placeholder
      }
    },
    {
      id: 'tool-prev',
      name: 'Previous Tool',
      description: '3-finger swipe left to switch to previous tool',
      fingers: 3,
      direction: 'left',
      distance: 50,
      duration: 800,
      action: async () => {
        // Cycle through tools in reverse
        toolChangeCallback('eraser') // Placeholder
      }
    },
    
    // 4-finger gestures for quick actions
    {
      id: 'quick-undo',
      name: 'Quick Undo',
      description: '4-finger swipe left for undo',
      fingers: 4,
      direction: 'left',
      distance: 30,
      duration: 500,
      action: async () => {
        // Would trigger undo - needs to be connected to store
        console.log('Gesture: Undo triggered')
      }
    },
    {
      id: 'quick-redo',
      name: 'Quick Redo',
      description: '4-finger swipe right for redo',
      fingers: 4,
      direction: 'right',
      distance: 30,
      duration: 500,
      action: async () => {
        // Would trigger redo - needs to be connected to store
        console.log('Gesture: Redo triggered')
      }
    },

    // Edge swipes for UI toggles
    {
      id: 'toggle-color-palette',
      name: 'Toggle Color Palette',
      description: 'Swipe from right edge to toggle color palette',
      fingers: 1,
      direction: 'left',
      edgeSwipe: true,
      distance: 80,
      duration: 600,
      action: async () => {
        // Toggle color palette visibility
        console.log('Gesture: Toggle color palette')
      }
    },
    {
      id: 'toggle-tools',
      name: 'Toggle Tools',
      description: 'Swipe from left edge to toggle tools',
      fingers: 1,
      direction: 'right',
      edgeSwipe: true,
      distance: 80,
      duration: 600,
      action: async () => {
        // Toggle tools visibility
        console.log('Gesture: Toggle tools')
      }
    },

    // 5-finger gesture for special actions
    {
      id: 'show-help',
      name: 'Show Help',
      description: '5-finger tap to show gesture help',
      fingers: 5,
      duration: 300,
      action: async () => {
        // Show gesture help overlay
        console.log('Gesture: Show help')
      }
    }
  ]
}

/**
 * React hook for gesture shortcuts
 */
export function useGestureShortcuts(
  element: React.RefObject<HTMLElement>,
  shortcuts: GestureShortcut[],
  config?: Partial<GestureShortcutConfig>
) {
  const [manager] = React.useState(() => new GestureShortcutsManager(config))
  
  React.useEffect(() => {
    // Register all shortcuts
    shortcuts.forEach(shortcut => {
      manager.registerShortcut(shortcut)
    })

    return () => {
      manager.clearShortcuts()
    }
  }, [manager, shortcuts])

  React.useEffect(() => {
    const el = element.current
    if (!el) return

    const handleTouchStart = (e: TouchEvent) => {
      if (manager.handleTouchStart(e)) {
        e.preventDefault()
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (manager.handleTouchMove(e)) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (manager.handleTouchEnd(e)) {
        e.preventDefault()
      }
    }

    // Add event listeners with high priority
    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [element, manager])

  return {
    registerShortcut: (shortcut: GestureShortcut) => manager.registerShortcut(shortcut),
    unregisterShortcut: (id: string) => manager.unregisterShortcut(id),
    updateConfig: (newConfig: Partial<GestureShortcutConfig>) => manager.updateConfig(newConfig),
    getShortcuts: () => manager.getShortcuts()
  }
}

/**
 * Gesture Help Component
 */
export function GestureHelpOverlay({ 
  shortcuts, 
  isVisible, 
  onClose 
}: { 
  shortcuts: GestureShortcut[]
  isVisible: boolean
  onClose: () => void 
}) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Touch Gestures</h3>
          <p className="text-sm text-gray-600 mt-1">Available gesture shortcuts</p>
        </div>
        
        <div className="p-4 space-y-3">
          {shortcuts.map(shortcut => (
            <div key={shortcut.id} className="flex items-start space-x-3 p-2 rounded-lg bg-gray-50">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">{shortcut.fingers}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">{shortcut.name}</h4>
                <p className="text-xs text-gray-600 mt-1">{shortcut.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors touch-button"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

// Import React for hooks
import React from 'react'