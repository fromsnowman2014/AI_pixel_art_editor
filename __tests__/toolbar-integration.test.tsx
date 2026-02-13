import { render, fireEvent, screen } from '@testing-library/react'
import { Toolbar } from '@/components/toolbar'
import { useProjectStore } from '@/lib/stores/project-store'

// Mock the project store
jest.mock('@/lib/stores/project-store', () => ({
  useProjectStore: jest.fn()
}))

// Mock the long-press hook to simplify testing
jest.mock('@/lib/hooks/use-long-press', () => ({
  useLongPress: ({ onClick }: { onClick?: () => void }) => ({
    onMouseDown: () => {},
    onMouseMove: () => {},
    onMouseUp: () => { if (onClick) onClick() },
    onMouseLeave: () => {},
    onTouchStart: () => {},
    onTouchMove: () => {},
    onTouchEnd: () => { if (onClick) onClick() },
  })
}))

describe('Toolbar Integration Tests', () => {
  const mockStore = {
    activeTabId: 'test-tab',
    getActiveTab: jest.fn(),
    updateCanvasState: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
  }

  const mockTab = {
    id: 'test-tab',
    project: {
      id: 'test-project',
      name: 'Test Project',
      width: 32,
      height: 32,
    },
    canvasState: {
      tool: 'pencil',
      color: '#000000',
      zoom: 10,
      brushSize: 1,
      brushShape: 'square' as const,
      panX: 0,
      panY: 0,
    },
    history: [{}],
    historyIndex: 0
  }

  beforeEach(() => {
    (useProjectStore as jest.Mock).mockReturnValue(mockStore)
    mockStore.getActiveTab.mockReturnValue(mockTab)
    // Reset mutable tab state before each test
    mockTab.canvasState.tool = 'pencil'
    mockTab.canvasState.zoom = 10
    mockTab.canvasState.brushSize = 1
    mockTab.canvasState.brushShape = 'square'
    mockTab.history = [{}]
    mockTab.historyIndex = 0
    jest.clearAllMocks()
    // Re-mock after clearAllMocks
    mockStore.getActiveTab.mockReturnValue(mockTab)
  })

  describe('Tool Selection', () => {
    test('should render all drawing tool buttons', () => {
      render(<Toolbar />)

      // Pencil and Eraser use BrushToolGroup with aria-labels
      expect(screen.getByRole('button', { name: /pencil tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /eraser tool/i })).toBeInTheDocument()
      // Fill, Color Picker, Pan use standard buttons
      expect(screen.getByRole('button', { name: /paint bucket tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /color picker tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /pan tool/i })).toBeInTheDocument()
    })

    test('should call updateCanvasState when pencil is clicked', () => {
      render(<Toolbar />)

      const pencilButton = screen.getByRole('button', { name: /pencil tool/i })
      fireEvent.mouseUp(pencilButton)

      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { tool: 'pencil' })
    })

    test('should call updateCanvasState when eraser is clicked', () => {
      render(<Toolbar />)

      const eraserButton = screen.getByRole('button', { name: /eraser tool/i })
      fireEvent.mouseUp(eraserButton)

      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { tool: 'eraser' })
    })

    test('should call updateCanvasState when paint bucket is clicked', () => {
      render(<Toolbar />)

      const fillButton = screen.getByRole('button', { name: /paint bucket tool/i })
      fireEvent.click(fillButton)

      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { tool: 'fill' })
    })

    test('should call updateCanvasState when color picker is clicked', () => {
      render(<Toolbar />)

      const eyedropperButton = screen.getByRole('button', { name: /color picker tool/i })
      fireEvent.click(eyedropperButton)

      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { tool: 'eyedropper' })
    })

    test('should call updateCanvasState when pan is clicked', () => {
      render(<Toolbar />)

      const panButton = screen.getByRole('button', { name: /pan tool/i })
      fireEvent.click(panButton)

      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { tool: 'pan' })
    })

    test('should show blue + badge on pencil and eraser (brush settings indicator)', () => {
      render(<Toolbar />)

      const pencilButton = screen.getByRole('button', { name: /pencil tool/i })
      const eraserButton = screen.getByRole('button', { name: /eraser tool/i })

      // Both should have the "+" badge
      const pencilBadges = pencilButton.querySelectorAll('[aria-hidden="true"]')
      const eraserBadges = eraserButton.querySelectorAll('[aria-hidden="true"]')

      // Should have at least icon + "+" badge + shortcut badge = 3 aria-hidden elements
      expect(pencilBadges.length).toBeGreaterThanOrEqual(3)
      expect(eraserBadges.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Tips Section', () => {
    test('should display brush shortcut tips', () => {
      render(<Toolbar />)

      expect(screen.getByText(/\[-Smaller, \]-Bigger/)).toBeInTheDocument()
    })

    test('should display tool keyboard shortcuts', () => {
      render(<Toolbar />)

      expect(screen.getByText(/P-Pencil/)).toBeInTheDocument()
      expect(screen.getByText(/E-Eraser/)).toBeInTheDocument()
    })
  })

  describe('No Active Tab', () => {
    test('should not render when no active tab', () => {
      mockStore.activeTabId = null
      mockStore.getActiveTab.mockReturnValue(null)

      const { container } = render(<Toolbar />)

      expect(container.firstChild).toBeNull()
    })
  })
})
