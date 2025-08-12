'use client'

import { useEffect } from 'react'

// Component to log React environment info
export function ReactDebugInfo() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true') {
      const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
      console.log(`[${timestamp}] ⚛️ ReactDebugInfo [REACT_ENV]:`, 'React environment info', {
        isDevelopment: process.env.NODE_ENV === 'development',
        isStrictMode: typeof window !== 'undefined' && window.React?.StrictMode !== undefined,
        reactVersion: typeof window !== 'undefined' && window.React?.version,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      })
    }
  }, [])

  return null
}

// Add to window for manual debugging
if (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true') {
  (window as any).debugReactInfo = () => {
    console.log('🔍 Manual React Debug Info:', {
      strictMode: typeof window !== 'undefined' && window.React?.StrictMode !== undefined,
      reactVersion: typeof window !== 'undefined' && window.React?.version,
      nodeEnv: process.env.NODE_ENV,
      timestamp: Date.now()
    })
  }
}