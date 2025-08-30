/**
 * Touch Performance Optimization Utilities
 * 
 * This module provides performance optimizations for touch events,
 * including throttling, debouncing, and memory management.
 */

export interface TouchPerformanceConfig {
  throttleMs: number
  maxHistoryLength: number
  enableRAFThrottling: boolean
  enableMemoryOptimization: boolean
  debugMode: boolean
}

const DEFAULT_CONFIG: TouchPerformanceConfig = {
  throttleMs: 16, // 60fps
  maxHistoryLength: 10,
  enableRAFThrottling: true,
  enableMemoryOptimization: true,
  debugMode: false
}

/**
 * Touch Event Throttler using RequestAnimationFrame
 */
export class TouchEventThrottler {
  private config: TouchPerformanceConfig
  private rafId: number | null = null
  private pendingCallback: (() => void) | null = null
  private lastExecutionTime: number = 0

  constructor(config: Partial<TouchPerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Throttle a callback using RequestAnimationFrame
   */
  throttle(callback: () => void): void {
    if (!this.config.enableRAFThrottling) {
      callback()
      return
    }

    // Store the latest callback
    this.pendingCallback = callback

    // If we already have a RAF scheduled, just update the callback
    if (this.rafId !== null) {
      return
    }

    // Schedule the execution
    this.rafId = requestAnimationFrame(() => {
      const now = performance.now()
      
      // Check if enough time has passed since last execution
      if (now - this.lastExecutionTime >= this.config.throttleMs) {
        if (this.pendingCallback) {
          this.pendingCallback()
          this.lastExecutionTime = now
          this.log('Callback executed via RAF throttling')
        }
      } else {
        // Reschedule if not enough time has passed
        this.rafId = requestAnimationFrame(() => {
          if (this.pendingCallback) {
            this.pendingCallback()
            this.lastExecutionTime = performance.now()
          }
          this.rafId = null
          this.pendingCallback = null
        })
        return
      }

      this.rafId = null
      this.pendingCallback = null
    })
  }

  /**
   * Cancel pending throttled execution
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
      this.pendingCallback = null
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TouchPerformanceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.cancel()
  }

  private log(message: string, data?: any): void {
    if (this.config.debugMode) {
      console.log(`[TouchThrottler] ${message}`, data)
    }
  }
}

/**
 * Touch History Manager for memory optimization
 */
export class TouchHistoryManager<T> {
  private history: Map<string, T[]> = new Map()
  private config: TouchPerformanceConfig

  constructor(config: Partial<TouchPerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Add item to history with automatic cleanup
   */
  addToHistory(key: string, item: T): void {
    if (!this.config.enableMemoryOptimization) {
      return
    }

    let keyHistory = this.history.get(key) || []
    keyHistory.push(item)

    // Limit history length to prevent memory leaks
    if (keyHistory.length > this.config.maxHistoryLength) {
      keyHistory = keyHistory.slice(-this.config.maxHistoryLength)
    }

    this.history.set(key, keyHistory)
    this.log(`Added item to history for key: ${key}`, { historyLength: keyHistory.length })
  }

  /**
   * Get history for a key
   */
  getHistory(key: string): T[] {
    return this.history.get(key) || []
  }

  /**
   * Clear history for a key
   */
  clearHistory(key: string): void {
    this.history.delete(key)
    this.log(`Cleared history for key: ${key}`)
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    const keys = Array.from(this.history.keys())
    this.history.clear()
    this.log(`Cleared all history`, { clearedKeys: keys })
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    totalKeys: number
    totalItems: number
    averageItemsPerKey: number
  } {
    const totalKeys = this.history.size
    const totalItems = Array.from(this.history.values()).reduce((sum, arr) => sum + arr.length, 0)
    const averageItemsPerKey = totalKeys > 0 ? totalItems / totalKeys : 0

    return {
      totalKeys,
      totalItems,
      averageItemsPerKey
    }
  }

  private log(message: string, data?: any): void {
    if (this.config.debugMode) {
      console.log(`[TouchHistory] ${message}`, data)
    }
  }
}

/**
 * Touch Event Pool for memory optimization
 */
export class TouchEventPool {
  private pool: Array<{
    id: number
    x: number
    y: number
    startX: number
    startY: number
    startTime: number
    moved: boolean
    pressure: number
  }> = []
  
  private maxPoolSize: number = 50

  /**
   * Get a touch point object from the pool or create new one
   */
  getTouchPoint(): {
    id: number
    x: number
    y: number
    startX: number
    startY: number
    startTime: number
    moved: boolean
    pressure: number
  } {
    if (this.pool.length > 0) {
      const point = this.pool.pop()!
      // Reset the object
      point.id = 0
      point.x = 0
      point.y = 0
      point.startX = 0
      point.startY = 0
      point.startTime = 0
      point.moved = false
      point.pressure = 1
      return point
    }

    // Create new object if pool is empty
    return {
      id: 0,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      startTime: 0,
      moved: false,
      pressure: 1
    }
  }

  /**
   * Return a touch point object to the pool
   */
  returnTouchPoint(point: {
    id: number
    x: number
    y: number
    startX: number
    startY: number
    startTime: number
    moved: boolean
    pressure: number
  }): void {
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(point)
    }
    // If pool is full, let the object be garbage collected
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.length = 0
  }

  /**
   * Get pool statistics
   */
  getStats(): { size: number, maxSize: number } {
    return {
      size: this.pool.length,
      maxSize: this.maxPoolSize
    }
  }
}

/**
 * Performance Monitor for touch events
 */
export class TouchPerformanceMonitor {
  private metrics: {
    eventCount: number
    totalProcessingTime: number
    averageProcessingTime: number
    maxProcessingTime: number
    minProcessingTime: number
    lastResetTime: number
  } = {
    eventCount: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    maxProcessingTime: 0,
    minProcessingTime: Infinity,
    lastResetTime: performance.now()
  }

  private warningThreshold: number = 16 // 60fps threshold

  /**
   * Start measuring touch event processing time
   */
  startMeasurement(): number {
    return performance.now()
  }

  /**
   * End measurement and record metrics
   */
  endMeasurement(startTime: number): void {
    const endTime = performance.now()
    const processingTime = endTime - startTime

    this.metrics.eventCount++
    this.metrics.totalProcessingTime += processingTime
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.eventCount
    this.metrics.maxProcessingTime = Math.max(this.metrics.maxProcessingTime, processingTime)
    this.metrics.minProcessingTime = Math.min(this.metrics.minProcessingTime, processingTime)

    // Log warning if processing time exceeds threshold
    if (processingTime > this.warningThreshold) {
      console.warn(`[TouchPerformance] Slow touch processing: ${processingTime.toFixed(2)}ms (threshold: ${this.warningThreshold}ms)`)
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      eventCount: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      minProcessingTime: Infinity,
      lastResetTime: performance.now()
    }
  }

  /**
   * Check if performance is within acceptable range
   */
  isPerformanceHealthy(): boolean {
    return this.metrics.averageProcessingTime <= this.warningThreshold
  }
}

/**
 * React hook for touch performance optimization
 */
export function useTouchPerformance(config?: Partial<TouchPerformanceConfig>) {
  const [throttler] = React.useState(() => new TouchEventThrottler(config))
  const [historyManager] = React.useState(() => new TouchHistoryManager(config))
  const [performanceMonitor] = React.useState(() => new TouchPerformanceMonitor())
  const [touchPool] = React.useState(() => new TouchEventPool())

  React.useEffect(() => {
    return () => {
      throttler.destroy()
      historyManager.clearAllHistory()
      touchPool.clear()
    }
  }, [throttler, historyManager, touchPool])

  const throttleCallback = React.useCallback((callback: () => void) => {
    throttler.throttle(callback)
  }, [throttler])

  const measurePerformance = React.useCallback(<T,>(operation: () => T): T => {
    const startTime = performanceMonitor.startMeasurement()
    const result = operation()
    performanceMonitor.endMeasurement(startTime)
    return result
  }, [performanceMonitor])

  const addToHistory = React.useCallback(<T,>(key: string, item: T) => {
    historyManager.addToHistory(key, item)
  }, [historyManager])

  const getFromPool = React.useCallback(() => {
    return touchPool.getTouchPoint()
  }, [touchPool])

  const returnToPool = React.useCallback((point: any) => {
    touchPool.returnTouchPoint(point)
  }, [touchPool])

  return {
    throttleCallback,
    measurePerformance,
    addToHistory,
    getHistory: (key: string) => historyManager.getHistory(key),
    clearHistory: (key: string) => historyManager.clearHistory(key),
    getFromPool,
    returnToPool,
    getPerformanceMetrics: () => performanceMonitor.getMetrics(),
    isPerformanceHealthy: () => performanceMonitor.isPerformanceHealthy(),
    resetMetrics: () => performanceMonitor.resetMetrics()
  }
}

/**
 * Utility function to optimize touch event handlers
 */
export function optimizeTouchHandler<T extends Event>(
  handler: (event: T) => void,
  throttler: TouchEventThrottler
): (event: T) => void {
  return (event: T) => {
    throttler.throttle(() => handler(event))
  }
}

/**
 * Debounced touch event handler
 */
export function debounceTouchHandler<T extends Event>(
  handler: (event: T) => void,
  delay: number = 100
): (event: T) => void {
  let timeoutId: number | null = null

  return (event: T) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = window.setTimeout(() => {
      handler(event)
      timeoutId = null
    }, delay)
  }
}

// Import React for hooks
import React from 'react'