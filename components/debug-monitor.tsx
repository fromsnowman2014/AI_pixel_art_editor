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
    
    if (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true') {
      console.log(`[${new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'}] 🔄 DebugMonitor [REACT_RENDER]:`, 'Component re-rendered', {
        renderCount: renderCount.current,
        activeTabId,
        tabsCount: tabs.length,
        activeTabHasCanvasData: !!activeTab?.canvasData,
        activeTabCanvasDataLength: activeTab?.canvasData?.data.length,
        timestamp: Date.now()
      })
    }
  })

  // This component renders nothing but monitors re-renders
  return null
}