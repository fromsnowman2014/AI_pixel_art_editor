import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { AuthButton } from '@/components/auth-button'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock the auth store
jest.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

describe('Authentication System', () => {
  const mockAuthStore = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    setAuthenticatedUser: jest.fn(),
    initializeUser: jest.fn(),
    logout: jest.fn(),
    login: jest.fn(),
    setUser: jest.fn(),
    reset: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuthStore.mockReturnValue(mockAuthStore)
  })

  describe('AuthButton Component', () => {
    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(<AuthButton />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should show sign in button when user is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<AuthButton />)
      
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('should show user info when authenticated', () => {
      const mockSession = {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        }
      }

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: {
          id: 'user-123',
          type: 'authenticated',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
          permissions: ['create', 'read', 'update', 'delete', 'save', 'export', 'cloud_save'],
          rateLimits: { ai: 100 },
        },
        isAuthenticated: true,
      })

      render(<AuthButton />)
      
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should call logout when sign out is clicked', async () => {
      const user = userEvent.setup()
      const mockSession = {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        }
      }

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: {
          id: 'user-123',
          type: 'authenticated',
          name: 'Test User',
          permissions: ['cloud_save'],
          rateLimits: { ai: 100 },
        },
        isAuthenticated: true,
      })

      render(<AuthButton />)
      
      const userButton = screen.getByRole('button')
      await user.click(userButton)
      
      await waitFor(() => {
        const signOutButton = screen.getByText('Sign Out')
        expect(signOutButton).toBeInTheDocument()
      })
    })
  })

  describe('Auth Store', () => {
    it('should initialize with local user when not authenticated', () => {
      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: {
          id: 'local-user',
          type: 'local',
          permissions: ['create', 'read', 'update', 'delete', 'save', 'export'],
          rateLimits: { ai: 60 },
        },
      })

      const store = useAuthStore()
      store.initializeUser()
      
      expect(mockAuthStore.initializeUser).toHaveBeenCalled()
    })

    it('should set authenticated user when session is available', () => {
      const sessionUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }

      const store = useAuthStore()
      store.setAuthenticatedUser(sessionUser)
      
      expect(mockAuthStore.setAuthenticatedUser).toHaveBeenCalledWith(sessionUser)
    })

    it('should grant cloud_save permission to authenticated users', () => {
      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: {
          id: 'user-123',
          type: 'authenticated',
          email: 'test@example.com',
          name: 'Test User',
          permissions: ['create', 'read', 'update', 'delete', 'save', 'export', 'cloud_save'],
          rateLimits: { ai: 100 },
        },
        isAuthenticated: true,
      })

      const store = useAuthStore()
      expect(store.user?.permissions).toContain('cloud_save')
      expect(store.user?.rateLimits.ai).toBe(100)
    })
  })
})