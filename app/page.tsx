'use client'

import { useEffect } from 'react'
import { PixelEditor } from '@/components/pixel-editor'
import { DebugMonitor } from '@/components/debug-monitor'
import { PlaybackDebugPanel } from '@/components/playback-debug-panel'
import { useProjectStore } from '@/lib/stores/project-store'
import { useAuthStore } from '@/lib/stores/auth-store'

export default function HomePage() {
  const { initializeApp } = useProjectStore()
  const { initializeUser } = useAuthStore()

  useEffect(() => {
    // Initialize user and app immediately on load
    initializeUser()
    initializeApp()
  }, [initializeUser, initializeApp])

  return (
    <main className="min-h-screen bg-gray-50">
      <DebugMonitor />
      <PixelEditor />
      {/* 🔍 Playback Debugging Panel - Only in development */}
      {process.env.NODE_ENV === 'development' && <PlaybackDebugPanel />}
    </main>
  )
}