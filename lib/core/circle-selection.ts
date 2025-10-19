/**
 * Circle/Ellipse Selection Algorithm
 * Creates a circular or elliptical selection area
 */

export interface CircleSelectionOptions {
  constrainCircle?: boolean
  fromCenter?: boolean
  filled?: boolean
}

export function circleSelect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options: CircleSelectionOptions = {}
): Set<string> {
  const { constrainCircle = false, fromCenter = true, filled = true } = options
  const selectedPixels = new Set<string>()

  // Calculate center and radii
  let centerX: number
  let centerY: number
  let radiusX: number
  let radiusY: number

  if (fromCenter) {
    centerX = startX
    centerY = startY
    radiusX = Math.abs(endX - startX)
    radiusY = Math.abs(endY - startY)
  } else {
    centerX = (startX + endX) / 2
    centerY = (startY + endY) / 2
    radiusX = Math.abs(endX - startX) / 2
    radiusY = Math.abs(endY - startY) / 2
  }

  // If constraining to circle, use the maximum radius for both axes
  if (constrainCircle) {
    const maxRadius = Math.max(radiusX, radiusY)
    radiusX = maxRadius
    radiusY = maxRadius
  }

  // Use bounding box to iterate through potential pixels
  const minX = Math.floor(centerX - radiusX)
  const maxX = Math.ceil(centerX + radiusX)
  const minY = Math.floor(centerY - radiusY)
  const maxY = Math.ceil(centerY + radiusY)

  if (filled) {
    // Filled ellipse/circle - use ellipse equation
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Ellipse equation: ((x - cx) / rx)^2 + ((y - cy) / ry)^2 <= 1
        const dx = (x - centerX) / (radiusX || 1)
        const dy = (y - centerY) / (radiusY || 1)
        const distanceSquared = dx * dx + dy * dy

        if (distanceSquared <= 1) {
          selectedPixels.add(`${x},${y}`)
        }
      }
    }
  } else {
    // Outline only - use midpoint ellipse algorithm (simplified)
    // For now, we'll implement a simple outline by checking distance from edge
    const thickness = 1
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = (x - centerX) / (radiusX || 1)
        const dy = (y - centerY) / (radiusY || 1)
        const distanceSquared = dx * dx + dy * dy

        // Check if pixel is on the edge (within thickness)
        if (distanceSquared >= (1 - thickness / radiusX) && distanceSquared <= 1) {
          selectedPixels.add(`${x},${y}`)
        }
      }
    }
  }

  return selectedPixels
}

export function getCircleBounds(pixels: Set<string>): {
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
