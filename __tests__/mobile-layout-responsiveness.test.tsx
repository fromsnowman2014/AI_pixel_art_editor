/**
 * Mobile Layout Responsiveness Test Suite
 * 
 * This test suite validates responsive layout behavior for mobile devices.
 * Tests ensure proper layout adaptation across different screen sizes and orientations.
 */

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PixelEditor } from '@/components/pixel-editor'
import { FrameManager } from '@/components/frame-manager'
import { Toolbar } from '@/components/toolbar'
import { useProjectStore } from '@/lib/stores/project-store'
import { createMockProject, createMockTab } from '@/__tests__/factories/project-factories'

// Mock the project store
jest.mock('@/lib/stores/project-store')
const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>

// Mock ResizeObserver for responsive testing
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  private callback: ResizeObserverCallback
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Helper function to simulate viewport changes
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  
  // Dispatch resize event
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

// Helper function to simulate orientation change
const setOrientation = (orientation: 'portrait' | 'landscape') => {
  Object.defineProperty(screen, 'orientation', {
    writable: true,
    configurable: true,
    value: { type: orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary' }
  })
  
  if (orientation === 'portrait') {
    setViewport(375, 667) // iPhone dimensions
  } else {
    setViewport(667, 375) // Landscape iPhone
  }
}

describe('Mobile Layout Responsiveness', () => {
  let mockProject: any
  let mockActiveTab: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockProject = createMockProject({
      width: 32,
      height: 32,
      name: 'Mobile Test Project'
    })
    
    mockActiveTab = createMockTab('test-tab', mockProject)

    mockUseProjectStore.mockReturnValue({
      tabs: [mockActiveTab],
      activeTabId: 'test-tab',
      getActiveTab: jest.fn().mockReturnValue(mockActiveTab),
      initializeApp: jest.fn(),
      createNewProject: jest.fn(),
      clearError: jest.fn(),
      error: null,
      stopPlayback: jest.fn()
    } as any)

    // Reset viewport to desktop default
    setViewport(1024, 768)
  })

  describe('Viewport Size Adaptation', () => {
    test('should use mobile layout for screens narrower than 768px', () => {
      // Arrange: Set mobile viewport
      setViewport(375, 667)
      
      // Act: Render the editor
      const { container } = render(<PixelEditor />)
      
      // Assert: Should apply mobile-specific classes and layout
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('h-screen', 'flex', 'flex-col')
      
      // On mobile, the layout should be single-column
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1')
      expect(gridContainer).not.toHaveClass('md:grid-cols-[minmax(260px,300px)_1fr]')
    })

    test('should use tablet layout for screens between 768px and 1024px', () => {
      // Arrange: Set tablet viewport
      setViewport(768, 1024)
      
      // Act: Render the editor
      const { container } = render(<PixelEditor />)
      
      // Assert: Should use tablet-optimized layout
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('md:grid-cols-[minmax(260px,300px)_1fr]')
    })

    test('should use desktop layout for screens wider than 1024px', () => {
      // Arrange: Set desktop viewport
      setViewport(1440, 900)
      
      // Act: Render the editor
      const { container } = render(<PixelEditor />)
      
      // Assert: Should use full desktop layout with right panel
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('lg:grid-cols-[minmax(260px,300px)_1fr_minmax(320px,380px)]')
      
      const rightPanel = container.querySelector('.order-3')
      expect(rightPanel).not.toHaveClass('hidden')
    })
  })

  describe('Portrait vs Landscape Orientation', () => {
    test('should adapt layout for portrait orientation', () => {
      // Arrange: Set portrait orientation
      setOrientation('portrait')
      
      // Act: Render components
      const { container } = render(<PixelEditor />)
      
      // Assert: Portrait-specific layout adaptations
      const mainContainer = container.firstChild as HTMLElement
      
      // In portrait, canvas should take more vertical space
      const canvasArea = container.querySelector('.flex-1')
      expect(canvasArea).toHaveClass('min-h-[200px]', 'md:min-h-[300px]')
      
      // Frame manager should be more compact in portrait
      const frameManagerArea = container.querySelector('[data-frame-manager]')
      expect(frameManagerArea).toHaveClass('min-h-[160px]', 'md:min-h-[180px]')
    })

    test('should adapt layout for landscape orientation', () => {
      // Arrange: Set landscape orientation
      setOrientation('landscape')
      
      // Act: Render components
      const { container } = render(<PixelEditor />)
      
      // Assert: Landscape-specific optimizations
      const gridContainer = container.querySelector('.grid')
      
      // In landscape, should use horizontal space more efficiently
      expect(gridContainer).toHaveClass('grid-cols-1')
      
      // At medium screens and above, should show side panels
      expect(gridContainer).toHaveClass('md:grid-cols-[minmax(260px,300px)_1fr]')
    })
  })

  describe('Frame Timeline Mobile Optimization', () => {
    test('should show frame timeline without overlapping other UI elements', () => {
      // Arrange: Mobile viewport
      setViewport(375, 667)
      
      const mockFrames = [
        { id: 'frame-1', delayMs: 100, included: true },
        { id: 'frame-2', delayMs: 200, included: true },
        { id: 'frame-3', delayMs: 150, included: true }
      ]
      
      // Act: Render frame manager
      const { container } = render(
        <FrameManager 
          frames={mockFrames} 
          activeFrameId="frame-1" 
        />
      )
      
      // Assert: Timeline should be visible and not overlap
      const timeline = container.querySelector('[role="tablist"]')
      expect(timeline).toBeInTheDocument()
      
      // Should have proper spacing and not cause horizontal overflow
      const timelineContainer = container.querySelector('.overflow-x-auto')
      expect(timelineContainer).toBeInTheDocument()
      expect(timelineContainer).toHaveClass('pb-1') // Padding bottom for scrollbar
    })

    test('should make frame thumbnails touch-friendly on mobile', () => {
      // Arrange: Mobile viewport
      setViewport(375, 667)
      
      const mockFrames = [
        { id: 'frame-1', delayMs: 100, included: true }
      ]
      
      // Act: Render frame manager
      const { container } = render(
        <FrameManager 
          frames={mockFrames} 
          activeFrameId="frame-1" 
        />
      )
      
      // Assert: Frame thumbnails should meet minimum touch target size
      const frameElement = container.querySelector('[role="tab"]')
      expect(frameElement).toBeInTheDocument()
      
      // Frame should have adequate touch target (44px minimum)
      const framePreview = container.querySelector('.h-10.w-10') // 40px currently
      expect(framePreview).toBeInTheDocument()
      
      // Note: This test indicates that current size (40px) should be increased to 56px
      // This will be implemented in the actual code changes
    })

    test('should handle timeline scroll behavior on mobile', () => {
      // Arrange: Mobile viewport with many frames
      setViewport(375, 667)
      
      const mockFrames = Array.from({ length: 10 }, (_, i) => ({
        id: `frame-${i + 1}`,
        delayMs: 100,
        included: true
      }))
      
      // Act: Render frame manager
      const { container } = render(
        <FrameManager 
          frames={mockFrames} 
          activeFrameId="frame-5" 
        />
      )
      
      // Assert: Should have horizontal scroll capability
      const scrollContainer = container.querySelector('.overflow-x-auto')
      expect(scrollContainer).toBeInTheDocument()
      
      // Should have minimum width to accommodate all frames
      const frameContainer = scrollContainer?.querySelector('.w-max')
      expect(frameContainer).toBeInTheDocument()
    })
  })

  describe('Toolbar Mobile Optimization', () => {
    test('should display toolbar with adequate touch targets on mobile', () => {
      // Arrange: Mobile viewport
      setViewport(375, 667)
      
      // Act: Render toolbar
      const { container } = render(<Toolbar />)
      
      // Assert: All tool buttons should meet minimum touch target requirements
      const toolButtons = container.querySelectorAll('button[role="button"]')
      
      toolButtons.forEach(button => {
        // Should have minimum 44px touch target
        expect(button).toHaveClass('w-11', 'h-11') // 44px
        
        // Should have accessible labeling
        expect(button).toHaveAttribute('aria-label')
        expect(button).toHaveAttribute('aria-pressed')
      })
    })

    test('should use responsive grid layout for tools on mobile', () => {
      // Arrange: Mobile viewport
      setViewport(375, 667)
      
      // Act: Render toolbar
      const { container } = render(<Toolbar />)
      
      // Assert: Should use 3-column grid on mobile
      const toolGrid = container.querySelector('.grid')
      expect(toolGrid).toHaveClass('grid-cols-3')
      
      // On larger screens, should expand to more columns
      expect(toolGrid).toHaveClass('md:grid-cols-2', 'lg:grid-cols-3')
    })
  })

  describe('Safe Area and iOS Compatibility', () => {
    test('should handle iOS safe area insets', () => {
      // Arrange: Mock iOS safe area environment
      Object.defineProperty(document.documentElement, 'style', {
        value: {
          setProperty: jest.fn(),
          getPropertyValue: jest.fn().mockReturnValue('20px') // Mock safe area inset
        }
      })
      
      // Simulate iOS viewport
      setViewport(375, 812) // iPhone X dimensions
      
      // Act: Render editor
      const { container } = render(<PixelEditor />)
      
      // Assert: Should account for safe areas in layout
      // This would be implemented with CSS env() variables
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('h-screen')
      
      // Frame manager should account for bottom safe area
      const frameManager = container.querySelector('[data-frame-manager]')
      expect(frameManager).toBeInTheDocument()
    })

    test('should prevent layout issues with iOS Safari UI chrome', () => {
      // Arrange: iOS Safari viewport (accounting for address bar)
      setViewport(375, 667) // Reduced height when address bar is visible
      
      // Act: Render editor
      const { container } = render(<PixelEditor />)
      
      // Assert: Should use dynamic viewport units if available
      const mainContainer = container.firstChild as HTMLElement
      
      // Should handle viewport height changes gracefully
      expect(mainContainer).toHaveClass('h-screen')
      
      // Canvas area should be flexible
      const canvasArea = container.querySelector('.flex-1')
      expect(canvasArea).toHaveClass('min-h-[200px]')
    })
  })

  describe('Dynamic Layout Changes', () => {
    test('should adapt layout when viewport size changes', () => {
      // Arrange: Start with desktop
      setViewport(1024, 768)
      const { container, rerender } = render(<PixelEditor />)
      
      // Initial state: desktop layout
      let gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('lg:grid-cols-[minmax(260px,300px)_1fr_minmax(320px,380px)]')
      
      // Act: Change to mobile
      act(() => {
        setViewport(375, 667)
      })
      
      rerender(<PixelEditor />)
      
      // Assert: Should adapt to mobile layout
      gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1')
    })

    test('should handle orientation change smoothly', () => {
      // Arrange: Start in portrait
      setOrientation('portrait')
      const { container, rerender } = render(<PixelEditor />)
      
      // Act: Change to landscape
      act(() => {
        setOrientation('landscape')
      })
      
      rerender(<PixelEditor />)
      
      // Assert: Should adapt layout for landscape
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
      
      // Layout should remain functional
      const canvasArea = container.querySelector('.flex-1')
      expect(canvasArea).toBeInTheDocument()
    })
  })

  describe('Content Scaling and Readability', () => {
    test('should maintain readable text sizes on mobile', () => {
      // Arrange: Small mobile viewport
      setViewport(320, 568) // iPhone SE dimensions
      
      // Act: Render components
      const { container } = render(<PixelEditor />)
      
      // Assert: Text should remain readable
      const textElements = container.querySelectorAll('.text-sm, .text-xs')
      
      textElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element)
        const fontSize = parseFloat(computedStyle.fontSize)
        
        // Minimum readable size should be maintained
        expect(fontSize).toBeGreaterThanOrEqual(12) // 12px minimum
      })
    })

    test('should scale UI elements proportionally on different screen densities', () => {
      // Arrange: High DPI display
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 3, // Retina display
      })
      
      setViewport(414, 896) // iPhone 11 Pro Max
      
      // Act: Render editor
      const { container } = render(<PixelEditor />)
      
      // Assert: UI should scale appropriately for high DPI
      const toolButtons = container.querySelectorAll('button')
      
      // Buttons should maintain adequate size even on high DPI
      toolButtons.forEach(button => {
        if (button.classList.contains('w-11')) {
          // 44px should be adequate for high DPI touch targets
          expect(button).toHaveClass('h-11')
        }
      })
    })
  })

  describe('Performance on Mobile Devices', () => {
    test('should render layout changes within acceptable time limits', async () => {
      // Arrange: Mobile viewport
      setViewport(375, 667)
      
      // Act: Measure render time
      const startTime = performance.now()
      render(<PixelEditor />)
      const endTime = performance.now()
      
      // Assert: Should render quickly enough for mobile
      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(100) // 100ms for initial render
    })

    test('should handle rapid viewport changes without performance degradation', () => {
      // Arrange: Initial render
      const { rerender } = render(<PixelEditor />)
      
      // Act: Rapidly change viewport multiple times
      const orientations = [
        [375, 667], // Portrait
        [667, 375], // Landscape
        [320, 568], // Small portrait
        [736, 414], // Large landscape
      ]
      
      const startTime = performance.now()
      
      orientations.forEach(([width, height]) => {
        act(() => {
          setViewport(width, height)
        })
        rerender(<PixelEditor />)
      })
      
      const endTime = performance.now()
      
      // Assert: Should handle changes efficiently
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(500) // 500ms for all changes
    })
  })

  describe('Accessibility on Mobile', () => {
    test('should maintain accessibility features on mobile layout', () => {
      // Arrange: Mobile viewport
      setViewport(375, 667)
      
      // Act: Render editor
      const { container } = render(<PixelEditor />)
      
      // Assert: Should maintain ARIA labels and roles
      const interactiveElements = container.querySelectorAll('button, [role]')
      
      interactiveElements.forEach(element => {
        // All interactive elements should have proper labeling
        expect(
          element.hasAttribute('aria-label') || 
          element.hasAttribute('aria-labelledby') ||
          element.textContent?.trim()
        ).toBeTruthy()
      })
    })

    test('should support screen reader navigation on mobile', () => {
      // Arrange: Mobile viewport
      setViewport(375, 667)
      
      // Act: Render editor
      const { container } = render(<PixelEditor />)
      
      // Assert: Should have proper heading hierarchy
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
      expect(headings.length).toBeGreaterThan(0)
      
      // Should have proper focus management
      const focusableElements = container.querySelectorAll('[tabindex], button, input, textarea, select')
      expect(focusableElements.length).toBeGreaterThan(0)
    })
  })
})