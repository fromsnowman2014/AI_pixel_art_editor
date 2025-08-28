
import { logCanvas, logFrame, logProject, logAI, logUI, logAPI, logError, logDebug } from '@/lib/ui/centralized-logger'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Color utility functions for pixel art
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1] || '0', 16),
        g: parseInt(result[2] || '0', 16),
        b: parseInt(result[3] || '0', 16),
      }
    : null
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

// Canvas utilities
export function getPixelRatio(): number {
  return window.devicePixelRatio || 1
}

export function createPixelCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // Disable image smoothing for pixel art
    ctx.imageSmoothingEnabled = false
    // @ts-ignore - Webkit specific properties for older browsers
    if (ctx.webkitImageSmoothingEnabled !== undefined) ctx.webkitImageSmoothingEnabled = false
    // @ts-ignore - Mozilla specific properties for older browsers
    if (ctx.mozImageSmoothingEnabled !== undefined) ctx.mozImageSmoothingEnabled = false
    // @ts-ignore - Microsoft specific properties for older browsers
    if (ctx.msImageSmoothingEnabled !== undefined) ctx.msImageSmoothingEnabled = false
  }
  
  return canvas
}

// Local storage utilities
export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
logAI('Failed to save to localStorage:', error)
  }
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
logAI('Failed to load from localStorage:', error)
    return defaultValue
  }
}

// Image processing utilities
export function resizeImageData(
  imageData: ImageData,
  newWidth: number,
  newHeight: number
): ImageData {
  const canvas = createPixelCanvas(newWidth, newHeight)
  const ctx = canvas.getContext('2d')!
  
  // Create temporary canvas with original data
  const tempCanvas = createPixelCanvas(imageData.width, imageData.height)
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(imageData, 0, 0)
  
  // Draw scaled image using nearest-neighbor
  ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight)
  
  return ctx.getImageData(0, 0, newWidth, newHeight)
}

export function imageDataToDataURL(imageData: ImageData): string {
  const canvas = createPixelCanvas(imageData.width, imageData.height)
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

export function dataURLToImageData(dataURL: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = createPixelCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, img.width, img.height))
    }
    img.onerror = reject
    img.src = dataURL
  })
}

// Color palette utilities
export const DEFAULT_PALETTE = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#800000', '#008000', '#000080', '#808000',
  '#800080', '#008080', '#C0C0C0', '#808080', '#9999FF', '#993366',
  '#FFFFCC', '#CCFFFF', '#660066', '#FF8080', '#0066CC', '#CCCCFF',
]

export function generatePalette(colors: number): string[] {
  // Generate a balanced color palette
  const palette: string[] = ['#000000', '#FFFFFF'] // Always include black and white
  
  if (colors <= 2) return palette.slice(0, colors)
  
  const remaining = colors - 2
  const step = 360 / remaining
  
  for (let i = 0; i < remaining; i++) {
    const hue = i * step
    const saturation = 70 + (i % 3) * 10 // Vary saturation
    const lightness = 45 + (i % 2) * 20 // Vary lightness
    palette.push(hslToHex(hue, saturation, lightness))
  }
  
  return palette
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Keyboard shortcuts
export function formatShortcut(shortcut: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  return shortcut.replace('Ctrl', isMac ? '⌘' : 'Ctrl')
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}