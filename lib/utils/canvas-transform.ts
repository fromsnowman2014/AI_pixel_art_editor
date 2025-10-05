// lib/utils/canvas-transform.ts
// Canvas Transform Utilities for Pixel Art Editor

import type { PixelData } from '@/lib/types/api'
import { createPixelCanvas } from '@/lib/utils'

/**
 * Flip canvas horizontally (left ↔ right)
 * Mirrors pixel data along the X axis
 */
export function flipHorizontal(pixelData: PixelData): PixelData {
  const { width, height, data } = pixelData
  const newData = new Uint8ClampedArray(data.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4
      const destX = width - 1 - x  // Mirror horizontally
      const destIndex = (y * width + destX) * 4

      // Copy RGBA values
      newData[destIndex] = data[srcIndex] ?? 0
      newData[destIndex + 1] = data[srcIndex + 1] ?? 0
      newData[destIndex + 2] = data[srcIndex + 2] ?? 0
      newData[destIndex + 3] = data[srcIndex + 3] ?? 0
    }
  }

  return { width, height, data: newData }
}

/**
 * Flip canvas vertically (top ↔ bottom)
 * Mirrors pixel data along the Y axis
 */
export function flipVertical(pixelData: PixelData): PixelData {
  const { width, height, data } = pixelData
  const newData = new Uint8ClampedArray(data.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4
      const destY = height - 1 - y  // Mirror vertically
      const destIndex = (destY * width + x) * 4

      // Copy RGBA values
      newData[destIndex] = data[srcIndex] ?? 0
      newData[destIndex + 1] = data[srcIndex + 1] ?? 0
      newData[destIndex + 2] = data[srcIndex + 2] ?? 0
      newData[destIndex + 3] = data[srcIndex + 3] ?? 0
    }
  }

  return { width, height, data: newData }
}

/**
 * Rotate canvas 90° clockwise
 * WARNING: Width and height are swapped!
 * Coordinate transformation: (x, y) -> (height - 1 - y, x)
 */
export function rotate90Clockwise(pixelData: PixelData): PixelData {
  const { width, height, data } = pixelData
  const newWidth = height   // Swap dimensions
  const newHeight = width
  const newData = new Uint8ClampedArray(data.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4

      // 90° clockwise rotation: (x, y) -> (height - 1 - y, x)
      const destX = height - 1 - y
      const destY = x
      const destIndex = (destY * newWidth + destX) * 4

      // Copy RGBA values
      newData[destIndex] = data[srcIndex] ?? 0
      newData[destIndex + 1] = data[srcIndex + 1] ?? 0
      newData[destIndex + 2] = data[srcIndex + 2] ?? 0
      newData[destIndex + 3] = data[srcIndex + 3] ?? 0
    }
  }

  return { width: newWidth, height: newHeight, data: newData }
}

/**
 * Rotate canvas 180°
 * Equivalent to rotate90Clockwise() called twice
 */
export function rotate180(pixelData: PixelData): PixelData {
  return rotate90Clockwise(rotate90Clockwise(pixelData))
}

/**
 * Rotate canvas 270° clockwise (90° counter-clockwise)
 * Equivalent to rotate90Clockwise() called three times
 */
export function rotate270Clockwise(pixelData: PixelData): PixelData {
  return rotate90Clockwise(rotate90Clockwise(rotate90Clockwise(pixelData)))
}

/**
 * Rotate canvas by arbitrary angle using Canvas API
 * Uses nearest-neighbor interpolation to preserve pixel art quality
 *
 * WARNING: Canvas size will expand to prevent clipping
 *
 * @param pixelData - Source pixel data
 * @param angleDegrees - Rotation angle in degrees (-180 to 180)
 * @returns Rotated pixel data with potentially different dimensions
 */
export function rotateFree(
  pixelData: PixelData,
  angleDegrees: number
): PixelData {
  const { width, height, data } = pixelData

  // 1. Create temporary canvas with source image
  const tempCanvas = createPixelCanvas(width, height)
  const ctx = tempCanvas.getContext('2d')!

  // Put source pixel data into temporary canvas
  const imageData = new ImageData(new Uint8ClampedArray(data), width, height)
  ctx.putImageData(imageData, 0, 0)

  // 2. Calculate new canvas size to prevent clipping
  // After rotation, the bounding box expands
  const angleRad = (angleDegrees * Math.PI) / 180
  const cos = Math.abs(Math.cos(angleRad))
  const sin = Math.abs(Math.sin(angleRad))
  const newWidth = Math.ceil(width * cos + height * sin)
  const newHeight = Math.ceil(width * sin + height * cos)

  // 3. Create output canvas with expanded size
  const rotatedCanvas = createPixelCanvas(newWidth, newHeight)
  const rotatedCtx = rotatedCanvas.getContext('2d')!

  // 4. Configure nearest-neighbor interpolation (critical for pixel art!)
  rotatedCtx.imageSmoothingEnabled = false

  // 5. Apply rotation transformation
  rotatedCtx.translate(newWidth / 2, newHeight / 2)
  rotatedCtx.rotate(angleRad)
  rotatedCtx.drawImage(tempCanvas, -width / 2, -height / 2)

  // 6. Extract pixel data from rotated canvas
  const rotatedImageData = rotatedCtx.getImageData(0, 0, newWidth, newHeight)

  return {
    width: newWidth,
    height: newHeight,
    data: new Uint8ClampedArray(rotatedImageData.data)
  }
}

// Type definitions
export type TransformType = 'flip-h' | 'flip-v' | 'rotate-90' | 'rotate-free'
export type TransformScope = 'current' | 'all'

export interface TransformOptions {
  type: TransformType
  scope: TransformScope
  angle?: number  // For rotate operations (90, 180, 270, or custom)
}
