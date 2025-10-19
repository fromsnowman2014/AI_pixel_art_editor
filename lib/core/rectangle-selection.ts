/**
 * Rectangle Selection Algorithm
 * Creates a rectangular selection area
 */

export interface RectangleSelectionOptions {
  constrainSquare?: boolean
  fromCenter?: boolean
}

export function rectangleSelect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options: RectangleSelectionOptions = {}
): Set<string> {
  const { constrainSquare = false, fromCenter = false } = options
  const selectedPixels = new Set<string>()

  let x1 = startX
  let y1 = startY
  let x2 = endX
  let y2 = endY

  // If constraining to square, adjust dimensions
  if (constrainSquare) {
    const width = Math.abs(endX - startX)
    const height = Math.abs(endY - startY)
    const size = Math.max(width, height)

    if (endX >= startX) {
      x2 = startX + size
    } else {
      x2 = startX - size
    }

    if (endY >= startY) {
      y2 = startY + size
    } else {
      y2 = startY - size
    }
  }

  // If drawing from center, adjust start position
  if (fromCenter) {
    const halfWidth = (x2 - x1) / 2
    const halfHeight = (y2 - y1) / 2
    x1 = startX - halfWidth
    y1 = startY - halfHeight
    x2 = startX + halfWidth
    y2 = startY + halfHeight
  }

  // Normalize coordinates (ensure min/max are correct)
  const minX = Math.floor(Math.min(x1, x2))
  const maxX = Math.floor(Math.max(x1, x2))
  const minY = Math.floor(Math.min(y1, y2))
  const maxY = Math.floor(Math.max(y1, y2))

  // Generate all pixels within the rectangle
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      selectedPixels.add(`${x},${y}`)
    }
  }

  return selectedPixels
}

export function getRectangleBounds(pixels: Set<string>): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} | null {
  if (pixels.size === 0) return null

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  pixels.forEach(pixel => {
    const [x, y] = pixel.split(',').map(Number)
    if (x !== undefined && y !== undefined) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  })

  return { minX, maxX, minY, maxY }
}
