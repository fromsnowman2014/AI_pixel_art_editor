/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectPanel } from '@/components/project-panel'
import { useProjectStore } from '@/lib/stores/project-store'
import { api } from '@/lib/api/client'
import toast from 'react-hot-toast'

// Mock dependencies
jest.mock('@/lib/api/client')
jest.mock('react-hot-toast')
jest.mock('@/lib/stores/project-store')
jest.mock('@/lib/services/prompt-enhancer', () => ({
  generateGuidedPrompt: jest.fn((prompt: string) => ({ finalPrompt: prompt }))
}))
jest.mock('@/components/export-modal', () => ({
  ExportModal: ({ open, onOpenChange }: any) => 
    open ? <div data-testid="export-modal">Export Modal</div> : null
}))

const mockApi = api as jest.Mocked<typeof api>
const mockToast = toast as jest.Mocked<typeof toast>
const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>

// Mock store state
const mockStoreState = {
  activeTabId: 'test-tab-1',
  getActiveTab: jest.fn(),
  updateProject: jest.fn(),
  exportProject: jest.fn(),
  saveProject: jest.fn(),
  addFrame: jest.fn(),
  updateCanvasData: jest.fn(),
}

const mockActiveTab = {
  id: 'test-tab-1',
  project: {
    id: 'test-project-1',
    name: 'Test Project',
    width: 32,
    height: 32,
    colorLimit: 16,
    mode: 'beginner' as const,
    palette: ['#FF0000', '#00FF00', '#0000FF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  frames: [],
  currentFrame: null,
  canvasData: null,
  canvasState: {
    tool: 'brush' as const,
    primaryColor: '#FF0000',
    secondaryColor: '#FFFFFF',
    brushSize: 1,
    zoom: 100,
  },
  isDirty: false,
}

describe('AI Generation Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseProjectStore.mockReturnValue(mockStoreState)
    mockStoreState.getActiveTab.mockReturnValue(mockActiveTab)
    
    // Mock successful health check by default
    mockApi.health.mockResolvedValue({
      status: 'healthy',
      openaiKeyLoaded: true,
      redisPing: 'PONG',
      services: {
        database: 'healthy',
        redis: 'healthy', 
        storage: 'healthy',
        openai: 'healthy',
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      metrics: {
        uptime: 1000,
        memoryUsage: {
          used: 1000000,
          total: 2000000,
          percentage: 50,
        },
        requestCount: 100,
        averageResponseTime: 200,
      },
    })
  })

  it('should render AI generation section', () => {
    render(<ProjectPanel />)
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Describe what you want to create/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate with AI/ })).toBeInTheDocument()
  })

  it('should handle successful AI generation workflow', async () => {
    const generateResponse = {
      assetId: 'test-asset-id',
      pngUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      palette: ['#FF0000', '#00FF00', '#0000FF'],
      width: 32,
      height: 32,
      colorCount: 3,
      processingTimeMs: 5000,
    }

    mockApi.ai.generate.mockResolvedValue(generateResponse)

    // Mock Image constructor for canvas loading
    const mockImage = {
      crossOrigin: '',
      onload: null as any,
      onerror: null as any,
      src: '',
      width: 32,
      height: 32,
    }

    global.Image = jest.fn(() => mockImage) as any

    // Mock canvas and context
    const mockCanvas = document.createElement('canvas')
    mockCanvas.width = 32
    mockCanvas.height = 32
    
    const mockContext = {
      imageSmoothingEnabled: false,
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(32 * 32 * 4),
        width: 32,
        height: 32,
      })),
    }
    
    jest.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any)

    render(<ProjectPanel />)

    // Enter prompt
    const promptInput = screen.getByPlaceholderText(/Describe what you want to create/)
    await user.type(promptInput, 'a cute cat pixel art')

    // Click generate button
    const generateButton = screen.getByRole('button', { name: /Generate with AI/ })
    await user.click(generateButton)

    // Wait for loading state
    await waitFor(() => {
      expect(screen.getByText(/Generating AI Image/)).toBeInTheDocument()
    })

    // Wait for API calls
    await waitFor(() => {
      expect(mockApi.health).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockApi.ai.generate).toHaveBeenCalledWith({
        prompt: 'a cute cat pixel art',
        mode: 'new',
        width: 32,
        height: 32,
        colorLimit: 16,
        enableDithering: false,
        quantizationMethod: 'median-cut',
      })
    })

    // Simulate image loading
    if (mockImage.onload) {
      mockImage.onload()
    }

    // Verify success
    await waitFor(() => {
      expect(mockStoreState.updateCanvasData).toHaveBeenCalled()
    })

    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining('AI image generated!')
    )
  })

  it('should handle health check failure', async () => {
    mockApi.health.mockResolvedValue({
      status: 'degraded',
      openaiKeyLoaded: false,
      redisPing: 'PONG',
      services: {
        database: 'healthy',
        redis: 'healthy',
        storage: 'healthy',
        openai: 'unhealthy',
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      metrics: {
        uptime: 1000,
        memoryUsage: {
          used: 1000000,
          total: 2000000,
          percentage: 50,
        },
        requestCount: 100,
        averageResponseTime: 200,
      },
    })

    render(<ProjectPanel />)

    const promptInput = screen.getByPlaceholderText(/Describe what you want to create/)
    await user.type(promptInput, 'test prompt')

    const generateButton = screen.getByRole('button', { name: /Generate with AI/ })
    await user.click(generateButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'AI service unavailable: Server key missing'
      )
    })

    expect(mockApi.ai.generate).not.toHaveBeenCalled()
  })

  it('should handle generation API errors', async () => {
    const errorResponse = {
      code: 'GENERATION_FAILED',
      message: 'AI generation failed',
      status: 500,
    }

    mockApi.ai.generate.mockRejectedValue(errorResponse)

    render(<ProjectPanel />)

    const promptInput = screen.getByPlaceholderText(/Describe what you want to create/)
    await user.type(promptInput, 'test prompt')

    const generateButton = screen.getByRole('button', { name: /Generate with AI/ })
    await user.click(generateButton)

    await waitFor(() => {
      expect(mockApi.ai.generate).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'AI generation failed: AI generation failed'
      )
    })
  })

  it('should handle rate limiting errors', async () => {
    const rateLimitError = {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      status: 429,
    }

    mockApi.ai.generate.mockRejectedValue(rateLimitError)

    render(<ProjectPanel />)

    const promptInput = screen.getByPlaceholderText(/Describe what you want to create/)
    await user.type(promptInput, 'test prompt')

    const generateButton = screen.getByRole('button', { name: /Generate with AI/ })
    await user.click(generateButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Rate limit exceeded. Please try again later.'
      )
    })
  })

  it('should validate prompt requirements', async () => {
    render(<ProjectPanel />)

    const generateButton = screen.getByRole('button', { name: /Generate with AI/ })
    
    // Try to click without prompt
    await user.click(generateButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please enter a prompt first')
    })

    expect(mockApi.health).not.toHaveBeenCalled()
    expect(mockApi.ai.generate).not.toHaveBeenCalled()
  })

  it('should handle canvas integration correctly', async () => {
    // Test with empty canvas (should create new frame)
    mockActiveTab.frames = []
    mockActiveTab.canvasData = null
    
    const generateResponse = {
      assetId: 'test-asset-id',
      pngUrl: 'data:image/png;base64,test',
      palette: ['#FF0000'],
      width: 32,
      height: 32,
      colorCount: 1,
      processingTimeMs: 3000,
    }

    mockApi.ai.generate.mockResolvedValue(generateResponse)

    // Mock canvas operations
    const mockCanvas = document.createElement('canvas')
    mockCanvas.width = 32
    mockCanvas.height = 32
    
    const mockContext = {
      imageSmoothingEnabled: false,
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(32 * 32 * 4), // All transparent
        width: 32,
        height: 32,
      })),
    }
    
    jest.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any)

    const mockImage = {
      crossOrigin: '',
      onload: null as any,
      onerror: null as any,
      src: '',
    }
    
    global.Image = jest.fn(() => mockImage) as any

    render(<ProjectPanel />)

    const promptInput = screen.getByPlaceholderText(/Describe what you want to create/)
    await user.type(promptInput, 'test')

    const generateButton = screen.getByRole('button', { name: /Generate with AI/ })
    await user.click(generateButton)

    // Wait for API calls
    await waitFor(() => {
      expect(mockApi.ai.generate).toHaveBeenCalled()
    })

    // Simulate successful image load
    if (mockImage.onload) {
      mockImage.onload()
    }

    await waitFor(() => {
      expect(mockStoreState.addFrame).toHaveBeenCalledWith('test-tab-1')
      expect(mockStoreState.updateCanvasData).toHaveBeenCalled()
    })
  })

  it('should disable UI during generation', async () => {
    mockApi.ai.generate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    render(<ProjectPanel />)

    const promptInput = screen.getByPlaceholderText(/Describe what you want to create/)
    await user.type(promptInput, 'test prompt')

    const generateButton = screen.getByRole('button', { name: /Generate with AI/ })
    await user.click(generateButton)

    // UI should be disabled during generation
    await waitFor(() => {
      expect(screen.getByText(/Generating AI Image/)).toBeInTheDocument()
    })

    expect(promptInput).toBeDisabled()
    expect(generateButton).toBeDisabled()
    expect(screen.getByText(/This may take 10-30 seconds/)).toBeInTheDocument()
  })

  it('should track character count', async () => {
    render(<ProjectPanel />)

    const promptInput = screen.getByPlaceholderText(/Describe what you want to create/)
    
    expect(screen.getByText('0/500 characters')).toBeInTheDocument()

    await user.type(promptInput, 'test prompt')
    
    expect(screen.getByText('11/500 characters')).toBeInTheDocument()
  })

  it('should handle missing project state', async () => {
    mockStoreState.getActiveTab.mockReturnValue(null)
    mockStoreState.activeTabId = null

    render(<ProjectPanel />)

    expect(screen.getByText('Select a project to view settings')).toBeInTheDocument()
  })
})