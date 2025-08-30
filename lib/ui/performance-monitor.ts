/**
 * Performance Monitoring System
 * 
 * Integrated performance tracking with structured logging
 * following the refactoring strategy patterns.
 */

import * as React from 'react'
import { createComponentLogger } from '@/lib/ui/smart-logger'

export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'fps' | 'bytes' | 'count'
  timestamp: number
  component: string
  threshold?: number
  severity?: 'ok' | 'warning' | 'critical'
}

export interface PerformanceConfig {
  enableRealTimeMonitoring: boolean
  sampleRate: number // 0-1, percentage of operations to monitor
  thresholds: {
    frameTime: number // milliseconds
    memoryUsage: number // bytes
    touchResponseTime: number // milliseconds
    renderTime: number // milliseconds
  }
  enableAutomaticOptimization: boolean
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableRealTimeMonitoring: process.env.NODE_ENV === 'development',
  sampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  thresholds: {
    frameTime: 16, // 60fps
    memoryUsage: 50 * 1024 * 1024, // 50MB
    touchResponseTime: 8, // 120fps for touch
    renderTime: 33 // 30fps for complex renders
  },
  enableAutomaticOptimization: true
}

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
  private config: PerformanceConfig
  private componentLogger = createComponentLogger('PerformanceMonitor')
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private activeTimers: Map<string, { startTime: number, component: string }> = new Map()
  private frameTimeHistory: number[] = []
  private memoryObserver: PerformanceObserver | null = null
  private lastFrameTime: number = 0
  private frameCount: number = 0

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    this.componentLogger.info(
      'PERFORMANCE_MONITOR_INITIALIZED',
      {
        config: this.config,
        supportedAPIs: this.getSupportedAPIs()
      }
    )

    this.setupPerformanceObserver()
    this.startFrameMonitoring()
  }

  private getSupportedAPIs(): string[] {
    const apis: string[] = []
    
    if ('performance' in window) apis.push('Performance API')
    if ('PerformanceObserver' in window) apis.push('Performance Observer')
    if ('memory' in (performance as any)) apis.push('Memory API')
    if ('requestAnimationFrame' in window) apis.push('Animation Frame')
    
    return apis
  }

  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      this.memoryObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('memory-usage', (entry as any).value || 0, 'bytes', 'System')
        }
      })

      this.memoryObserver.observe({ entryTypes: ['memory'] })
    } catch (error) {
      this.componentLogger.warn(
        'PERFORMANCE_OBSERVER_SETUP_FAILED',
        {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      )
    }
  }

  private startFrameMonitoring(): void {
    const measureFrame = () => {
      const now = performance.now()
      
      if (this.lastFrameTime > 0) {
        const frameTime = now - this.lastFrameTime
        this.frameTimeHistory.push(frameTime)
        
        // Keep only recent frame times (last 60 frames)
        if (this.frameTimeHistory.length > 60) {
          this.frameTimeHistory.shift()
        }

        // Record frame time metric
        if (Math.random() < this.config.sampleRate) {
          this.recordMetric('frame-time', frameTime, 'ms', 'System')
        }

        // Check for performance issues
        if (frameTime > this.config.thresholds.frameTime) {
          this.componentLogger.warn(
            'FRAME_TIME_THRESHOLD_EXCEEDED',
            {
              frameTime,
              threshold: this.config.thresholds.frameTime,
              averageFrameTime: this.getAverageFrameTime()
            }
          )
        }
      }
      
      this.lastFrameTime = now
      this.frameCount++
      
      requestAnimationFrame(measureFrame)
    }

    requestAnimationFrame(measureFrame)
  }

  /**
   * Start timing an operation
   */
  startTiming(operation: string, component: string): void {
    if (!this.config.enableRealTimeMonitoring) return
    if (Math.random() > this.config.sampleRate) return

    const timerId = `${component}-${operation}-${Date.now()}`
    this.activeTimers.set(timerId, {
      startTime: performance.now(),
      component
    })

    this.componentLogger.debug(
      'TIMING_STARTED',
      {
        operation,
        component,
        timerId
      }
    )
  }

  /**
   * End timing and record metric
   */
  endTiming(operation: string, component: string): number | null {
    if (!this.config.enableRealTimeMonitoring) return null

    // Find matching timer
    const timerId = Array.from(this.activeTimers.keys())
      .find(id => id.includes(`${component}-${operation}`))

    if (!timerId) {
      this.componentLogger.warn(
        'TIMING_END_WITHOUT_START',
        {
          operation,
          component
        }
      )
      return null
    }

    const timer = this.activeTimers.get(timerId)!
    const duration = performance.now() - timer.startTime
    
    this.activeTimers.delete(timerId)
    this.recordMetric(operation, duration, 'ms', component)

    this.componentLogger.debug(
      'TIMING_COMPLETED',
      {
        operation,
        component,
        duration,
        timerId
      }
    )

    return duration
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: PerformanceMetric['unit'], component: string): void {
    const threshold = this.getThresholdForMetric(name)
    const severity = this.calculateSeverity(value, threshold, unit)

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      component,
      threshold,
      severity
    }

    // Store metric
    const existingMetrics = this.metrics.get(name) || []
    existingMetrics.push(metric)
    
    // Keep only recent metrics (last 100)
    if (existingMetrics.length > 100) {
      existingMetrics.shift()
    }
    
    this.metrics.set(name, existingMetrics)

    // Log based on severity
    if (severity === 'critical') {
      this.componentLogger.error(
        'CRITICAL_PERFORMANCE_ISSUE',
        {
          metric: name,
          value,
          unit,
          threshold,
          component
        }
      )
      
      // Trigger automatic optimization if enabled
      if (this.config.enableAutomaticOptimization) {
        this.triggerOptimization(name, component)
      }
    } else if (severity === 'warning') {
      this.componentLogger.warn(
        'PERFORMANCE_WARNING',
        {
          metric: name,
          value,
          unit,
          threshold,
          component
        }
      )
    } else {
      this.componentLogger.debug(
        'PERFORMANCE_METRIC_RECORDED',
        {
          metric: name,
          value,
          unit,
          component
        }
      )
    }
  }

  private getThresholdForMetric(name: string): number | undefined {
    const thresholdMap: Record<string, number> = {
      'frame-time': this.config.thresholds.frameTime,
      'touch-response': this.config.thresholds.touchResponseTime,
      'render-time': this.config.thresholds.renderTime,
      'memory-usage': this.config.thresholds.memoryUsage
    }

    return thresholdMap[name]
  }

  private calculateSeverity(value: number, threshold?: number, unit?: string): PerformanceMetric['severity'] {
    if (!threshold) return 'ok'

    if (unit === 'ms' || unit === 'bytes') {
      // Higher values are worse
      if (value > threshold * 2) return 'critical'
      if (value > threshold) return 'warning'
    } else if (unit === 'fps') {
      // Lower values are worse
      if (value < threshold * 0.5) return 'critical'
      if (value < threshold) return 'warning'
    }

    return 'ok'
  }

  private triggerOptimization(metricName: string, component: string): void {
    this.componentLogger.info(
      'AUTOMATIC_OPTIMIZATION_TRIGGERED',
      {
        metricName,
        component,
        strategy: this.getOptimizationStrategy(metricName)
      }
    )

    // Implement optimization strategies
    switch (metricName) {
      case 'frame-time':
        this.optimizeFrameTime(component)
        break
      case 'memory-usage':
        this.optimizeMemoryUsage(component)
        break
      case 'touch-response':
        this.optimizeTouchResponse(component)
        break
    }
  }

  private getOptimizationStrategy(metricName: string): string {
    const strategies: Record<string, string> = {
      'frame-time': 'reduce-render-complexity',
      'memory-usage': 'garbage-collection-optimization',
      'touch-response': 'event-throttling-adjustment'
    }
    
    return strategies[metricName] || 'generic-optimization'
  }

  private optimizeFrameTime(component: string): void {
    // Reduce sample rate temporarily
    this.config.sampleRate = Math.max(0.05, this.config.sampleRate * 0.5)
    
    this.componentLogger.info(
      'FRAME_TIME_OPTIMIZATION_APPLIED',
      {
        newSampleRate: this.config.sampleRate,
        component
      }
    )
  }

  private optimizeMemoryUsage(component: string): void {
    // Clear old metrics to free memory
    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.length > 50) {
        this.metrics.set(key, metrics.slice(-25))
      }
    }
    
    this.componentLogger.info(
      'MEMORY_OPTIMIZATION_APPLIED',
      {
        action: 'metric-history-cleanup',
        component
      }
    )
  }

  private optimizeTouchResponse(component: string): void {
    // This would adjust touch event throttling in the unified input handler
    this.componentLogger.info(
      'TOUCH_RESPONSE_OPTIMIZATION_APPLIED',
      {
        action: 'throttling-adjustment',
        component
      }
    )
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageFrameTime: number
    currentFPS: number
    memoryUsage: number
    worstPerformingComponents: string[]
    healthScore: number
  } {
    const averageFrameTime = this.getAverageFrameTime()
    const currentFPS = 1000 / averageFrameTime
    const memoryUsage = this.getCurrentMemoryUsage()
    const worstPerformingComponents = this.getWorstPerformingComponents()
    const healthScore = this.calculateHealthScore()

    return {
      averageFrameTime,
      currentFPS,
      memoryUsage,
      worstPerformingComponents,
      healthScore
    }
  }

  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 16
    
    return this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in (performance as any)) {
      return (performance as any).memory.usedJSHeapSize || 0
    }
    return 0
  }

  private getWorstPerformingComponents(): string[] {
    const componentPerformance: Record<string, number> = {}
    
    for (const [metricName, metricList] of this.metrics.entries()) {
      for (const metric of metricList) {
        if (metric.severity === 'critical' || metric.severity === 'warning') {
          componentPerformance[metric.component] = 
            (componentPerformance[metric.component] || 0) + 1
        }
      }
    }

    return Object.entries(componentPerformance)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([component]) => component)
  }

  private calculateHealthScore(): number {
    const averageFrameTime = this.getAverageFrameTime()
    const frameScore = Math.max(0, 100 - (averageFrameTime - 16) * 2)
    
    const memoryUsage = this.getCurrentMemoryUsage()
    const memoryScore = memoryUsage > 0 ? 
      Math.max(0, 100 - (memoryUsage / this.config.thresholds.memoryUsage) * 100) : 100
    
    return Math.round((frameScore + memoryScore) / 2)
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    this.componentLogger.info(
      'PERFORMANCE_CONFIG_UPDATED',
      {
        updatedFields: Object.keys(newConfig),
        newConfig: this.config
      }
    )
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.memoryObserver) {
      this.memoryObserver.disconnect()
    }

    this.activeTimers.clear()
    this.metrics.clear()
    this.frameTimeHistory.length = 0

    this.componentLogger.info(
      'PERFORMANCE_MONITOR_DESTROYED',
      {
        finalSummary: this.getPerformanceSummary()
      }
    )
  }
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor(component: string, config?: Partial<PerformanceConfig>) {
  const [monitor] = React.useState(() => new PerformanceMonitor(config))
  const [summary, setSummary] = React.useState(() => monitor.getPerformanceSummary())

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSummary(monitor.getPerformanceSummary())
    }, 1000)

    return () => {
      clearInterval(interval)
      monitor.destroy()
    }
  }, [monitor])

  const startTiming = React.useCallback((operation: string) => {
    monitor.startTiming(operation, component)
  }, [monitor, component])

  const endTiming = React.useCallback((operation: string) => {
    return monitor.endTiming(operation, component)
  }, [monitor, component])

  const recordMetric = React.useCallback((
    name: string, 
    value: number, 
    unit: PerformanceMetric['unit']
  ) => {
    monitor.recordMetric(name, value, unit, component)
  }, [monitor, component])

  const measureOperation = React.useCallback(<T,>(
    operation: string,
    fn: () => T
  ): T => {
    startTiming(operation)
    try {
      const result = fn()
      endTiming(operation)
      return result
    } catch (error) {
      endTiming(operation)
      throw error
    }
  }, [startTiming, endTiming])

  return {
    startTiming,
    endTiming,
    recordMetric,
    measureOperation,
    summary,
    updateConfig: (newConfig: Partial<PerformanceConfig>) => monitor.updateConfig(newConfig)
  }
}

/**
 * Higher-order component for automatic performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return React.memo((props: P) => {
    const { measureOperation } = usePerformanceMonitor(componentName)

    return measureOperation('component-render', () => (
      <WrappedComponent {...props} />
    ))
  })
}

