'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useSession } from 'next-auth/react'

interface User {
  id: string
  type: 'local' | 'authenticated'
  email?: string
  name?: string
  image?: string
  provider?: string
  permissions: string[]
  rateLimits: {
    ai: number
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setAuthenticatedUser: (sessionUser: any) => void
  initializeUser: () => void
  login: (provider: string) => Promise<void>
  logout: () => Promise<void>
  reset: () => void
}

const createDefaultUser = (): User => ({
  id: 'local-user',
  type: 'local',
  permissions: ['create', 'read', 'update', 'delete', 'save', 'export'],
  rateLimits: {
    ai: 60
  }
})

const createAuthenticatedUser = (sessionUser: any): User => ({
  id: sessionUser.id || sessionUser.sub,
  type: 'authenticated',
  email: sessionUser.email,
  name: sessionUser.name,
  image: sessionUser.image,
  permissions: ['create', 'read', 'update', 'delete', 'save', 'export', 'cloud_save'],
  rateLimits: {
    ai: 100 // More AI calls for authenticated users
  }
})

export const useAuthStore = create<AuthState>()(
  devtools(
    immer((set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      initializeUser: () => {
        set((state) => {
          if (!state.user) {
            state.user = createDefaultUser()
          }
        })
      },

      setUser: (user: User | null) => {
        set((state) => {
          state.user = user
          state.isAuthenticated = user?.type === 'authenticated'
        })
      },

      setAuthenticatedUser: (sessionUser: any) => {
        set((state) => {
          state.user = createAuthenticatedUser(sessionUser)
          state.isAuthenticated = true
          state.isLoading = false
        })
      },

      login: async (provider: string) => {
        set((state) => {
          state.isLoading = true
        })
        const { signIn } = await import('next-auth/react')
        await signIn(provider, { callbackUrl: '/' })
      },

      logout: async () => {
        set((state) => {
          state.isLoading = true
        })
        const { signOut } = await import('next-auth/react')
        await signOut({ callbackUrl: '/' })
        set((state) => {
          state.user = createDefaultUser()
          state.isAuthenticated = false
          state.isLoading = false
        })
      },

      reset: () => {
        set((state) => {
          state.user = null
          state.isAuthenticated = false
          state.isLoading = false
        })
      },
    })),
    { name: 'pixelbuddy-auth-store' }
  )
)