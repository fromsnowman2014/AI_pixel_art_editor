'use client'

import { useEffect } from 'react'
import { PixelEditor } from '@/components/pixel-editor'
import { CoppaGate } from '@/components/coppa-gate'
import { DebugMonitor } from '@/components/debug-monitor'
import { useProjectStore } from '@/lib/stores/project-store'
import { useAuthStore } from '@/lib/stores/auth-store'

export default function HomePage() {
  const { initializeApp } = useProjectStore()
  const { hasCompletedCoppaFlow, userMode, setUserMode, completeCoppaFlow } = useAuthStore()

  useEffect(() => {
    // Initialize the app with default project only after COPPA compliance
    if (hasCompletedCoppaFlow && userMode) {
      initializeApp()
    }
  }, [hasCompletedCoppaFlow, userMode, initializeApp])

  // Handle COPPA gate completion
  const handleCoppaComplete = (mode: 'anonymous' | 'parent') => {
    setUserMode(mode)
    completeCoppaFlow()
  }

  // Show COPPA gate if user hasn't completed the flow
  if (!hasCompletedCoppaFlow || !userMode) {
    return <CoppaGate onContinue={handleCoppaComplete} />
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DebugMonitor />
      <PixelEditor />
    </main>
  )
}