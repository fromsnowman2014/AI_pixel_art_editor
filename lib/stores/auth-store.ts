'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface User {
  id: string
  type: 'local'
  permissions: string[]
  rateLimits: {
    ai: number
  }
}

interface AuthState {
  user: User | null
  
  // Actions
  setUser: (user: User | null) => void
  initializeUser: () => void
  reset: () => void
}

const createDefaultUser = (): User => ({
  id: 'local-user',
  type: 'local',
  permissions: ['create', 'read', 'update', 'delete', 'save', 'export'],
  rateLimits: {
    ai: 60 // Generous AI calls for all users
  }
})

export const useAuthStore = create<AuthState>()(
  devtools(
    immer((set, get) => ({
      // Initial state - user will be initialized on app start
      user: null,

      // Initialize default user
      initializeUser: () => {
        set((state) => {
          if (!state.user) {
            state.user = createDefaultUser()
          }
        })
      },

      // Set user directly
      setUser: (user: User | null) => {
        set((state) => {
          state.user = user
        })
      },

      // Reset auth state
      reset: () => {
        set((state) => {
          state.user = null
        })
      },
    })),
    { name: 'pixelbuddy-auth-store' }
  )
)