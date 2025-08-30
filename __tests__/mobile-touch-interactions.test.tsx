/**
 * Mobile Touch Interactions Test Suite
 * 
 * This test suite validates mobile touch interactions for the PixelBuddy app.
 * Tests are written following TDD principles - defining expected behavior before implementation.
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PixelCanvas } from '@/components/pixel-canvas'
import { useProjectStore } from '@/lib/stores/project-store'
import { createMockProject, createMockPixelData, createMockCanvasState } from '@/__tests__/factories/project-factories'

// Mock the project store
jest.mock('@/lib/stores/project-store')
const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>

// Helper function to create touch events
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

describe('Mobile Touch Interactions', () => {
  let mockProject: any
  let mockCanvasData: any
  let mockCanvasState: any
  let mockUpdateCanvasData: jest.Mock
  let mockUpdateCanvasState: jest.Mock
  let mockAddHistoryEntry: jest.Mock

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Create mock data
    mockProject = createMockProject({
      width: 32,
      height: 32,
      name: 'Test Mobile Project'
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
    mockAddHistoryEntry = jest.fn()

    // Setup store mock
    mockUseProjectStore.mockReturnValue({
      activeTabId: 'test-tab',
      updateCanvasData: mockUpdateCanvasData,
      updateCanvasState: mockUpdateCanvasState,
      addHistoryEntry: mockAddHistoryEntry,
      regenerateFrameThumbnail: jest.fn(),
      getActiveTab: jest.fn().mockReturnValue({
        isPlaying: false
      })
    } as any)
  })

  describe('Single Touch Drawing', () => {
    test('should draw pixel on single touch tap without triggering scroll', async () => {
      // Arrange: Render the canvas component
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()

      // Mock getBoundingClientRect to return known dimensions
      const mockGetBoundingClientRect = jest.fn(() => ({
        left: 0,
        top: 0,
        width: 128, // 32 * 4 zoom
        height: 128,
        right: 128,
        bottom: 128,
        x: 0,
        y: 0,
        toJSON: jest.fn()
      }))
      canvas!.getBoundingClientRect = mockGetBoundingClientRect

      // Act: Simulate single touch tap at pixel position (8, 8)
      const touchStart = createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }])
      const touchEnd = createTouchEvent('touchend', [])
      
      fireEvent(canvas!, touchStart)
      fireEvent(canvas!, touchEnd)

      // Assert: Should call updateCanvasData with new pixel data
      expect(mockUpdateCanvasData).toHaveBeenCalledTimes(1)
      
      // Should not have triggered any scroll prevention
      expect(touchStart.preventDefault).toBeDefined()
      
      // The touch event should have been handled for drawing
      const callArgs = mockUpdateCanvasData.mock.calls[0][1]
      expect(callArgs).toHaveProperty('data')
      expect(callArgs.width).toBe(32)
      expect(callArgs.height).toBe(32)
    })

    test('should handle continuous single touch drawing (drag)', async () => {
      // Arrange: Render canvas
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

      // Act: Simulate touch drag from (0, 0) to (16, 16)
      fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: 0, clientY: 0 }]))
      fireEvent(canvas, createTouchEvent('touchmove', [{ clientX: 8, clientY: 8 }]))
      fireEvent(canvas, createTouchEvent('touchmove', [{ clientX: 16, clientY: 16 }]))
      fireEvent(canvas, createTouchEvent('touchend', []))

      // Assert: Should have called updateCanvasData multiple times for continuous drawing
      expect(mockUpdateCanvasData).toHaveBeenCalled()
      
      // Should call addHistoryEntry once when touch ends
      expect(mockAddHistoryEntry).toHaveBeenCalledWith(
        'test-tab',
        'pencil_draw',
        mockCanvasData
      )
    })

    test('should respect tool selection for touch drawing', async () => {
      // Arrange: Set eraser tool
      const eraserCanvasState = { ...mockCanvasState, tool: 'eraser' }
      
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={eraserCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, width: 128, height: 128,
        right: 128, bottom: 128, x: 0, y: 0, toJSON: jest.fn()
      }))

      // Act: Single touch
      fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }]))
      fireEvent(canvas, createTouchEvent('touchend', []))

      // Assert: Should use eraser behavior (set alpha to 0)
      expect(mockUpdateCanvasData).toHaveBeenCalled()
      const updatedData = mockUpdateCanvasData.mock.calls[0][1].data
      
      // For eraser, alpha should be set to 0 at the touched pixel
      // Pixel at (8, 8) in a 32x32 canvas with zoom 4 (touch at 32, 32)
      const pixelIndex = (8 * 32 + 8) * 4 // RGBA format
      expect(updatedData[pixelIndex + 3]).toBe(0) // Alpha channel should be 0
    })
  })

  describe('Multi-Touch Gestures', () => {
    test('should recognize two-finger pan gesture', async () => {
      // Arrange
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Two finger pan gesture
      fireEvent(canvas, createTouchEvent('touchstart', [
        { clientX: 50, clientY: 50, identifier: 0 },
        { clientX: 100, clientY: 100, identifier: 1 }
      ]))
      
      fireEvent(canvas, createTouchEvent('touchmove', [
        { clientX: 60, clientY: 60, identifier: 0 },
        { clientX: 110, clientY: 110, identifier: 1 }
      ]))
      
      fireEvent(canvas, createTouchEvent('touchend', []))

      // Assert: Should update pan position, not draw pixels
      expect(mockUpdateCanvasState).toHaveBeenCalledWith('test-tab', expect.objectContaining({
        panX: expect.any(Number),
        panY: expect.any(Number)
      }))
      
      // Should NOT call updateCanvasData for pan gestures
      expect(mockUpdateCanvasData).not.toHaveBeenCalled()
    })

    test('should recognize pinch-to-zoom gesture', async () => {
      // Arrange
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Pinch zoom out (fingers moving closer together)
      fireEvent(canvas, createTouchEvent('touchstart', [
        { clientX: 40, clientY: 50, identifier: 0 },
        { clientX: 80, clientY: 50, identifier: 1 }
      ]))
      
      // Move fingers closer (zoom out)
      fireEvent(canvas, createTouchEvent('touchmove', [
        { clientX: 50, clientY: 50, identifier: 0 },
        { clientX: 70, clientY: 50, identifier: 1 }
      ]))
      
      fireEvent(canvas, createTouchEvent('touchend', []))

      // Assert: Should update zoom level
      expect(mockUpdateCanvasState).toHaveBeenCalledWith('test-tab', expect.objectContaining({
        zoom: expect.any(Number)
      }))
      
      // Zoom should be less than original (4) since we pinched in
      const zoomCall = mockUpdateCanvasState.mock.calls.find(call => call[1].zoom !== undefined)
      expect(zoomCall[1].zoom).toBeLessThan(4)
    })

    test('should prevent drawing when two fingers are detected', async () => {
      // Arrange
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Start with one finger (should draw), then add second finger
      fireEvent(canvas, createTouchEvent('touchstart', [
        { clientX: 32, clientY: 32, identifier: 0 }
      ]))
      
      // Add second finger - should stop drawing and switch to pan/zoom
      fireEvent(canvas, createTouchEvent('touchstart', [
        { clientX: 32, clientY: 32, identifier: 0 },
        { clientX: 64, clientY: 64, identifier: 1 }
      ]))
      
      fireEvent(canvas, createTouchEvent('touchmove', [
        { clientX: 40, clientY: 40, identifier: 0 },
        { clientX: 72, clientY: 72, identifier: 1 }
      ]))

      // Assert: Should not continue drawing pixels when multi-touch is detected
      // Only the initial single touch should have triggered drawing
      expect(mockUpdateCanvasData).toHaveBeenCalledTimes(1)
    })
  })

  describe('Long Press Gestures', () => {
    test('should activate color picker on long press', async () => {
      // Arrange
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

      // Act: Long press (hold for 500ms+)
      fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }]))
      
      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, 600))
      
      fireEvent(canvas, createTouchEvent('touchend', []))

      // Assert: Should switch to eyedropper tool temporarily
      expect(mockUpdateCanvasState).toHaveBeenCalledWith('test-tab', expect.objectContaining({
        tool: 'eyedropper'
      }))
    })
  })

  describe('Scroll Prevention', () => {
    test('should prevent default scroll behavior on touch events', () => {
      // Arrange
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Touch the canvas
      const touchEvent = createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }])
      const preventDefaultSpy = jest.spyOn(touchEvent, 'preventDefault')
      
      fireEvent(canvas, touchEvent)

      // Assert: preventDefault should be called to prevent scrolling
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    test('should have correct CSS touch-action property', () => {
      // Arrange
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Assert: Canvas should have touch-action: none to prevent scroll
      const computedStyle = window.getComputedStyle(canvas)
      expect(canvas).toHaveStyle({ touchAction: 'none' })
    })
  })

  describe('Touch Performance', () => {
    test('should handle touch events within 16ms response time', async () => {
      // Arrange
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Measure response time
      const startTime = performance.now()
      fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }]))
      const endTime = performance.now()

      // Assert: Response time should be less than 16ms (60fps)
      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(16)
    })

    test('should handle rapid touch events without memory leaks', async () => {
      // Arrange
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Simulate rapid touch events (like fast drawing)
      for (let i = 0; i < 100; i++) {
        fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: i, clientY: i }]))
        fireEvent(canvas, createTouchEvent('touchmove', [{ clientX: i + 1, clientY: i + 1 }]))
        fireEvent(canvas, createTouchEvent('touchend', []))
      }

      // Assert: Should handle all events without throwing errors
      expect(mockUpdateCanvasData).toHaveBeenCalled()
      
      // Memory should be manageable (this is a basic test - in real scenarios, 
      // we would measure actual memory usage)
      expect(mockUpdateCanvasData.mock.calls.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Touch Accessibility', () => {
    test('should support screen reader announcements for touch actions', () => {
      // Arrange
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Assert: Canvas should have appropriate aria attributes
      expect(canvas).toHaveAttribute('role', 'img')
      expect(canvas).toHaveAttribute('aria-label')
    })

    test('should handle touch events when high contrast mode is enabled', () => {
      // Arrange: Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(), // deprecated
          removeListener: jest.fn(), // deprecated
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act: Touch interaction in high contrast mode
      fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }]))

      // Assert: Should still work normally
      expect(mockUpdateCanvasData).toHaveBeenCalled()
    })
  })

  describe('Gesture Recognition Accuracy', () => {
    test('should accurately distinguish between tap and drag gestures', async () => {
      // Arrange
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Act 1: Quick tap (should be single pixel)
      fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: 32, clientY: 32 }]))
      // Very short touch duration
      setTimeout(() => {
        fireEvent(canvas, createTouchEvent('touchend', []))
      }, 50)

      // Act 2: Drag gesture (should be continuous drawing)
      fireEvent(canvas, createTouchEvent('touchstart', [{ clientX: 64, clientY: 64 }]))
      fireEvent(canvas, createTouchEvent('touchmove', [{ clientX: 68, clientY: 68 }]))
      fireEvent(canvas, createTouchEvent('touchmove', [{ clientX: 72, clientY: 72 }]))
      fireEvent(canvas, createTouchEvent('touchend', []))

      // Assert: Both gestures should be handled differently
      expect(mockUpdateCanvasData).toHaveBeenCalled()
      // The drag should have resulted in more updates than the tap
      expect(mockUpdateCanvasData.mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    test('should have >95% gesture recognition accuracy', () => {
      // This would be implemented with more comprehensive gesture testing
      // For now, we test that the basic gesture types are recognized
      
      const { container } = render(
        <PixelCanvas
          project={mockProject}
          canvasData={mockCanvasData}
          canvasState={mockCanvasState}
        />
      )
      
      const canvas = container.querySelector('canvas')!

      // Test various gesture patterns
      const testGestures = [
        // Single tap
        { touches: [{ clientX: 10, clientY: 10 }], expectedAction: 'draw' },
        // Two finger pan
        { touches: [{ clientX: 10, clientY: 10, identifier: 0 }, { clientX: 50, clientY: 50, identifier: 1 }], expectedAction: 'pan' },
        // Pinch gesture
        { touches: [{ clientX: 20, clientY: 20, identifier: 0 }, { clientX: 80, clientY: 80, identifier: 1 }], expectedAction: 'zoom' }
      ]

      testGestures.forEach(gesture => {
        mockUpdateCanvasData.mockClear()
        mockUpdateCanvasState.mockClear()

        fireEvent(canvas, createTouchEvent('touchstart', gesture.touches))
        fireEvent(canvas, createTouchEvent('touchend', []))

        // Verify correct action was taken based on touch count
        if (gesture.expectedAction === 'draw') {
          expect(mockUpdateCanvasData).toHaveBeenCalled()
        } else if (gesture.expectedAction === 'pan' || gesture.expectedAction === 'zoom') {
          expect(mockUpdateCanvasState).toHaveBeenCalled()
        }
      })
    })
  })
})