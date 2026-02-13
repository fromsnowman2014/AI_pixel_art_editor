/**
 * Brush Pattern Generator
 *
 * Generates pixel offset arrays for square and circle brush shapes.
 * Results are cached for performance.
 */

export type BrushShape = 'square' | 'circle'

export interface BrushOffset {
  dx: number
  dy: number
}

const cache = new Map<string, BrushOffset[]>()

/**
 * Generate the set of pixel offsets for a brush of given size and shape.
 *
 * Square: NxN grid centered on (0,0).
 *   - Size 1: just (0,0)
 *   - Size 2: (0,0), (1,0), (0,1), (1,1) (top-left anchor)
 *   - Size 3: (-1,-1) to (1,1) (centered)
 *
 * Circle: pixels within radius using Euclidean distance.
 *   - radius = size / 2
 *   - Include pixel (dx,dy) if sqrt(dx^2 + dy^2) <= radius
 *   - Always includes center pixel
 */
export function getBrushOffsets(size: number, shape: BrushShape): BrushOffset[] {
  const clampedSize = Math.max(1, Math.min(64, Math.round(size)))
  const key = `${clampedSize}-${shape}`

  const cached = cache.get(key)
  if (cached) return cached

  const offsets: BrushOffset[] = []

  if (shape === 'square') {
    const offset = Math.floor((clampedSize - 1) / 2)
    for (let dy = -offset; dy < -offset + clampedSize; dy++) {
      for (let dx = -offset; dx < -offset + clampedSize; dx++) {
        offsets.push({ dx, dy })
      }
    }
  } else {
    // Circle
    const radius = clampedSize / 2
    const r = Math.ceil(radius)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= radius) {
          offsets.push({ dx, dy })
        }
      }
    }
    // Ensure center pixel is always included
    if (!offsets.some(o => o.dx === 0 && o.dy === 0)) {
      offsets.push({ dx: 0, dy: 0 })
    }
  }

  cache.set(key, offsets)
  return offsets
}
