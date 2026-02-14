'use client'

/**
 * Color Palette Extraction Utility
 * Extracts dominant colors from an image using Median Cut algorithm
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface ColorPalette {
  colors: string[] // Hex color strings
  colorCounts: Map<string, number> // Color frequency
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Convert hex string to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : { r: 0, g: 0, b: 0 }
}

/**
 * Calculate color distance (Euclidean distance in RGB space)
 */
function colorDistance(c1: RGB, c2: RGB): number {
  const dr = c1.r - c2.r
  const dg = c1.g - c2.g
  const db = c1.b - c2.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * Color Bucket for Median Cut algorithm
 */
class ColorBucket {
  colors: RGB[]

  constructor(colors: RGB[]) {
    this.colors = colors
  }

  /**
   * Calculate the range of a color channel
   */
  getRange(channel: 'r' | 'g' | 'b'): number {
    const values = this.colors.map(c => c[channel])
    return Math.max(...values) - Math.min(...values)
  }

  /**
   * Get the channel with the widest range
   */
  getWidestChannel(): 'r' | 'g' | 'b' {
    const rRange = this.getRange('r')
    const gRange = this.getRange('g')
    const bRange = this.getRange('b')

    if (rRange >= gRange && rRange >= bRange) return 'r'
    if (gRange >= rRange && gRange >= bRange) return 'g'
    return 'b'
  }

  /**
   * Split bucket into two at the median of the widest channel
   */
  split(): [ColorBucket, ColorBucket] {
    const channel = this.getWidestChannel()

    // Sort by the widest channel
    const sorted = [...this.colors].sort((a, b) => a[channel] - b[channel])

    // Split at median
    const mid = Math.floor(sorted.length / 2)

    return [
      new ColorBucket(sorted.slice(0, mid)),
      new ColorBucket(sorted.slice(mid))
    ]
  }

  /**
   * Get average color of the bucket
   */
  getAverageColor(): RGB {
    if (this.colors.length === 0) {
      return { r: 0, g: 0, b: 0 }
    }

    const sum = this.colors.reduce(
      (acc, color) => ({
        r: acc.r + color.r,
        g: acc.g + color.g,
        b: acc.b + color.b,
      }),
      { r: 0, g: 0, b: 0 }
    )

    return {
      r: Math.round(sum.r / this.colors.length),
      g: Math.round(sum.g / this.colors.length),
      b: Math.round(sum.b / this.colors.length),
    }
  }
}

/**
 * Extract color palette from ImageData using Median Cut algorithm
 *
 * @param imageData - Canvas ImageData to extract colors from
 * @param maxColors - Maximum number of colors to extract (default: 24)
 * @param skipTransparent - Whether to skip fully transparent pixels (default: true)
 * @returns ColorPalette with extracted colors
 */
export function extractColorPalette(
  imageData: ImageData,
  maxColors: number = 24,
  skipTransparent: boolean = true
): ColorPalette {
  const { data, width, height } = imageData
  const pixels: RGB[] = []
  const colorFrequency = new Map<string, number>()

  // Sample pixels (skip some pixels for performance on large images)
  const sampleRate = Math.max(1, Math.floor((width * height) / 10000))

  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    const a = data[i + 3] ?? 255

    // Skip transparent pixels if requested
    if (skipTransparent && a < 10) {
      continue
    }

    const rgb: RGB = { r, g, b }
    pixels.push(rgb)

    // Track color frequency
    const hex = rgbToHex(r, g, b)
    colorFrequency.set(hex, (colorFrequency.get(hex) || 0) + 1)
  }

  // If we have fewer unique colors than maxColors, return them directly
  const uniqueColors = Array.from(colorFrequency.keys())
  if (uniqueColors.length <= maxColors) {
    return {
      colors: uniqueColors,
      colorCounts: colorFrequency
    }
  }

  // Apply Median Cut algorithm
  const buckets: ColorBucket[] = [new ColorBucket(pixels)]

  // Keep splitting until we have maxColors buckets
  while (buckets.length < maxColors) {
    // Find the bucket with the most colors
    buckets.sort((a, b) => b.colors.length - a.colors.length)
    const bucketToSplit = buckets[0]

    if (!bucketToSplit || bucketToSplit.colors.length <= 1) {
      break // Can't split further
    }

    // Split the largest bucket
    const [bucket1, bucket2] = bucketToSplit.split()
    buckets.shift() // Remove the original bucket
    buckets.push(bucket1, bucket2)
  }

  // Get average color from each bucket
  const paletteColors = buckets
    .map(bucket => {
      const avgColor = bucket.getAverageColor()
      return rgbToHex(avgColor.r, avgColor.g, avgColor.b)
    })
    .filter((color, index, self) => self.indexOf(color) === index) // Remove duplicates

  // Sort by frequency (most common first)
  paletteColors.sort((a, b) => {
    const freqA = colorFrequency.get(a) || 0
    const freqB = colorFrequency.get(b) || 0
    return freqB - freqA
  })

  return {
    colors: paletteColors.slice(0, maxColors),
    colorCounts: colorFrequency
  }
}

/**
 * Extract color palette from an image element
 *
 * @param img - HTMLImageElement to extract colors from
 * @param maxColors - Maximum number of colors to extract
 * @returns ColorPalette with extracted colors
 */
export function extractColorPaletteFromImage(
  img: HTMLImageElement,
  maxColors: number = 24
): ColorPalette {
  // Create temporary canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // Use smaller canvas for faster processing
  const maxDimension = 200
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))

  canvas.width = Math.floor(img.width * scale)
  canvas.height = Math.floor(img.height * scale)

  // Draw image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Extract palette
  return extractColorPalette(imageData, maxColors)
}

/**
 * Simplify a palette by merging similar colors
 *
 * @param colors - Array of hex color strings
 * @param threshold - Distance threshold for merging colors (0-441, default: 30)
 * @returns Simplified array of hex colors
 */
export function simplifyPalette(colors: string[], threshold: number = 30): string[] {
  if (colors.length <= 1) return colors

  const rgbColors = colors.map(hexToRgb)
  const merged: RGB[] = []
  const used = new Set<number>()

  for (let i = 0; i < rgbColors.length; i++) {
    if (used.has(i)) continue

    const baseColor = rgbColors[i]!
    const similarColors: RGB[] = [baseColor]

    // Find similar colors
    for (let j = i + 1; j < rgbColors.length; j++) {
      if (used.has(j)) continue

      const compareColor = rgbColors[j]!
      if (colorDistance(baseColor, compareColor) < threshold) {
        similarColors.push(compareColor)
        used.add(j)
      }
    }

    // Average similar colors
    const avgColor: RGB = {
      r: Math.round(similarColors.reduce((sum, c) => sum + c.r, 0) / similarColors.length),
      g: Math.round(similarColors.reduce((sum, c) => sum + c.g, 0) / similarColors.length),
      b: Math.round(similarColors.reduce((sum, c) => sum + c.b, 0) / similarColors.length),
    }

    merged.push(avgColor)
  }

  return merged.map(c => rgbToHex(c.r, c.g, c.b))
}
