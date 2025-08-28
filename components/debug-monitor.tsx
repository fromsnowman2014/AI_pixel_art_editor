'use client'

import { useEffect, useRef } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'

// Debug monitoring component to track React re-renders
export function DebugMonitor() {
  const renderCount = useRef(0)
  const { activeTabId, tabs } = useProjectStore()
  const activeTab = tabs.find(tab => tab.id === activeTabId)

  useEffect(() => {
    renderCount.current += 1
    
    // Debug logging disabled for playback optimization
  })

  // This component renders nothing but monitors re-renders
  return null
}