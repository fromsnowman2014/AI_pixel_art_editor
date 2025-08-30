/**
 * Responsive Layout Manager
 * 
 * Unified layout system that handles desktop/mobile/tablet layouts
 * with structured logging and error recovery patterns.
 */

import React from 'react'
import { logger, createComponentLogger } from '@/lib/ui/smart-logger'

export interface DeviceCapabilities {
  hasTouch: boolean
  hasKeyboard: boolean
  hasMouse: boolean
  supportsHover: boolean
  screenSize: 'mobile' | 'tablet' | 'desktop'
  orientation: 'portrait' | 'landscape'
  safeAreaInsets: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export interface LayoutConfiguration {
  toolbarPlacement: 'sidebar' | 'floating' | 'bottom-bar' | 'compact-sidebar'
  timelinePlacement: 'bottom' | 'side' | 'overlay' | 'integrated'
  colorPalettePlacement: 'sidebar' | 'floating' | 'bottom' | 'integrated'
  touchTargetSize: number
  gridLayout: string
  componentSpacing: number
}

export interface OptimalLayout {
  config: LayoutConfiguration
  css: {
    container: string
    toolbar: string
    canvas: string
    timeline: string
    colorPalette: string
  }
  breakpoints: {
    mobile: number
    tablet: number
    desktop: number
  }
}

/**
 * Responsive Layout Manager Class
 */
export class ResponsiveLayoutManager {
  private componentLogger = createComponentLogger('ResponsiveLayoutManager')
  private currentCapabilities: DeviceCapabilities | null = null
  private currentLayout: OptimalLayout | null = null
  private resizeObserver: ResizeObserver | null = null
  private mediaQueryLists: MediaQueryList[] = []

  constructor() {
    this.componentLogger.info(
      'LAYOUT_MANAGER_INITIALIZED',
      {
        userAgent: navigator.userAgent,
        screenDimensions: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    )
    
    this.detectCapabilities()
    this.setupMediaQueries()
  }

  private detectCapabilities(): DeviceCapabilities {
    const capabilities: DeviceCapabilities = {
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      hasKeyboard: !this.isMobileDevice(),
      hasMouse: window.matchMedia('(pointer: fine)').matches,
      supportsHover: window.matchMedia('(hover: hover)').matches,
      screenSize: this.getScreenSize(),
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      safeAreaInsets: this.getSafeAreaInsets()
    }

    this.currentCapabilities = capabilities
    
    this.componentLogger.debug(
      'DEVICE_CAPABILITIES_DETECTED',
      {
        capabilities,
        detectionMethod: 'media-queries'
      }
    )

    return capabilities
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  private getScreenSize(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth
    
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private getSafeAreaInsets(): DeviceCapabilities['safeAreaInsets'] {
    const style = getComputedStyle(document.documentElement)
    
    return {
      top: parseInt(style.getPropertyValue('--sat') || '0px'),
      bottom: parseInt(style.getPropertyValue('--sab') || '0px'),
      left: parseInt(style.getPropertyValue('--sal') || '0px'),
      right: parseInt(style.getPropertyValue('--sar') || '0px')
    }
  }

  private setupMediaQueries(): void {
    const queries = [
      '(max-width: 767px)', // Mobile
      '(min-width: 768px) and (max-width: 1023px)', // Tablet
      '(min-width: 1024px)', // Desktop
      '(orientation: portrait)',
      '(orientation: landscape)',
      '(pointer: coarse)', // Touch devices
      '(pointer: fine)', // Mouse devices
      '(hover: hover)', // Hover-capable devices
    ]

    this.mediaQueryLists = queries.map(query => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', this.handleMediaQueryChange.bind(this))
      return mql
    })

    this.componentLogger.debug(
      'MEDIA_QUERIES_SETUP',
      {
        queryCount: queries.length,
        queries
      }
    )
  }

  private handleMediaQueryChange(event: MediaQueryListEvent): void {
    this.componentLogger.info(
      'MEDIA_QUERY_CHANGE',
      {
        query: event.media,
        matches: event.matches,
        timestamp: performance.now()
      }
    )

    // Re-detect capabilities and recalculate layout
    this.detectCapabilities()
    this.calculateOptimalLayout()
  }

  /**
   * Calculate optimal layout based on current device capabilities
   */
  calculateOptimalLayout(): OptimalLayout {
    if (!this.currentCapabilities) {
      this.detectCapabilities()
    }

    const caps = this.currentCapabilities!
    let layout: OptimalLayout

    try {
      if (caps.screenSize === 'mobile') {
        layout = this.getMobileLayout(caps)
      } else if (caps.screenSize === 'tablet') {
        layout = this.getTabletLayout(caps)
      } else {
        layout = this.getDesktopLayout(caps)
      }

      this.currentLayout = layout
      
      this.componentLogger.info(
        'OPTIMAL_LAYOUT_CALCULATED',
        {
          screenSize: caps.screenSize,
          orientation: caps.orientation,
          layoutConfig: layout.config
        }
      )

      return layout
    } catch (error) {
      this.componentLogger.error(
        'LAYOUT_CALCULATION_ERROR',
        {
          capabilities: caps,
          fallbackStrategy: 'default-desktop-layout'
        },
        error
      )

      // Fallback to safe desktop layout
      return this.getDesktopLayout(caps)
    }
  }

  private getMobileLayout(caps: DeviceCapabilities): OptimalLayout {
    const isPortrait = caps.orientation === 'portrait'
    
    return {
      config: {
        toolbarPlacement: isPortrait ? 'floating' : 'compact-sidebar',
        timelinePlacement: isPortrait ? 'bottom' : 'integrated',
        colorPalettePlacement: isPortrait ? 'floating' : 'integrated',
        touchTargetSize: 44,
        gridLayout: isPortrait 
          ? 'flex flex-col' 
          : 'grid grid-cols-[80px_1fr_200px]',
        componentSpacing: 8
      },
      css: {
        container: 'h-screen flex flex-col bg-gray-50',
        toolbar: isPortrait 
          ? 'mobile-floating-toolbar' 
          : 'border-r border-gray-200 bg-white overflow-y-auto',
        canvas: 'flex-1 min-h-0 bg-gray-100',
        timeline: isPortrait 
          ? 'flex-shrink-0 border-t border-gray-200 bg-white max-h-[120px]'
          : 'flex-shrink-0 border-t border-gray-200 bg-white max-h-[80px]',
        colorPalette: 'flex-shrink-0'
      },
      breakpoints: {
        mobile: 767,
        tablet: 1023,
        desktop: 1024
      }
    }
  }

  private getTabletLayout(caps: DeviceCapabilities): OptimalLayout {
    return {
      config: {
        toolbarPlacement: 'sidebar',
        timelinePlacement: 'bottom',
        colorPalettePlacement: 'sidebar',
        touchTargetSize: 44,
        gridLayout: 'grid grid-cols-[minmax(260px,300px)_1fr]',
        componentSpacing: 12
      },
      css: {
        container: 'h-screen flex flex-col bg-gray-50',
        toolbar: 'border-r border-gray-200 bg-white overflow-y-auto',
        canvas: 'flex-1 overflow-auto min-h-[250px]',
        timeline: 'flex-shrink-0 border-t border-gray-200 bg-white p-2 max-h-[200px] min-h-[120px]',
        colorPalette: 'min-w-0'
      },
      breakpoints: {
        mobile: 767,
        tablet: 1023,
        desktop: 1024
      }
    }
  }

  private getDesktopLayout(caps: DeviceCapabilities): OptimalLayout {
    return {
      config: {
        toolbarPlacement: 'sidebar',
        timelinePlacement: 'bottom',
        colorPalettePlacement: 'sidebar',
        touchTargetSize: caps.hasTouch ? 44 : 32,
        gridLayout: 'grid grid-cols-[minmax(260px,300px)_1fr_minmax(320px,380px)] xl:grid-cols-[minmax(280px,320px)_1fr_minmax(350px,400px)]',
        componentSpacing: 16
      },
      css: {
        container: 'h-screen flex flex-col bg-gray-50',
        toolbar: 'border-r border-gray-200 bg-white overflow-y-auto',
        canvas: 'flex-1 overflow-auto min-h-[200px] md:min-h-[300px]',
        timeline: 'flex-shrink-0 border-t border-gray-200 bg-white p-2 md:p-3 max-h-[280px] min-h-[160px] md:min-h-[180px]',
        colorPalette: 'min-w-0'
      },
      breakpoints: {
        mobile: 767,
        tablet: 1023,
        desktop: 1024
      }
    }
  }

  /**
   * Get current layout with error handling
   */
  getCurrentLayout(): OptimalLayout {
    if (!this.currentLayout) {
      this.componentLogger.warn(
        'LAYOUT_NOT_CALCULATED',
        {
          fallbackAction: 'recalculate-layout'
        }
      )
      return this.calculateOptimalLayout()
    }

    return this.currentLayout
  }

  /**
   * Get current device capabilities
   */
  getCurrentCapabilities(): DeviceCapabilities {
    if (!this.currentCapabilities) {
      this.componentLogger.warn(
        'CAPABILITIES_NOT_DETECTED',
        {
          fallbackAction: 'redetect-capabilities'
        }
      )
      return this.detectCapabilities()
    }

    return this.currentCapabilities
  }

  /**
   * Check if layout needs recalculation
   */
  shouldRecalculateLayout(): boolean {
    if (!this.currentCapabilities || !this.currentLayout) {
      return true
    }

    const newCaps = this.detectCapabilities()
    const changed = 
      newCaps.screenSize !== this.currentCapabilities.screenSize ||
      newCaps.orientation !== this.currentCapabilities.orientation

    if (changed) {
      this.componentLogger.info(
        'LAYOUT_RECALCULATION_NEEDED',
        {
          previousScreenSize: this.currentCapabilities.screenSize,
          newScreenSize: newCaps.screenSize,
          previousOrientation: this.currentCapabilities.orientation,
          newOrientation: newCaps.orientation
        }
      )
    }

    return changed
  }

  /**
   * Apply layout to component classes
   */
  applyLayout(component: keyof OptimalLayout['css']): string {
    const layout = this.getCurrentLayout()
    const cssClass = layout.css[component]
    
    this.componentLogger.debug(
      'LAYOUT_APPLIED',
      {
        component,
        cssClass,
        layoutConfig: layout.config
      }
    )

    return cssClass
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    this.mediaQueryLists.forEach(mql => {
      mql.removeEventListener('change', this.handleMediaQueryChange.bind(this))
    })

    this.componentLogger.info(
      'LAYOUT_MANAGER_DESTROYED',
      {
        finalLayout: this.currentLayout?.config,
        finalCapabilities: this.currentCapabilities
      }
    )
  }
}

/**
 * React hook for responsive layout management
 */
export function useResponsiveLayout(component: string): {
  layout: OptimalLayout
  capabilities: DeviceCapabilities
  applyLayout: (componentName: keyof OptimalLayout['css']) => string
  shouldRecalculate: boolean
} {
  const [manager] = React.useState(() => new ResponsiveLayoutManager())
  const [layout, setLayout] = React.useState<OptimalLayout>(() => manager.calculateOptimalLayout())
  const [capabilities, setCapabilities] = React.useState<DeviceCapabilities>(() => manager.getCurrentCapabilities())

  React.useEffect(() => {
    const handleResize = () => {
      if (manager.shouldRecalculateLayout()) {
        const newLayout = manager.calculateOptimalLayout()
        const newCapabilities = manager.getCurrentCapabilities()
        
        setLayout(newLayout)
        setCapabilities(newCapabilities)
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      manager.destroy()
    }
  }, [manager])

  const applyLayout = React.useCallback((componentName: keyof OptimalLayout['css']) => {
    return manager.applyLayout(componentName)
  }, [manager])

  const shouldRecalculate = React.useMemo(() => {
    return manager.shouldRecalculateLayout()
  }, [manager, layout])

  return {
    layout,
    capabilities,
    applyLayout,
    shouldRecalculate
  }
}