/**
 * Haptic Feedback Utilities
 * 
 * This module provides haptic feedback functionality for mobile devices.
 * Supports various types of haptic feedback with fallbacks for different platforms.
 */

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

export interface HapticConfig {
  enabled: boolean
  intensity: number // 0.0 to 1.0
  fallbackToVibration: boolean
  debugMode: boolean
}

const DEFAULT_CONFIG: HapticConfig = {
  enabled: true,
  intensity: 1.0,
  fallbackToVibration: true,
  debugMode: false
}

/**
 * Haptic Feedback Manager Class
 */
export class HapticFeedbackManager {
  private config: HapticConfig
  private isSupported: boolean
  private hasVibrationAPI: boolean
  private hasHapticEngine: boolean

  constructor(config: Partial<HapticConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.isSupported = this.checkHapticSupport()
    this.hasVibrationAPI = 'vibrate' in navigator
    this.hasHapticEngine = this.checkHapticEngine()
  }

  /**
   * Check if haptic feedback is supported on this device
   */
  private checkHapticSupport(): boolean {
    // Check for various haptic APIs
    return (
      'vibrate' in navigator ||
      'haptics' in window ||
      this.checkHapticEngine() ||
      this.checkWebKitHaptics()
    )
  }

  /**
   * Check for iOS Taptic Engine support
   */
  private checkHapticEngine(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('haptics' in window || 'webkit' in window && 'haptics' in (window as any).webkit)
    )
  }

  /**
   * Check for WebKit haptic support (iOS Safari)
   */
  private checkWebKitHaptics(): boolean {
    return (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'userAgent' in navigator &&
      /iPhone|iPad|iPod/.test(navigator.userAgent) &&
      'ontouchstart' in window
    )
  }

  /**
   * Trigger haptic feedback
   */
  async triggerFeedback(type: HapticFeedbackType): Promise<boolean> {
    if (!this.config.enabled || !this.isSupported) {
      this.log(`Haptic feedback disabled or not supported`, { type })
      return false
    }

    try {
      // Try iOS Haptic Engine first (most sophisticated)
      if (await this.tryiOSHaptics(type)) {
        return true
      }

      // Try Web Vibration API
      if (this.tryVibrationAPI(type)) {
        return true
      }

      // Try experimental haptic APIs
      if (await this.tryExperimentalHaptics(type)) {
        return true
      }

      this.log(`No haptic method succeeded for type: ${type}`)
      return false
    } catch (error) {
      this.log(`Haptic feedback error:`, error)
      return false
    }
  }

  /**
   * Try iOS Taptic Engine haptics
   */
  private async tryiOSHaptics(type: HapticFeedbackType): Promise<boolean> {
    if (!this.hasHapticEngine) return false

    try {
      // iOS 10+ Taptic Engine
      if ((window as any).webkit?.haptics) {
        const haptics = (window as any).webkit.haptics
        
        switch (type) {
          case 'light':
          case 'selection':
            await haptics.impact('light')
            break
          case 'medium':
            await haptics.impact('medium')
            break
          case 'heavy':
          case 'error':
            await haptics.impact('heavy')
            break
          case 'success':
            await haptics.notification('success')
            break
          case 'warning':
            await haptics.notification('warning')
            break
          default:
            await haptics.impact('light')
        }
        
        this.log(`iOS haptics triggered: ${type}`)
        return true
      }

      // Try alternative iOS haptic methods
      if ((window as any).haptics) {
        await (window as any).haptics.impact(this.mapToiOSIntensity(type))
        this.log(`iOS haptics (alternative) triggered: ${type}`)
        return true
      }

    } catch (error) {
      this.log(`iOS haptics failed:`, error)
    }

    return false
  }

  /**
   * Try Web Vibration API
   */
  private tryVibrationAPI(type: HapticFeedbackType): boolean {
    if (!this.hasVibrationAPI || !this.config.fallbackToVibration) return false

    try {
      const pattern = this.getVibrationPattern(type)
      const success = navigator.vibrate(pattern)
      
      if (success) {
        this.log(`Vibration API triggered: ${type}`, { pattern })
        return true
      }
    } catch (error) {
      this.log(`Vibration API failed:`, error)
    }

    return false
  }

  /**
   * Try experimental haptic APIs
   */
  private async tryExperimentalHaptics(type: HapticFeedbackType): Promise<boolean> {
    try {
      // Chrome Android haptic feedback (experimental)
      if ('actuate' in navigator && typeof (navigator as any).actuate === 'function') {
        await (navigator as any).actuate(this.mapToActuateType(type))
        this.log(`Chrome haptics triggered: ${type}`)
        return true
      }

      // GamePad haptic feedback (if gamepad connected)
      if ('getGamepads' in navigator) {
        const gamepads = navigator.getGamepads()
        for (const gamepad of gamepads) {
          if (gamepad && gamepad.vibrationActuator) {
            const intensity = this.config.intensity * this.mapToIntensity(type)
            await gamepad.vibrationActuator.playEffect('dual-rumble', {
              duration: this.getHapticDuration(type),
              strongMagnitude: intensity,
              weakMagnitude: intensity * 0.5
            })
            this.log(`Gamepad haptics triggered: ${type}`)
            return true
          }
        }
      }
    } catch (error) {
      this.log(`Experimental haptics failed:`, error)
    }

    return false
  }

  /**
   * Map feedback type to iOS intensity
   */
  private mapToiOSIntensity(type: HapticFeedbackType): 'light' | 'medium' | 'heavy' {
    switch (type) {
      case 'light':
      case 'selection':
        return 'light'
      case 'medium':
      case 'success':
      case 'warning':
        return 'medium'
      case 'heavy':
      case 'error':
        return 'heavy'
      default:
        return 'light'
    }
  }

  /**
   * Get vibration pattern for feedback type
   */
  private getVibrationPattern(type: HapticFeedbackType): number | number[] {
    const baseIntensity = Math.round(this.config.intensity * 100)

    switch (type) {
      case 'light':
      case 'selection':
        return [baseIntensity * 0.1] // 10ms
      case 'medium':
        return [baseIntensity * 0.2] // 20ms
      case 'heavy':
        return [baseIntensity * 0.4] // 40ms
      case 'success':
        return [baseIntensity * 0.1, 50, baseIntensity * 0.1] // Double tap
      case 'warning':
        return [baseIntensity * 0.15, 100, baseIntensity * 0.15, 100, baseIntensity * 0.15] // Triple tap
      case 'error':
        return [baseIntensity * 0.3, 100, baseIntensity * 0.3] // Strong double tap
      default:
        return [baseIntensity * 0.1]
    }
  }

  /**
   * Map feedback type to Chrome actuate type
   */
  private mapToActuateType(type: HapticFeedbackType): string {
    switch (type) {
      case 'light':
      case 'selection':
        return 'tap'
      case 'medium':
        return 'press'
      case 'heavy':
      case 'error':
        return 'thud'
      case 'success':
        return 'tick'
      case 'warning':
        return 'bump'
      default:
        return 'tap'
    }
  }

  /**
   * Map feedback type to intensity value
   */
  private mapToIntensity(type: HapticFeedbackType): number {
    switch (type) {
      case 'light':
      case 'selection':
        return 0.2
      case 'medium':
      case 'success':
      case 'warning':
        return 0.5
      case 'heavy':
      case 'error':
        return 1.0
      default:
        return 0.2
    }
  }

  /**
   * Get haptic duration for feedback type
   */
  private getHapticDuration(type: HapticFeedbackType): number {
    switch (type) {
      case 'light':
      case 'selection':
        return 50
      case 'medium':
      case 'success':
        return 100
      case 'heavy':
      case 'warning':
      case 'error':
        return 200
      default:
        return 50
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HapticConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Check if haptic feedback is available
   */
  isAvailable(): boolean {
    return this.isSupported && this.config.enabled
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.debugMode) {
      console.log(`[HapticFeedback] ${message}`, data)
    }
  }
}

// Global haptic feedback instance
let globalHapticManager: HapticFeedbackManager | null = null

/**
 * Get or create global haptic feedback manager
 */
export function getHapticManager(config?: Partial<HapticConfig>): HapticFeedbackManager {
  if (!globalHapticManager) {
    globalHapticManager = new HapticFeedbackManager(config)
  } else if (config) {
    globalHapticManager.updateConfig(config)
  }
  
  return globalHapticManager
}

/**
 * Convenience function to trigger haptic feedback
 */
export async function triggerHaptic(type: HapticFeedbackType): Promise<boolean> {
  const manager = getHapticManager()
  return await manager.triggerFeedback(type)
}

/**
 * React hook for haptic feedback
 */
export function useHapticFeedback(config?: Partial<HapticConfig>) {
  const [manager] = React.useState(() => new HapticFeedbackManager(config))

  const trigger = React.useCallback(async (type: HapticFeedbackType) => {
    return await manager.triggerFeedback(type)
  }, [manager])

  const isAvailable = React.useMemo(() => {
    return manager.isAvailable()
  }, [manager])

  const updateConfig = React.useCallback((newConfig: Partial<HapticConfig>) => {
    manager.updateConfig(newConfig)
  }, [manager])

  return {
    trigger,
    isAvailable,
    updateConfig
  }
}

/**
 * Context-specific haptic feedback functions
 */
export const hapticPresets = {
  /**
   * Drawing/painting feedback
   */
  draw: () => triggerHaptic('light'),
  
  /**
   * Tool selection feedback
   */
  selectTool: () => triggerHaptic('selection'),
  
  /**
   * UI interaction feedback
   */
  buttonPress: () => triggerHaptic('light'),
  
  /**
   * Success actions (save, export, etc.)
   */
  success: () => triggerHaptic('success'),
  
  /**
   * Error feedback
   */
  error: () => triggerHaptic('error'),
  
  /**
   * Warning feedback
   */
  warning: () => triggerHaptic('warning'),
  
  /**
   * Long press detected
   */
  longPress: () => triggerHaptic('medium'),
  
  /**
   * Zoom/pan gesture
   */
  gestureStart: () => triggerHaptic('light'),
  
  /**
   * Frame navigation
   */
  frameChange: () => triggerHaptic('light')
}

// Import React for the hook
import React from 'react'