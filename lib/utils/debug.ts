// Centralized debug utility
const DEBUG_MODE = process.env.NODE_ENV === 'development' || 
  (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')

export const debugLog = (component: string, category: string, message: string, data?: any) => {
  if (DEBUG_MODE) {
    console.log(`${component} [${category}]:`, message, data || '')
  }
}

// Specific debug functions for different components
export const canvasDebug = (category: string, message: string, data?: any) => 
  debugLog('🎨', category, message, data)

export const storeDebug = (category: string, message: string, data?: any) => 
  debugLog('🏪', category, message, data)

export const exportDebug = (category: string, message: string, data?: any) => 
  debugLog('💾', category, message, data)

export const frameDebug = (category: string, message: string, data?: any) => 
  debugLog('🎬', category, message, data)