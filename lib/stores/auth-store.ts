'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type UserMode = 'anonymous' | 'parent' | null

interface User {
  id: string
  type: 'anonymous' | 'authenticated'
  permissions: string[]
  rateLimits: {
    ai: number
  }
}

interface AuthState {
  // COPPA compliance state
  hasCompletedCoppaFlow: boolean
  userMode: UserMode
  user: User | null
  
  // Actions
  setUserMode: (mode: UserMode) => void
  setUser: (user: User | null) => void
  completeCoppaFlow: () => void
  reset: () => void
}

const createAnonymousUser = (): User => ({
  id: 'anonymous',
  type: 'anonymous',
  permissions: ['create', 'read', 'update', 'delete'],
  rateLimits: {
    ai: 10 // Limited AI calls for anonymous users
  }
})

const createParentUser = (): User => ({
  id: 'parent-temp', // Will be replaced with actual user ID after authentication
  type: 'authenticated',
  permissions: ['create', 'read', 'update', 'delete', 'save', 'share'],
  rateLimits: {
    ai: 60 // More AI calls for authenticated users
  }
})

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        hasCompletedCoppaFlow: false,
        userMode: null,
        user: null,

        // Set user mode and create appropriate user
        setUserMode: (mode: UserMode) => {
          set((state) => {
            state.userMode = mode
            
            if (mode === 'anonymous') {
              state.user = createAnonymousUser()
            } else if (mode === 'parent') {
              state.user = createParentUser()
            } else {
              state.user = null
            }
          })
        },

        // Set user directly (for authenticated users)
        setUser: (user: User | null) => {
          set((state) => {
            state.user = user
          })
        },

        // Mark COPPA flow as completed
        completeCoppaFlow: () => {
          set((state) => {
            state.hasCompletedCoppaFlow = true
          })
        },

        // Reset auth state
        reset: () => {
          set((state) => {
            state.hasCompletedCoppaFlow = false
            state.userMode = null
            state.user = null
          })
        },
      })),
      {
        name: 'pixelbuddy-auth',
        // Persist COPPA compliance state but not sensitive user data
        partialize: (state) => ({
          hasCompletedCoppaFlow: state.hasCompletedCoppaFlow,
          userMode: state.userMode,
          // Don't persist full user object for security
        }),
      }
    ),
    { name: 'pixelbuddy-auth-store' }
  )
)