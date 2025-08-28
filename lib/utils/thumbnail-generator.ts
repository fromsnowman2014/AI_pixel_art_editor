/**
 * Thumbnail Generation Utilities
 * 
 * Memory-optimized thumbnail generation for pixel art frames
 * Extracted from project-store.ts for better reusability and testing
 */

import type { PixelData } from '@/lib/types/api'

/**
 * Generate thumbnail from pixel data with memory optimization
 * 
 * CRITICAL: This function includes essential memory cleanup to prevent leaks
 * during intensive frame operations and playback.
 * 
 * @param pixelData - Source pixel data
 * @param thumbnailSize - Target thumbnail size (default: 48px)
 * @returns Base64 encoded thumbnail or null if generation fails
 */
export const generateThumbnail = (pixelData: PixelData, thumbnailSize = 48): string | null => {
  let canvas: HTMLCanvasElement | null = null
  let sourceCanvas: HTMLCanvasElement | null = null
  
  try {
    // Validate input data
    if (!pixelData || !pixelData.data || pixelData.data.length === 0) {
      return null
    }

    canvas = document.createElement('canvas')
    canvas.width = thumbnailSize
    canvas.height = thumbnailSize
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    
    if (!ctx) {
      return null
    }

    // Create source canvas with original pixel data
    sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = pixelData.width
    sourceCanvas.height = pixelData.height
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: false })
    
    if (!sourceCtx) {
      return null
    }

    // Create ImageData with proper validation
    const expectedLength = pixelData.width * pixelData.height * 4
    if (pixelData.data.length !== expectedLength) {
      return null
    }

    // Put original pixel data on source canvas
    const imageData = new ImageData(new Uint8ClampedArray(pixelData.data), pixelData.width, pixelData.height)
    sourceCtx.putImageData(imageData, 0, 0)

    // Scale down to thumbnail size with nearest neighbor (pixel perfect)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sourceCanvas, 0, 0, thumbnailSize, thumbnailSize)

    const result = canvas.toDataURL('image/png')
    return result
  } catch (error) {
    return null
  } finally {
    // CRITICAL: Clean up canvas elements to prevent memory leaks
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      canvas.width = 0
      canvas.height = 0
    }
    if (sourceCanvas) {
      const sourceCtx = sourceCanvas.getContext('2d')
      if (sourceCtx) {
        sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height)
      }
      sourceCanvas.width = 0
      sourceCanvas.height = 0
    }
  }
}

/**
 * Generate multiple thumbnails efficiently
 * Useful for batch operations during project load or frame updates
 */
export const generateThumbnails = (
  pixelDataList: PixelData[], 
  thumbnailSize = 48
): (string | null)[] => {
  return pixelDataList.map(pixelData => generateThumbnail(pixelData, thumbnailSize))
}

/**
 * Validate pixel data before thumbnail generation
 * Helps prevent unnecessary processing of invalid data
 */
export const validatePixelData = (pixelData: PixelData): boolean => {
  if (!pixelData || !pixelData.data || pixelData.data.length === 0) {
    return false
  }
  
  const expectedLength = pixelData.width * pixelData.height * 4
  return pixelData.data.length === expectedLength
}