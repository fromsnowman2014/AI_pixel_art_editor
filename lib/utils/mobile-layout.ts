/**
 * Mobile Layout Detection Utilities
 * 
 * This module provides utilities for detecting and responding to mobile layout changes,
 * including screen orientation, viewport size, and device-specific features.
 */

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isPortrait: boolean
  isLandscape: boolean
  viewportWidth: number
  viewportHeight: number
  devicePixelRatio: number
  isTouch: boolean
  isIOS: boolean
  isAndroid: boolean
  supportsHover: boolean
  safeAreaInsets: SafeAreaInsets
}

export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface LayoutBreakpoints {
  mobile: number
  tablet: number
  desktop: number
  largeDesktop: number
}

export interface ResponsiveConfig {
  breakpoints: LayoutBreakpoints
  enableDynamicViewport: boolean
  watchOrientationChanges: boolean
  debounceMs: number
}

const DEFAULT_BREAKPOINTS: LayoutBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
  largeDesktop: 1920
}

const DEFAULT_CONFIG: ResponsiveConfig = {
  breakpoints: DEFAULT_BREAKPOINTS,
  enableDynamicViewport: true,
  watchOrientationChanges: true,
  debounceMs: 150
}

/**
 * Get current device and layout information
 */
export function getDeviceInfo(): DeviceInfo {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const devicePixelRatio = window.devicePixelRatio || 1
  
  // Device type detection
  const isMobile = viewportWidth < DEFAULT_BREAKPOINTS.mobile
  const isTablet = viewportWidth >= DEFAULT_BREAKPOINTS.mobile && viewportWidth < DEFAULT_BREAKPOINTS.desktop
  const isDesktop = viewportWidth >= DEFAULT_BREAKPOINTS.desktop
  
  // Orientation detection
  const isPortrait = viewportHeight > viewportWidth
  const isLandscape = viewportWidth > viewportHeight
  
  // Touch support detection
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  // Platform detection
  const userAgent = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
  const isAndroid = /android/.test(userAgent)
  
  // Hover support detection (important for mobile vs desktop behavior)
  const supportsHover = window.matchMedia('(hover: hover)').matches
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape,
    viewportWidth,
    viewportHeight,
    devicePixelRatio,
    isTouch,
    isIOS,
    isAndroid,
    supportsHover,
    safeAreaInsets: getSafeAreaInsets()
  }
}

/**
 * Get CSS safe area insets (for devices with notches, home indicators, etc.)
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  const getInset = (property: string): number => {
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('padding', `env(${property})`)) {
      const testElement = document.createElement('div')
      testElement.style.position = 'fixed'
      testElement.style.top = '0'
      testElement.style.left = '0'
      testElement.style.padding = `env(${property}) 0 0 0`
      testElement.style.visibility = 'hidden'
      testElement.style.pointerEvents = 'none'
      
      document.body.appendChild(testElement)
      const computedStyle = window.getComputedStyle(testElement)
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0
      document.body.removeChild(testElement)
      
      return paddingTop
    }
    return 0
  }

  return {
    top: getInset('safe-area-inset-top'),
    right: getInset('safe-area-inset-right'),
    bottom: getInset('safe-area-inset-bottom'),
    left: getInset('safe-area-inset-left')
  }
}

/**
 * Mobile Layout Manager Class
 */
export class MobileLayoutManager {
  private config: ResponsiveConfig
  private listeners: Set<(deviceInfo: DeviceInfo) => void> = new Set()
  private currentDeviceInfo: DeviceInfo
  private debounceTimer: number | null = null
  private orientationChangeTimer: number | null = null

  constructor(config: Partial<ResponsiveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.currentDeviceInfo = getDeviceInfo()
    
    this.setupEventListeners()
  }

  /**
   * Get current device information
   */
  getCurrentDeviceInfo(): DeviceInfo {
    return { ...this.currentDeviceInfo }
  }

  /**
   * Subscribe to device info changes
   */
  subscribe(callback: (deviceInfo: DeviceInfo) => void): () => void {
    this.listeners.add(callback)
    
    // Call immediately with current info
    callback(this.currentDeviceInfo)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Check if current layout matches specific criteria
   */
  matches(query: Partial<DeviceInfo>): boolean {
    return Object.entries(query).every(([key, value]) => {
      return this.currentDeviceInfo[key as keyof DeviceInfo] === value
    })
  }

  /**
   * Get optimal layout configuration for current device
   */
  getOptimalLayout(): {
    gridColumns: string
    toolbarPosition: 'top' | 'bottom' | 'left' | 'right'
    timelinePosition: 'top' | 'bottom' | 'left' | 'right'
    panelVisibility: 'visible' | 'hidden' | 'collapsible'
    touchTargetSize: number
  } {
    const { isMobile, isTablet, isPortrait, isLandscape } = this.currentDeviceInfo

    if (isMobile) {
      return {
        gridColumns: 'grid-cols-1',
        toolbarPosition: 'bottom',
        timelinePosition: 'bottom',
        panelVisibility: 'hidden',
        touchTargetSize: 56
      }
    }

    if (isTablet) {
      if (isPortrait) {
        return {
          gridColumns: 'grid-cols-1 md:grid-cols-[300px_1fr]',
          toolbarPosition: 'left',
          timelinePosition: 'bottom',
          panelVisibility: 'collapsible',
          touchTargetSize: 48
        }
      } else {
        return {
          gridColumns: 'grid-cols-[250px_1fr_300px]',
          toolbarPosition: 'left',
          timelinePosition: 'right',
          panelVisibility: 'visible',
          touchTargetSize: 44
        }
      }
    }

    // Desktop
    return {
      gridColumns: 'grid-cols-[280px_1fr_350px]',
      toolbarPosition: 'left',
      timelinePosition: 'bottom',
      panelVisibility: 'visible',
      touchTargetSize: 32
    }
  }

  /**
   * Setup event listeners for layout changes
   */
  private setupEventListeners(): void {
    // Viewport size changes
    window.addEventListener('resize', this.handleResize)
    
    // Orientation changes (mobile-specific)
    if (this.config.watchOrientationChanges) {
      window.addEventListener('orientationchange', this.handleOrientationChange)
      
      // Also listen to resize for orientation changes on some devices
      window.addEventListener('resize', this.handleOrientationChange)
    }

    // Media query changes for hover support
    const hoverQuery = window.matchMedia('(hover: hover)')
    if (hoverQuery.addEventListener) {
      hoverQuery.addEventListener('change', this.handleResize)
    } else {
      // Fallback for older browsers
      hoverQuery.addListener(this.handleResize)
    }
  }

  /**
   * Handle viewport resize
   */
  private handleResize = (): void => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = window.setTimeout(() => {
      this.updateDeviceInfo()
    }, this.config.debounceMs)
  }

  /**
   * Handle orientation change
   */
  private handleOrientationChange = (): void => {
    // iOS Safari needs extra time to update viewport after orientation change
    if (this.orientationChangeTimer) {
      clearTimeout(this.orientationChangeTimer)
    }

    this.orientationChangeTimer = window.setTimeout(() => {
      this.updateDeviceInfo()
    }, this.config.debounceMs + 100)
  }

  /**
   * Update device info and notify subscribers
   */
  private updateDeviceInfo(): void {
    const newDeviceInfo = getDeviceInfo()
    
    // Check if anything significant changed
    const hasChanged = this.hasSignificantChange(this.currentDeviceInfo, newDeviceInfo)
    
    if (hasChanged) {
      this.currentDeviceInfo = newDeviceInfo
      this.notifyListeners()
    }
  }

  /**
   * Check if device info has significantly changed
   */
  private hasSignificantChange(old: DeviceInfo, current: DeviceInfo): boolean {
    const significantProps: (keyof DeviceInfo)[] = [
      'isMobile', 'isTablet', 'isDesktop', 'isPortrait', 'isLandscape'
    ]

    return significantProps.some(prop => old[prop] !== current[prop]) ||
           Math.abs(old.viewportWidth - current.viewportWidth) > 50 ||
           Math.abs(old.viewportHeight - current.viewportHeight) > 50
  }

  /**
   * Notify all subscribers of device info changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentDeviceInfo)
      } catch (error) {
        console.error('Error in layout change listener:', error)
      }
    })
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('orientationchange', this.handleOrientationChange)
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    
    if (this.orientationChangeTimer) {
      clearTimeout(this.orientationChangeTimer)
    }
    
    this.listeners.clear()
  }
}

/**
 * React hook for using mobile layout manager
 */
export function useMobileLayout(config?: Partial<ResponsiveConfig>) {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(() => getDeviceInfo())
  const [layoutManager] = React.useState(() => new MobileLayoutManager(config))

  React.useEffect(() => {
    const unsubscribe = layoutManager.subscribe(setDeviceInfo)
    
    return () => {
      unsubscribe()
      layoutManager.destroy()
    }
  }, [layoutManager])

  const optimalLayout = React.useMemo(() => {
    return layoutManager.getOptimalLayout()
  }, [layoutManager, deviceInfo])

  return {
    deviceInfo,
    optimalLayout,
    matches: (query: Partial<DeviceInfo>) => layoutManager.matches(query)
  }
}

/**
 * Utility functions for responsive design
 */
export const responsive = {
  /**
   * Get responsive class name based on device type
   */
  getClassName(mobile: string, tablet?: string, desktop?: string): string {
    const device = getDeviceInfo()
    
    if (device.isMobile) return mobile
    if (device.isTablet && tablet) return tablet
    if (device.isDesktop && desktop) return desktop
    
    return mobile // fallback
  },

  /**
   * Get responsive value based on device type
   */
  getValue<T>(mobile: T, tablet?: T, desktop?: T): T {
    const device = getDeviceInfo()
    
    if (device.isMobile) return mobile
    if (device.isTablet && tablet !== undefined) return tablet
    if (device.isDesktop && desktop !== undefined) return desktop
    
    return mobile // fallback
  },

  /**
   * Check if viewport matches media query
   */
  matchesQuery(query: string): boolean {
    return window.matchMedia(query).matches
  },

  /**
   * Get dynamic viewport dimensions (accounts for mobile browser UI)
   */
  getDynamicViewport(): { width: number, height: number } {
    // Try to get the actual viewport size (excluding mobile browser UI)
    const visualViewport = (window as any).visualViewport
    
    if (visualViewport) {
      return {
        width: visualViewport.width,
        height: visualViewport.height
      }
    }

    // Fallback to window dimensions
    return {
      width: window.innerWidth,
      height: window.innerHeight
    }
  }
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * CSS custom properties utility for responsive design
 */
export function setCSSCustomProperties(): void {
  const deviceInfo = getDeviceInfo()
  const root = document.documentElement
  
  // Set device info as CSS custom properties
  root.style.setProperty('--viewport-width', `${deviceInfo.viewportWidth}px`)
  root.style.setProperty('--viewport-height', `${deviceInfo.viewportHeight}px`)
  root.style.setProperty('--device-pixel-ratio', deviceInfo.devicePixelRatio.toString())
  root.style.setProperty('--safe-area-inset-top', `${deviceInfo.safeAreaInsets.top}px`)
  root.style.setProperty('--safe-area-inset-right', `${deviceInfo.safeAreaInsets.right}px`)
  root.style.setProperty('--safe-area-inset-bottom', `${deviceInfo.safeAreaInsets.bottom}px`)
  root.style.setProperty('--safe-area-inset-left', `${deviceInfo.safeAreaInsets.left}px`)
  
  // Set device flags
  root.style.setProperty('--is-mobile', deviceInfo.isMobile ? '1' : '0')
  root.style.setProperty('--is-tablet', deviceInfo.isTablet ? '1' : '0')
  root.style.setProperty('--is-desktop', deviceInfo.isDesktop ? '1' : '0')
  root.style.setProperty('--is-portrait', deviceInfo.isPortrait ? '1' : '0')
  root.style.setProperty('--is-landscape', deviceInfo.isLandscape ? '1' : '0')
  root.style.setProperty('--is-touch', deviceInfo.isTouch ? '1' : '0')
  root.style.setProperty('--supports-hover', deviceInfo.supportsHover ? '1' : '0')
}

// Make sure to import React for the hook
import React from 'react'