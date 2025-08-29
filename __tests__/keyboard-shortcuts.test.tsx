/**
 * Keyboard Shortcuts Test Suite
 * 
 * Tests for undo/redo keyboard shortcuts and other critical keyboard functionality.
 * Ensures Command+Z/Ctrl+Z and related shortcuts work properly across the application.
 */

import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useProjectStore } from '@/lib/stores/project-store'
import { TopToolbar } from '@/components/top-toolbar'

// Mock the project store
jest.mock('@/lib/stores/project-store')
const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ onClick, children, className, disabled, ...props }: any) => (
    <button onClick={onClick} className={className} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ content, children }: any) => (
    <div data-tooltip={content}>{children}</div>
  )
}))

jest.mock('@/components/import-modal', () => ({
  ImportModal: () => <div data-testid="import-modal" />
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  RotateCcw: () => <div data-testid="undo-icon" />,
  RotateCw: () => <div data-testid="redo-icon" />,
  ZoomIn: () => <div data-testid="zoom-in-icon" />,
  ZoomOut: () => <div data-testid="zoom-out-icon" />,
  Maximize2: () => <div data-testid="fit-screen-icon" />,
  Minimize2: () => <div data-testid="reset-view-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
}))

describe('Keyboard Shortcuts', () => {
  const mockUndo = jest.fn()
  const mockRedo = jest.fn()
  const mockUpdateCanvasState = jest.fn()

  const createMockStore = (overrides = {}) => ({
    activeTabId: 'tab-1',
    getActiveTab: () => ({
      id: 'tab-1',
      canvasState: {
        zoom: 4,
        panX: 0,
        panY: 0,
        tool: 'pencil' as const
      },
      historyIndex: 1,
      history: [{}, {}, {}] // 3 items in history
    }),
    updateCanvasState: mockUpdateCanvasState,
    undo: mockUndo,
    redo: mockRedo,
    ...overrides
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseProjectStore.mockReturnValue(createMockStore() as any)
  })

  describe('Undo/Redo Keyboard Shortcuts', () => {
    test('should trigger undo with Ctrl+Z on Windows/Linux', () => {
      render(<TopToolbar />)

      // Simulate Ctrl+Z
      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefault: jest.fn()
      })

      expect(mockUndo).toHaveBeenCalledWith('tab-1')
    })

    test('should trigger undo with Cmd+Z on Mac', () => {
      render(<TopToolbar />)

      // Simulate Cmd+Z
      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
        preventDefault: jest.fn()
      })

      expect(mockUndo).toHaveBeenCalledWith('tab-1')
    })

    test('should trigger redo with Ctrl+Shift+Z', () => {
      render(<TopToolbar />)

      // Simulate Ctrl+Shift+Z
      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        preventDefault: jest.fn()
      })

      expect(mockRedo).toHaveBeenCalledWith('tab-1')
    })

    test('should trigger redo with Cmd+Shift+Z', () => {
      render(<TopToolbar />)

      // Simulate Cmd+Shift+Z
      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
        preventDefault: jest.fn()
      })

      expect(mockRedo).toHaveBeenCalledWith('tab-1')
    })

    test('should trigger redo with Ctrl+Y (Windows style)', () => {
      render(<TopToolbar />)

      // Simulate Ctrl+Y
      fireEvent.keyDown(window, {
        key: 'y',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        preventDefault: jest.fn()
      })

      expect(mockRedo).toHaveBeenCalledWith('tab-1')
    })

    test('should handle keyboard events properly', () => {
      render(<TopToolbar />)

      // Test that keyboard events trigger the correct functions
      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: true
      })
      expect(mockUndo).toHaveBeenCalledWith('tab-1')

      // Test redo
      fireEvent.keyDown(window, {
        key: 'y',
        ctrlKey: true
      })
      expect(mockRedo).toHaveBeenCalledWith('tab-1')
    })

    test('should handle case insensitive keys', () => {
      render(<TopToolbar />)

      // Test with uppercase Z
      fireEvent.keyDown(window, {
        key: 'Z',
        ctrlKey: true,
        preventDefault: jest.fn()
      })
      expect(mockUndo).toHaveBeenCalledWith('tab-1')

      mockUndo.mockClear()

      // Test with uppercase Y
      fireEvent.keyDown(window, {
        key: 'Y',
        ctrlKey: true,
        preventDefault: jest.fn()
      })
      expect(mockRedo).toHaveBeenCalledWith('tab-1')
    })
  })

  describe('Input Field Protection', () => {
    test('should not trigger shortcuts when typing in input fields', () => {
      render(<TopToolbar />)

      // Create a mock input element
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      // Simulate keydown on the input
      fireEvent.keyDown(input, {
        key: 'z',
        ctrlKey: true,
        target: input
      })

      expect(mockUndo).not.toHaveBeenCalled()

      // Cleanup
      document.body.removeChild(input)
    })

    test('should not trigger shortcuts when typing in textarea', () => {
      render(<TopToolbar />)

      // Create a mock textarea element
      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      // Simulate keydown on the textarea
      fireEvent.keyDown(textarea, {
        key: 'z',
        ctrlKey: true,
        target: textarea
      })

      expect(mockUndo).not.toHaveBeenCalled()

      // Cleanup
      document.body.removeChild(textarea)
    })
  })

  describe('Component State Requirements', () => {
    test('should not trigger shortcuts when no active tab', () => {
      mockUseProjectStore.mockReturnValue(createMockStore({
        activeTabId: null,
        getActiveTab: () => null
      }) as any)

      // Since component returns null when no active tab, 
      // keyboard handlers won't be attached
      const { container } = render(<TopToolbar />)
      expect(container.firstChild).toBeNull()

      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: true
      })

      expect(mockUndo).not.toHaveBeenCalled()
    })

    test('should work with different active tab IDs', () => {
      mockUseProjectStore.mockReturnValue(createMockStore({
        activeTabId: 'custom-tab-id'
      }) as any)

      render(<TopToolbar />)

      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: true,
        preventDefault: jest.fn()
      })

      expect(mockUndo).toHaveBeenCalledWith('custom-tab-id')
    })
  })

  describe('Event Listener Cleanup', () => {
    test('should remove event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      const { unmount } = render(<TopToolbar />)

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Cross-browser Compatibility', () => {
    test('should handle both ctrlKey and metaKey modifiers', () => {
      render(<TopToolbar />)

      // Test ctrlKey (Windows/Linux)
      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: true,
        metaKey: false,
        preventDefault: jest.fn()
      })
      expect(mockUndo).toHaveBeenCalledWith('tab-1')

      mockUndo.mockClear()

      // Test metaKey (Mac)
      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: false,
        metaKey: true,
        preventDefault: jest.fn()
      })
      expect(mockUndo).toHaveBeenCalledWith('tab-1')
    })
  })

  describe('Integration with Store Methods', () => {
    test('should call undo method with correct parameters', () => {
      render(<TopToolbar />)

      fireEvent.keyDown(window, {
        key: 'z',
        ctrlKey: true,
        preventDefault: jest.fn()
      })

      expect(mockUndo).toHaveBeenCalledTimes(1)
      expect(mockUndo).toHaveBeenCalledWith('tab-1')
    })

    test('should call redo method with correct parameters', () => {
      render(<TopToolbar />)

      fireEvent.keyDown(window, {
        key: 'y',
        ctrlKey: true,
        preventDefault: jest.fn()
      })

      expect(mockRedo).toHaveBeenCalledTimes(1)
      expect(mockRedo).toHaveBeenCalledWith('tab-1')
    })
  })
})