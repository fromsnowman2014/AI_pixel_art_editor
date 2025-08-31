'use client'

import React from 'react'

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
  userAgent: string
  supportsHover: boolean
}

export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * SSR-safe device detection utility
 * Returns default desktop values during SSR, actual values on client
 */
export function getDeviceInfo(): DeviceInfo {
  // SSR-safe defaults (assume desktop during server rendering)
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      screenWidth: 1920,
      screenHeight: 1080,
      orientation: 'landscape',
      userAgent: '',
      supportsHover: true
    }
  }

  const width = window.innerWidth
  const height = window.innerHeight
  const userAgent = navigator.userAgent.toLowerCase()

  // Mobile detection based on screen size and user agent
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isMobileScreen = width <= 768
  const isMobile = isMobileUA || isMobileScreen

  // Tablet detection
  const isTabletUA = /ipad|android(?!.*mobile)/i.test(userAgent)
  const isTabletScreen = width > 768 && width <= 1024 && isTouchDevice()
  const isTablet = isTabletUA || isTabletScreen

  // Desktop detection
  const isDesktop = !isMobile && !isTablet

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice: isTouchDevice(),
    screenWidth: width,
    screenHeight: height,
    orientation: height > width ? 'portrait' : 'landscape',
    userAgent,
    supportsHover: window.matchMedia('(hover: hover)').matches
  }
}

/**
 * Check if device supports touch input
 * SSR-safe implementation
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  return 'ontouchstart' in window || 
         navigator.maxTouchPoints > 0 || 
         (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
}

/**
 * Get safe area insets for mobile devices (iPhone notch, etc.)
 * Returns 0 values during SSR or on non-supporting devices
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }

  // Try to get CSS env() values
  const computedStyle = getComputedStyle(document.documentElement)
  
  return {
    top: parseFloat(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
    right: parseFloat(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0,
    bottom: parseFloat(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
    left: parseFloat(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0
  }
}

/**
 * Check if current device should use mobile UI
 * This is the main function to determine UI variant
 */
export function shouldUseMobileUI(): boolean {
  // During SSR, always return false (desktop) to prevent hydration mismatch
  if (typeof window === 'undefined') {
    return false
  }
  
  const deviceInfo = getDeviceInfo()
  return deviceInfo.isMobile || (deviceInfo.isTablet && deviceInfo.isTouchDevice)
}

/**
 * Get optimal layout configuration based on device
 */
export function getOptimalLayoutConfig() {
  const deviceInfo = getDeviceInfo()
  const safeArea = getSafeAreaInsets()

  if (deviceInfo.isMobile) {
    return {
      layoutType: 'mobile' as const,
      toolbarPlacement: deviceInfo.orientation === 'portrait' ? 'bottom' : 'left',
      timelinePlacement: deviceInfo.orientation === 'portrait' ? 'bottom' : 'right',
      colorPalettePlacement: 'modal', // Use modal/overlay for mobile
      touchTargetSize: 44, // iOS HIG minimum
      componentSpacing: 8,
      safeArea,
      gridLayout: deviceInfo.orientation === 'portrait' 
        ? 'single-column' 
        : 'horizontal-compact'
    }
  }

  if (deviceInfo.isTablet) {
    return {
      layoutType: 'tablet' as const,
      toolbarPlacement: 'sidebar',
      timelinePlacement: 'bottom',
      colorPalettePlacement: 'sidebar',
      touchTargetSize: 32,
      componentSpacing: 12,
      safeArea,
      gridLayout: 'grid-cols-[280px_1fr_300px]'
    }
  }

  // Desktop layout (current implementation)
  return {
    layoutType: 'desktop' as const,
    toolbarPlacement: 'sidebar',
    timelinePlacement: 'bottom',
    colorPalettePlacement: 'sidebar',
    touchTargetSize: 24,
    componentSpacing: 16,
    safeArea,
    gridLayout: 'grid-cols-[minmax(280px,320px)_1fr_minmax(350px,400px)]'
  }
}

/**
 * React hook for device detection with automatic updates
 * Updates when window resizes or device orientation changes
 * SSR-safe implementation
 */
export function useDeviceDetection() {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(() => getDeviceInfo())
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    // Mark as hydrated after first render
    setIsHydrated(true)
    
    const updateDeviceInfo = () => {
      setDeviceInfo(getDeviceInfo())
    }

    // Update on resize and orientation change
    window.addEventListener('resize', updateDeviceInfo)
    window.addEventListener('orientationchange', updateDeviceInfo)
    
    // Initial update after hydration
    updateDeviceInfo()

    return () => {
      window.removeEventListener('resize', updateDeviceInfo)
      window.removeEventListener('orientationchange', updateDeviceInfo)
    }
  }, [])

  // Return SSR-safe device info (desktop defaults during SSR)
  return isHydrated ? deviceInfo : getDeviceInfo()
}

/**
 * React hook for layout configuration
 */
export function useLayoutConfig() {
  const deviceInfo = useDeviceDetection()
  return React.useMemo(() => getOptimalLayoutConfig(), [deviceInfo])
}