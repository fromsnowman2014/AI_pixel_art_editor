import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SaveProjectModal } from '@/components/save-project-modal'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useProjectStore } from '@/lib/stores/project-store'
import { toast } from 'react-hot-toast'

// Mock the stores
jest.mock('@/lib/stores/auth-store')
jest.mock('@/lib/stores/project-store')
jest.mock('react-hot-toast')

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>
const mockToast = toast as jest.Mocked<typeof toast>

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock canvas for thumbnail generation
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillStyle: '',
    imageSmoothingEnabled: false,
    fillRect: jest.fn(),
    toDataURL: jest.fn(() => 'data:image/png;base64,mock-thumbnail')
  }))
})

// Mock document.createElement for canvas
const originalCreateElement = document.createElement
document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    const canvas = originalCreateElement.call(document, tagName)
    canvas.width = 100
    canvas.height = 100
    return canvas
  }
  return originalCreateElement.call(document, tagName)
})

describe('SaveProjectModal', () => {
  const mockOnOpenChange = jest.fn()

  const mockAuthenticatedUser = {
    user: {
      id: 'user-123',
      type: 'authenticated' as const,
      email: 'test@example.com',
      name: 'Test User',
      permissions: ['cloud_save'],
      rateLimits: { ai: 100 },
    },
    isAuthenticated: true,
    isLoading: false,
    setAuthenticatedUser: jest.fn(),
    initializeUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    setUser: jest.fn(),
    reset: jest.fn(),
  }

  const mockLocalUser = {
    user: {
      id: 'local-user',
      type: 'local' as const,
      permissions: ['save'],
      rateLimits: { ai: 60 },
    },
    isAuthenticated: false,
    isLoading: false,
    setAuthenticatedUser: jest.fn(),
    initializeUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    setUser: jest.fn(),
    reset: jest.fn(),
  }

  const mockActiveTab = {
    id: 'tab-1',
    project: {
      id: 'project-1',
      name: 'Test Project',
      width: 32,
      height: 32,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    frames: [
      {
        id: 'frame-1',
        pixels: new Array(32 * 32).fill([255, 0, 0, 255]), // Red pixels
        included: true,
      }
    ],
    currentFrame: {
      id: 'frame-1',
      pixels: new Array(32 * 32).fill([255, 0, 0, 255]),
      included: true,
    },
    canvasData: null,
    canvasState: {},
    history: [],
    historyIndex: 0,
    isDirty: false,
    frameCanvasData: [],
    isPlaying: false,
    playbackFrameIndex: 0,
    playbackFrameId: null,
    playbackIntervalId: null,
    playbackSpeed: 1.0,
    playbackStartTime: null,
    playbackAccumulatedTime: 0,
  }

  const mockProjectStore = {
    getActiveTab: jest.fn(() => mockActiveTab),
    exportCurrentProject: jest.fn(),
    // Add other required methods
    activeTabId: 'tab-1',
    tabs: [mockActiveTab],
    createTab: jest.fn(),
    closeTab: jest.fn(),
    switchTab: jest.fn(),
    updateTabName: jest.fn(),
    updateCanvasState: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseProjectStore.mockReturnValue(mockProjectStore)
    mockFetch.mockClear()
    // Default mock response to prevent undefined fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Default mock response' }),
    } as Response)
  })

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue(mockLocalUser)
    })

    it('should show sign in prompt', () => {
      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      expect(screen.getByText('Sign In Required')).toBeInTheDocument()
      expect(screen.getByText('Please sign in to save your projects to the cloud.')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('should call login when sign in button is clicked', async () => {
      const user = userEvent.setup()
      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      const signInButton = screen.getByText('Sign In')
      await user.click(signInButton)
      
      expect(mockLocalUser.login).toHaveBeenCalledWith('google')
    })
  })

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue(mockAuthenticatedUser)
    })

    it('should show save project form', () => {
      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      expect(screen.getByText('Save Project to Cloud')).toBeInTheDocument()
      expect(screen.getByLabelText('Project Name')).toBeInTheDocument()
      expect(screen.getByText('Save Project')).toBeInTheDocument()
    })

    it('should pre-populate project name from active tab', () => {
      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      const nameInput = screen.getByDisplayValue('Test Project')
      expect(nameInput).toBeInTheDocument()
    })

    it('should show character count', () => {
      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      expect(screen.getByText('12/50 characters')).toBeInTheDocument()
    })

    it('should disable save button when project name is empty', async () => {
      const user = userEvent.setup()
      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      const nameInput = screen.getByLabelText('Project Name')
      await user.clear(nameInput)
      
      const saveButton = screen.getByText('Save Project')
      expect(saveButton).toBeDisabled()
    })

    it('should show error for names over 50 characters', async () => {
      const user = userEvent.setup()
      
      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      const nameInput = screen.getByLabelText('Project Name')
      await user.clear(nameInput)
      
      // Use fireEvent to directly set a value that bypasses maxLength
      const { fireEvent } = await import('@testing-library/react')
      fireEvent.change(nameInput, { target: { value: 'A'.repeat(51) } })
      
      const saveButton = screen.getByText('Save Project')
      await user.click(saveButton)
      
      expect(mockToast.error).toHaveBeenCalledWith('Project name must be 50 characters or less')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should save project successfully', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, projectId: 'project-123', message: 'Project saved!' }),
      } as Response)

      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      const saveButton = screen.getByText('Save Project')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/saved-projects/save'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-jwt-token',
            }),
            body: expect.stringContaining('Test Project'),
          })
        )
      })

      expect(mockToast.success).toHaveBeenCalledWith('Project saved!')
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Project limit reached' }),
      } as Response)

      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      const saveButton = screen.getByText('Save Project')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Project limit reached')
      })
    })

    it('should show loading state during save', async () => {
      const user = userEvent.setup()
      
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<SaveProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      const saveButton = screen.getByText('Save Project')
      await user.click(saveButton)
      
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled()
    })
  })

  describe('when modal is closed', () => {
    it('should not render when open is false', () => {
      mockUseAuthStore.mockReturnValue(mockAuthenticatedUser)
      
      render(<SaveProjectModal open={false} onOpenChange={mockOnOpenChange} />)
      
      expect(screen.queryByText('Save Project to Cloud')).not.toBeInTheDocument()
    })
  })
})