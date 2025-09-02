import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoadProjectModal } from '@/components/load-project-modal'
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

// Mock window.confirm
global.confirm = jest.fn(() => true)

describe('LoadProjectModal', () => {
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

  const mockProjectStore = {
    createTab: jest.fn(),
    loadProject: jest.fn(),
    activeTabId: 'tab-1',
    tabs: [],
    switchTab: jest.fn(),
    closeTab: jest.fn(),
    updateTabName: jest.fn(),
    updateCanvasState: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    getActiveTab: jest.fn(),
    exportCurrentProject: jest.fn(),
  }

  const mockSavedProjects = [
    {
      id: 'project-1',
      name: 'Cool Pixel Art',
      thumbnailData: 'data:image/png;base64,mock-thumbnail-1',
      createdAt: '2023-12-01T10:00:00Z',
      updatedAt: '2023-12-01T10:00:00Z',
    },
    {
      id: 'project-2',
      name: 'Awesome Animation',
      thumbnailData: 'data:image/png;base64,mock-thumbnail-2',
      createdAt: '2023-12-02T10:00:00Z',
      updatedAt: '2023-12-02T10:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseProjectStore.mockReturnValue(mockProjectStore)
    mockFetch.mockClear()
    // Default mock response to prevent undefined fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ projects: mockSavedProjects }),
    } as Response)
  })

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue(mockLocalUser)
    })

    it('should show sign in prompt', () => {
      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      expect(screen.getByText('Sign In Required')).toBeInTheDocument()
      expect(screen.getByText('Please sign in to access your saved projects.')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('should call login when sign in button is clicked', async () => {
      const user = userEvent.setup()
      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      const signInButton = screen.getByText('Sign In')
      await user.click(signInButton)
      
      expect(mockLocalUser.login).toHaveBeenCalledWith('google')
    })
  })

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue(mockAuthenticatedUser)
    })

    it('should show load project interface', () => {
      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      expect(screen.getByText('Load Project from Cloud')).toBeInTheDocument()
      expect(screen.getByText('Select a project to load')).toBeInTheDocument()
    })

    it('should fetch and display saved projects', async () => {
      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/saved-projects/list'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-jwt-token',
            }),
          })
        )
      })

      expect(screen.getByText('Cool Pixel Art')).toBeInTheDocument()
      expect(screen.getByText('Awesome Animation')).toBeInTheDocument()
    })

    it('should show loading state while fetching projects', () => {
      mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      expect(screen.getByText('Loading your projects...')).toBeInTheDocument()
    })

    it('should handle empty project list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [] }),
      } as Response)

      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('No saved projects found')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Create your first project and save it to see it here.')).toBeInTheDocument()
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch projects' }),
      } as Response)

      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to fetch projects')
      })
    })

    it('should load selected project', async () => {
      const user = userEvent.setup()
      
      const mockProjectData = {
        id: 'project-1',
        name: 'Cool Pixel Art',
        projectData: {
          frames: [{ id: 'frame-1', pixels: [], included: true }],
          canvasSettings: { width: 32, height: 32, zoom: 200, colorLimit: 16, palette: [] },
          activeFrameId: 'frame-1',
        },
        thumbnailData: 'data:image/png;base64,mock-thumbnail',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
      }

      // Mock the list API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockSavedProjects }),
      } as Response)

      // Mock the load API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectData,
      } as Response)

      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Cool Pixel Art')).toBeInTheDocument()
      })

      const loadButton = screen.getByRole('button', { name: /load cool pixel art/i })
      await user.click(loadButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/saved-projects/project-1'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-jwt-token',
            }),
          })
        )
      })

      expect(mockProjectStore.loadProject).toHaveBeenCalledWith(mockProjectData)
      expect(mockToast.success).toHaveBeenCalledWith('Project "Cool Pixel Art" loaded successfully!')
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should show loading state during project load', async () => {
      const user = userEvent.setup()
      
      // Mock slow API responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockSavedProjects }),
      } as Response)

      mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Cool Pixel Art')).toBeInTheDocument()
      })

      const loadButton = screen.getByRole('button', { name: /load cool pixel art/i })
      await user.click(loadButton)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(loadButton).toBeDisabled()
    })

    it('should handle load errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock successful list API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockSavedProjects }),
      } as Response)

      // Mock failed load API call
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Project not found' }),
      } as Response)

      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Cool Pixel Art')).toBeInTheDocument()
      })

      const loadButton = screen.getByRole('button', { name: /load cool pixel art/i })
      await user.click(loadButton)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Project not found')
      })
    })

    it('should allow deleting projects', async () => {
      const user = userEvent.setup()
      
      // Mock successful list API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockSavedProjects }),
      } as Response)

      // Mock successful delete API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Project deleted successfully' }),
      } as Response)

      // Mock updated list API call after delete
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [mockSavedProjects[1]] }), // Only second project remains
      } as Response)

      render(<LoadProjectModal open={true} onOpenChange={mockOnOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Cool Pixel Art')).toBeInTheDocument()
      })

      const deleteButton = screen.getByRole('button', { name: /delete cool pixel art/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/saved-projects/project-1'),
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-jwt-token',
            }),
          })
        )
      })

      expect(mockToast.success).toHaveBeenCalledWith('Project deleted successfully')
      
      // Should refetch the project list after deletion
      await waitFor(() => {
        expect(screen.queryByText('Cool Pixel Art')).not.toBeInTheDocument()
        expect(screen.getByText('Awesome Animation')).toBeInTheDocument()
      })
    })
  })

  describe('when modal is closed', () => {
    it('should not render when open is false', () => {
      mockUseAuthStore.mockReturnValue(mockAuthenticatedUser)
      
      render(<LoadProjectModal open={false} onOpenChange={mockOnOpenChange} />)
      
      expect(screen.queryByText('Load Project from Cloud')).not.toBeInTheDocument()
    })
  })
})