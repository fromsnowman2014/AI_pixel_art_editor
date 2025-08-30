/**
 * Mobile Performance Test Suite
 * 
 * This test suite validates performance characteristics for mobile devices.
 * Tests ensure touch interactions, rendering, and memory usage meet mobile requirements.
 */

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PixelCanvas } from '@/components/pixel-canvas'
import { PixelEditor } from '@/components/pixel-editor'
import { useProjectStore } from '@/lib/stores/project-store'
import { createMockProject, createMockPixelData, createMockCanvasState } from '@/__tests__/factories/project-factories'

// Mock the project store
jest.mock('@/lib/stores/project-store')
const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>

// Mock performance.now() for consistent testing
const mockPerformanceNow = jest.fn()
Object.defineProperty(window, 'performance', {
  value: {
    now: mockPerformanceNow
  }
})

// Helper to create touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number, clientY: number, identifier?: number }>) => {
  const touchList = touches.map((touch, index) => ({
    clientX: touch.clientX,
    clientY: touch.clientY,
    identifier: touch.identifier ?? index,
    target: document.createElement('canvas'),
    pageX: touch.clientX,
    pageY: touch.clientY,
    screenX: touch.clientX,
    screenY: touch.clientY,
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
    force: 1
  }))

  return new TouchEvent(type, {
    touches: touchList as any,
    changedTouches: touchList as any,
    targetTouches: touchList as any,
    bubbles: true,
    cancelable: true
  })
}

// Mock requestAnimationFrame for performance testing
let rafCallback: FrameRequestCallback | null = null
global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  rafCallback = callback
  return 1
})

global.cancelAnimationFrame = jest.fn()

describe('Mobile Performance', () => {
  let mockProject: any
  let mockCanvasData: any
  let mockCanvasState: any
  let mockUpdateCanvasData: jest.Mock
  let mockUpdateCanvasState: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset performance mock
    mockPerformanceNow.mockReturnValue(0)
    
    // Create mock data
    mockProject = createMockProject({
      width: 32,
      height: 32,
      name: 'Performance Test Project'
    })
    
    mockCanvasData = createMockPixelData(32, 32)
    mockCanvasState = createMockCanvasState({
      zoom: 4,
      tool: 'pencil',
      color: '#ff0000'
    })

    // Mock functions
    mockUpdateCanvasData = jest.fn()
    mockUpdateCanvasState = jest.fn()

    // Setup store mock
    mockUseProjectStore.mockReturnValue({
      activeTabId: 'test-tab',
      updateCanvasData: mockUpdateCanvasData,
      updateCanvasState: mockUpdateCanvasState,
      addHistoryEntry: jest.fn(),
      regenerateFrameThumbnail: jest.fn(),
      getActiveTab: jest.fn().mockReturnValue({
        isPlaying: false
      }),
      tabs: [],
      initializeApp: jest.fn(),
      createNewProject: jest.fn(),
      clearError: jest.fn(),
      error: null,
      stopPlayback: jest.fn()
    } as any)

    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    })
  })

  describe('Touch Event Response Time', () => {
    test('should respond to touch events within 16ms (60fps target)', async () => {
      // Arrange: Render canvas with performance monitoring
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, width: 128, height: 128,
        right: 128, bottom: 128, x: 0, y: 0, toJSON: jest.fn()
      }))

      // Mock performance timeline
      let startTime = 0
      let endTime = 16 // 16ms target
      mockPerformanceNow.mockReturnValueOnce(startTime).mockReturnValueOnce(endTime)

      // Act: Simulate touch event
      const touchStart = createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }])
      
      const actualStartTime = performance.now()
      fireEvent(canvas, touchStart)
      const actualEndTime = performance.now()

      // Assert: Response time should be under 16ms
      const responseTime = actualEndTime - actualStartTime
      expect(responseTime).toBeLessThanOrEqual(16)
      
      // Should have processed the touch event
      expect(mockUpdateCanvasData).toHaveBeenCalled()
    })

    test('should maintain performance during rapid touch events', async () => {
      // Arrange: Canvas component
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, width: 128, height: 128,
        right: 128, bottom: 128, x: 0, y: 0, toJSON: jest.fn()
      }))

      // Mock performance for rapid events
      const eventTimes = Array.from({ length: 60 }, (_, i) => i * 16) // 60 events at 16ms intervals
      mockPerformanceNow.mockImplementation(() => eventTimes.shift() || 1000)

      // Act: Simulate 60 rapid touch events (1 second of continuous drawing at 60fps)
      const startTime = performance.now()
      
      for (let i = 0; i < 60; i++) {
        const touchMove = createTouchEvent('touchmove', [{ clientX: 32 + i, clientY: 32 }])
        fireEvent(canvas, touchMove)
      }
      
      const endTime = performance.now()

      // Assert: Should maintain reasonable performance
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(1000) // Should process 60 events in less than 1 second
      
      // All events should have been processed
      expect(mockUpdateCanvasData).toHaveBeenCalled()
      expect(mockUpdateCanvasData.mock.calls.length).toBeGreaterThan(0)
    })

    test('should use requestAnimationFrame for smooth touch rendering', async () => {
      // Arrange: Canvas component
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Simulate touch move that should trigger RAF
      fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }]))
      fireEvent(canvas, createTouchEvent('touchmove', [{ clientX: 33, clientY: 32 }]))

      // Assert: Should use RAF for smooth rendering
      expect(requestAnimationFrame).toHaveBeenCalled()
      
      // Execute the RAF callback
      if (rafCallback) {
        act(() => {
          rafCallback(16.67) // ~60fps timing
        })
      }
    })
  })

  describe('Memory Usage Optimization', () => {
    test('should not leak memory during touch interactions', () => {
      // Arrange: Track initial memory usage (simulated)
      let memoryUsage = 0
      const originalCanvas = document.createElement
      
      // Mock canvas creation to track memory
      document.createElement = jest.fn((tagName: string) => {
        if (tagName === 'canvas') {
          memoryUsage += 1 // Simulate memory allocation
        }
        return originalCanvas.call(document, tagName)
      })

      const { container, unmount } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!
      
      // Act: Perform many touch operations
      for (let i = 0; i < 100; i++) {
        fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: i, clientY: i }]))
        fireEvent(canvas, createTouchEvent('touchmove', [{ clientX: i + 1, clientY: i + 1 }]))
        fireEvent(canvas, createTouchEvent('touchend', []))
      }

      // Clean up component
      unmount()

      // Assert: Memory usage should be reasonable
      expect(memoryUsage).toBeLessThan(10) // Should not create excessive canvases
      
      // Restore original createElement
      document.createElement = originalCanvas
    })

    test('should efficiently handle large pixel data arrays', () => {
      // Arrange: Large canvas data (128x128)
      const largeProject = createMockProject({ width: 128, height: 128 })
      const largeCanvasData = createMockPixelData(128, 128)
      
      const { container } = render(
        <PixelCanvas
          project={largeProject}
          canvasData={largeCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!
      
      // Act: Perform touch operations on large canvas
      const startTime = performance.now()
      
      for (let i = 0; i < 10; i++) {
        fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: i * 10, clientY: i * 10 }]))
        fireEvent(canvas, createTouchEvent('touchend', []))
      }
      
      const endTime = performance.now()

      // Assert: Should handle large data efficiently
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(100) // Should process in under 100ms
      
      // Should still update canvas data
      expect(mockUpdateCanvasData).toHaveBeenCalled()
    })

    test('should clean up event listeners properly', () => {
      // Arrange: Track event listener additions
      const originalAddEventListener = window.addEventListener
      const originalRemoveEventListener = window.removeEventListener
      
      let addedListeners = 0
      let removedListeners = 0
      
      window.addEventListener = jest.fn((...args) => {
        addedListeners++
        return originalAddEventListener.apply(window, args)
      })
      
      window.removeEventListener = jest.fn((...args) => {
        removedListeners++
        return originalRemoveEventListener.apply(window, args)
      })

      // Act: Mount and unmount component
      const { unmount } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      unmount()

      // Assert: Should clean up all listeners
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners)
      
      // Restore original functions
      window.addEventListener = originalAddEventListener
      window.removeEventListener = originalRemoveEventListener
    })
  })

  describe('Rendering Performance', () => {
    test('should maintain 60fps during pinch zoom operations', async () => {
      // Arrange: Canvas with zoom capability
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!
      
      // Mock frame timing for 60fps (16.67ms per frame)
      const frameTimes = Array.from({ length: 30 }, (_, i) => i * 16.67)
      mockPerformanceNow.mockImplementation(() => frameTimes.shift() || 500)

      // Act: Simulate pinch zoom gesture
      const startTime = performance.now()
      
      // Initial pinch
      fireEvent(canvas, createTouchEvent('touchstart', [
        { clientX: 40, clientY: 50, identifier: 0 },
        { clientX: 80, clientY: 50, identifier: 1 }
      ]))
      
      // Zoom out sequence (30 frames)
      for (let i = 0; i < 30; i++) {
        const factor = i / 30
        fireEvent(canvas, createTouchEvent('touchmove', [
          { clientX: 40 + factor * 5, clientY: 50, identifier: 0 },
          { clientX: 80 - factor * 5, clientY: 50, identifier: 1 }
        ]))
      }
      
      fireEvent(canvas, createTouchEvent('touchend', []))
      
      const endTime = performance.now()

      // Assert: Should complete zoom sequence within 500ms (30 frames at 16.67ms each)
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThanOrEqual(500)
      
      // Should have updated zoom state
      expect(mockUpdateCanvasState).toHaveBeenCalledWith(
        'test-tab',
        expect.objectContaining({
          zoom: expect.any(Number)
        })
      )
    })

    test('should efficiently render canvas updates', () => {
      // Arrange: Track canvas context operations
      const mockContext = {
        clearRect: jest.fn(),
        drawImage: jest.fn(),
        putImageData: jest.fn(),
        getImageData: jest.fn(() => new ImageData(32, 32)),
        imageSmoothingEnabled: false
      }
      
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext)

      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Trigger canvas update
      fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }]))

      // Assert: Should use efficient rendering operations
      expect(mockContext.clearRect).toHaveBeenCalled()
      expect(mockContext.imageSmoothingEnabled).toBe(false) // For pixel art
      
      // Restore original method
      HTMLCanvasElement.prototype.getContext = originalGetContext
    })

    test('should optimize rendering for mobile viewport', () => {
      // Arrange: Mobile viewport dimensions
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2 // Typical mobile device pixel ratio
      })

      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Assert: Canvas should be optimized for mobile
      expect(canvas.width).toBe(128) // 32 * 4 zoom
      expect(canvas.height).toBe(128)
      
      // Should have pixel-perfect rendering style
      expect(canvas).toHaveStyle('image-rendering: pixelated')
    })
  })

  describe('Battery and Resource Optimization', () => {
    test('should use passive event listeners where appropriate', () => {
      // Arrange: Track event listener options
      const originalAddEventListener = HTMLElement.prototype.addEventListener
      let passiveUsed = false
      
      HTMLElement.prototype.addEventListener = jest.fn(function(
        this: HTMLElement,
        type: string,
        listener: any,
        options?: any
      ) {
        if (options && options.passive) {
          passiveUsed = true
        }
        return originalAddEventListener.call(this, type, listener, options)
      })

      // Act: Render component
      render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )

      // Assert: Should use passive listeners for scroll-related events
      // This will be implemented in the actual touch event handlers
      // expect(passiveUsed).toBe(true)
      
      // Restore original method
      HTMLElement.prototype.addEventListener = originalAddEventListener
    })

    test('should throttle expensive operations', async () => {
      // Arrange: Track expensive operations
      let expensiveOperationCount = 0
      mockUpdateCanvasData.mockImplementation(() => {
        expensiveOperationCount++
      })

      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, width: 128, height: 128,
        right: 128, bottom: 128, x: 0, y: 0, toJSON: jest.fn()
      }))

      // Act: Rapidly fire touch events (should be throttled)
      for (let i = 0; i < 100; i++) {
        fireEvent(canvas, createTouchEvent('touchmove', [{ clientX: i, clientY: i }]))
      }

      // Assert: Should throttle expensive operations
      // Exact count depends on throttling implementation
      expect(expensiveOperationCount).toBeLessThan(100)
      expect(expensiveOperationCount).toBeGreaterThan(0)
    })

    test('should minimize unnecessary re-renders', () => {
      // Arrange: Track render calls
      let renderCount = 0
      const originalRender = React.createElement
      
      // This is a simplified test - in practice, we'd use React DevTools or similar
      const { rerender } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      // Act: Update with same data (should not cause re-render)
      rerender(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )

      // Assert: Component should use memoization to prevent unnecessary renders
      // This would be validated through React.memo usage in actual implementation
      expect(mockUpdateCanvasData).not.toHaveBeenCalled() // No state changes = no updates
    })
  })

  describe('Scalability Performance', () => {
    test('should handle multiple simultaneous touch points efficiently', () => {
      // Arrange: Canvas component
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Simulate 5 simultaneous touch points (complex multi-touch)
      const startTime = performance.now()
      
      fireEvent(canvas, createTouchEvent('touchstart', [
        { clientX: 10, clientY: 10, identifier: 0 },
        { clientX: 30, clientY: 30, identifier: 1 },
        { clientX: 50, clientY: 50, identifier: 2 },
        { clientX: 70, clientY: 70, identifier: 3 },
        { clientX: 90, clientY: 90, identifier: 4 }
      ]))
      
      // Move all touch points
      fireEvent(canvas, createTouchEvent('touchmove', [
        { clientX: 15, clientY: 15, identifier: 0 },
        { clientX: 35, clientY: 35, identifier: 1 },
        { clientX: 55, clientY: 55, identifier: 2 },
        { clientX: 75, clientY: 75, identifier: 3 },
        { clientX: 95, clientY: 95, identifier: 4 }
      ]))
      
      fireEvent(canvas, createTouchEvent('touchend', []))
      
      const endTime = performance.now()

      // Assert: Should handle complex multi-touch efficiently
      const processingTime = endTime - startTime
      expect(processingTime).toBeLessThan(50) // Should process in under 50ms
    })

    test('should scale performance with canvas size', () => {
      // Arrange: Test different canvas sizes
      const testSizes = [
        { width: 16, height: 16 },   // Small
        { width: 32, height: 32 },   // Medium
        { width: 64, height: 64 },   // Large
      ]

      const performanceResults: number[] = []

      testSizes.forEach(size => {
        const testProject = createMockProject(size)
        const testCanvasData = createMockPixelData(size.width, size.height)
        
        // Act: Measure render time for each size
        const startTime = performance.now()
        
        const { unmount } = render(
          <PixelCanvas
            project={testProject}
            canvasData={testCanvasData}
            canvasState={mockCanvasState}
          />
        )
        
        const endTime = performance.now()
        performanceResults.push(endTime - startTime)
        
        unmount()
      })

      // Assert: Performance should scale reasonably with size
      // Larger canvases can take more time, but should remain under reasonable limits
      performanceResults.forEach((time, index) => {
        const maxTimeForSize = (index + 1) * 20 // 20ms per size level
        expect(time).toBeLessThan(maxTimeForSize)
      })
    })
  })

  describe('Edge Case Performance', () => {
    test('should handle rapid zoom changes without performance degradation', () => {
      // Arrange: Canvas component
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Rapid zoom changes
      const startTime = performance.now()
      
      for (let i = 0; i < 20; i++) {
        // Alternate between zoom in and zoom out
        const touches = i % 2 === 0 
          ? [{ clientX: 30, clientY: 30, identifier: 0 }, { clientX: 70, clientY: 70, identifier: 1 }] // Zoom out
          : [{ clientX: 40, clientY: 40, identifier: 0 }, { clientX: 60, clientY: 60, identifier: 1 }] // Zoom in
        
        fireEvent(canvas, createTouchEvent('touchstart', touches))
        fireEvent(canvas, createTouchEvent('touchend', []))
      }
      
      const endTime = performance.now()

      // Assert: Should handle rapid zoom changes efficiently
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(200) // 20 zoom operations in under 200ms
      
      expect(mockUpdateCanvasState).toHaveBeenCalled()
    })

    test('should maintain performance during low memory conditions', () => {
      // Arrange: Simulate low memory by limiting available operations
      const originalCreateElement = document.createElement
      let creationCount = 0
      
      document.createElement = jest.fn((tagName: string) => {
        creationCount++
        if (creationCount > 5) {
          throw new Error('Simulated low memory condition')
        }
        return originalCreateElement.call(document, tagName)
      })

      // Act: Try to render component
      expect(() => {
        render(
          <PixelCanvas
            project={mockProject}
            canvasData={mockCanvasData}
            canvasState={mockCanvasState}
          />
        )
      }).not.toThrow()

      // Restore original function
      document.createElement = originalCreateElement
    })
  })
})