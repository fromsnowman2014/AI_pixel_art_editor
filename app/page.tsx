'use client'

import { useEffect } from 'react'
import { PixelEditor } from '@/components/pixel-editor'
import { useProjectStore } from '@/lib/stores/project-store'

export default function HomePage() {
  const { initializeApp } = useProjectStore()

  useEffect(() => {
    // Initialize the app with default project
    initializeApp()
  }, [initializeApp])

  return (
    <main className="min-h-screen bg-gray-50">
      <PixelEditor />
    </main>
  )
}