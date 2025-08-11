import { render, fireEvent, screen } from '@testing-library/react'
import { Toolbar } from '@/components/toolbar'
import { useProjectStore } from '@/lib/stores/project-store'

// Mock the project store
jest.mock('@/lib/stores/project-store', () => ({
  useProjectStore: jest.fn()
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
      zoom: 10,
      brushSize: 1,
      panX: 0,
      panY: 0,
      selectedColor: '#000000'
    },
    history: [{}],
    historyIndex: 0
  }

  beforeEach(() => {
    (useProjectStore as jest.Mock).mockReturnValue(mockStore)
    mockStore.getActiveTab.mockReturnValue(mockTab)
    jest.clearAllMocks()
  })

  describe('Tool Selection', () => {
    test('should render all drawing tools', () => {
      render(<Toolbar />)
      
      expect(screen.getByText('Pencil')).toBeInTheDocument()
      expect(screen.getByText('Eraser')).toBeInTheDocument()
      expect(screen.getByText('Paint Bucket')).toBeInTheDocument()
      expect(screen.getByText('Eyedropper')).toBeInTheDocument()
      expect(screen.getByText('Pan')).toBeInTheDocument()
    })

    test('should call updateCanvasState when pencil is clicked', () => {
      render(<Toolbar />)
      
      const pencilButton = screen.getByText('Pencil')
      fireEvent.click(pencilButton)
      
      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { tool: 'pencil' })
    })

    test('should call updateCanvasState when eraser is clicked', () => {
      render(<Toolbar />)
      
      const eraserButton = screen.getByText('Eraser')
      fireEvent.click(eraserButton)
      
      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { tool: 'eraser' })
    })

    test('should highlight active tool', () => {
      mockTab.canvasState.tool = 'eraser'
      render(<Toolbar />)
      
      const eraserButton = screen.getByText('Eraser').closest('button')
      expect(eraserButton).toHaveClass('bg-blue-500') // Default variant styling
    })
  })

  describe('Zoom Controls', () => {
    test('should call updateCanvasState when zoom in is clicked', () => {
      render(<Toolbar />)
      
      const zoomInButton = screen.getByText('Zoom In')
      fireEvent.click(zoomInButton)
      
      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { zoom: 15 }) // 10 * 1.5
    })

    test('should call updateCanvasState when zoom out is clicked', () => {
      render(<Toolbar />)
      
      const zoomOutButton = screen.getByText('Zoom Out')
      fireEvent.click(zoomOutButton)
      
      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { zoom: 6.666666666666667 }) // 10 / 1.5
    })

    test('should disable zoom in when at maximum zoom', () => {
      mockTab.canvasState.zoom = 32
      render(<Toolbar />)
      
      const zoomInButton = screen.getByText('Zoom In').closest('button')
      expect(zoomInButton).toBeDisabled()
    })

    test('should disable zoom out when at minimum zoom', () => {
      mockTab.canvasState.zoom = 1
      render(<Toolbar />)
      
      const zoomOutButton = screen.getByText('Zoom Out').closest('button')
      expect(zoomOutButton).toBeDisabled()
    })

    test('should display current zoom level', () => {
      render(<Toolbar />)
      
      expect(screen.getByText(/Current: 10\.0x/)).toBeInTheDocument()
    })
  })

  describe('Undo/Redo Controls', () => {
    test('should call undo when undo button is clicked', () => {
      mockTab.historyIndex = 1
      render(<Toolbar />)
      
      const undoButton = screen.getByText('Undo')
      fireEvent.click(undoButton)
      
      expect(mockStore.undo).toHaveBeenCalledWith('test-tab')
    })

    test('should call redo when redo button is clicked', () => {
      mockTab.history = [{}, {}]
      mockTab.historyIndex = 0
      render(<Toolbar />)
      
      const redoButton = screen.getByText('Redo')
      fireEvent.click(redoButton)
      
      expect(mockStore.redo).toHaveBeenCalledWith('test-tab')
    })

    test('should disable undo when at start of history', () => {
      mockTab.historyIndex = 0
      render(<Toolbar />)
      
      const undoButton = screen.getByText('Undo').closest('button')
      expect(undoButton).toBeDisabled()
    })

    test('should disable redo when at end of history', () => {
      mockTab.history = [{}, {}]
      mockTab.historyIndex = 1
      render(<Toolbar />)
      
      const redoButton = screen.getByText('Redo').closest('button')
      expect(redoButton).toBeDisabled()
    })
  })

  describe('Brush Size Control', () => {
    test('should call updateCanvasState when brush size changes', () => {
      render(<Toolbar />)
      
      const brushSizeSlider = screen.getByRole('slider')
      fireEvent.change(brushSizeSlider, { target: { value: '5' } })
      
      expect(mockStore.updateCanvasState).toHaveBeenCalledWith('test-tab', { brushSize: 5 })
    })

    test('should display current brush size', () => {
      render(<Toolbar />)
      
      expect(screen.getByText('1px')).toBeInTheDocument()
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