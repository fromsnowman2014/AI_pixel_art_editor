/**
 * Magic Wand Selection Utility
 * 
 * Professional implementation of magic wand selection for pixel art editing.
 * Uses flood fill algorithm to select connected pixels of the same color.
 */

export interface MagicWandOptions {
  tolerance: number // Color tolerance (0-100)
  contiguous: boolean // Whether to select only connected pixels
  sampleAllLayers: boolean // Whether to sample from all layers (not used in current implementation)
}

export interface MagicWandResult {
  selectedPixels: Set<string> // "x,y" format
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null
  pixelCount: number
  targetColor: {
    r: number
    g: number
    b: number
    a: number
  }
}

/**
 * Calculate color distance using Delta E formula (simplified)
 * Returns a value from 0-100 where 0 is identical colors
 */
function calculateColorDistance(
  color1: { r: number; g: number; b: number; a: number },
  color2: { r: number; g: number; b: number; a: number }
): number {
  // Handle transparency
  if (color1.a === 0 && color2.a === 0) return 0 // Both transparent
  if (color1.a === 0 || color2.a === 0) return 100 // One transparent, one not
  
  // Simplified Delta E calculation
  const deltaR = color1.r - color2.r
  const deltaG = color1.g - color2.g
  const deltaB = color1.b - color2.b
  const deltaA = color1.a - color2.a
  
  // Euclidean distance normalized to 0-100 scale
  const distance = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB + deltaA * deltaA)
  return Math.min(100, (distance / Math.sqrt(255 * 255 * 4)) * 100)
}

/**
 * Get pixel color at coordinates
 */
function getPixelColor(
  imageData: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): { r: number; g: number; b: number; a: number } {
  const index = (y * width + x) * 4
  return {
    r: imageData[index] || 0,
    g: imageData[index + 1] || 0,
    b: imageData[index + 2] || 0,
    a: imageData[index + 3] || 0
  }
}

/**
 * Check if a color matches the target color within tolerance
 */
function colorMatches(
  color: { r: number; g: number; b: number; a: number },
  targetColor: { r: number; g: number; b: number; a: number },
  tolerance: number
): boolean {
  const distance = calculateColorDistance(color, targetColor)
  return distance <= tolerance
}

/**
 * Flood fill algorithm for magic wand selection
 */
function floodFillSelection(
  imageData: Uint8ClampedArray,
  startX: number,
  startY: number,
  width: number,
  height: number,
  targetColor: { r: number; g: number; b: number; a: number },
  tolerance: number
): Set<string> {
  const selectedPixels = new Set<string>()
  const visited = new Set<string>()
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]
  
  while (stack.length > 0) {
    const { x, y } = stack.pop()!
    
    // Check bounds
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    
    const pixelKey = `${x},${y}`
    if (visited.has(pixelKey)) continue
    
    visited.add(pixelKey)
    
    // Get current pixel color
    const currentColor = getPixelColor(imageData, x, y, width)
    
    // Check if color matches within tolerance
    if (colorMatches(currentColor, targetColor, tolerance)) {
      selectedPixels.add(pixelKey)
      
      // Add neighboring pixels to stack (4-way connectivity)
      stack.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      )
    }
  }
  
  return selectedPixels
}

/**
 * Global selection algorithm (non-contiguous)
 */
function globalSelection(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  targetColor: { r: number; g: number; b: number; a: number },
  tolerance: number
): Set<string> {
  const selectedPixels = new Set<string>()
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const currentColor = getPixelColor(imageData, x, y, width)
      
      if (colorMatches(currentColor, targetColor, tolerance)) {
        selectedPixels.add(`${x},${y}`)
      }
    }
  }
  
  return selectedPixels
}

/**
 * Calculate bounding box for selected pixels
 */
function calculateBounds(selectedPixels: Set<string>): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} | null {
  if (selectedPixels.size === 0) return null
  
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  
  for (const pixelKey of Array.from(selectedPixels)) {
    const coords = pixelKey.split(',').map(Number)
    if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
      const x = coords[0]
      const y = coords[1]
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  
  return { minX, maxX, minY, maxY }
}

/**
 * Main magic wand selection function
 */
export function performMagicWandSelection(
  imageData: Uint8ClampedArray,
  clickX: number,
  clickY: number,
  width: number,
  height: number,
  options: MagicWandOptions = {
    tolerance: 0,
    contiguous: true,
    sampleAllLayers: false
  }
): MagicWandResult {
  // Validate coordinates
  if (clickX < 0 || clickX >= width || clickY < 0 || clickY >= height) {
    return {
      selectedPixels: new Set(),
      bounds: null,
      pixelCount: 0,
      targetColor: { r: 0, g: 0, b: 0, a: 0 }
    }
  }
  
  // Get target color at click position
  const targetColor = getPixelColor(imageData, clickX, clickY, width)
  
  // Perform selection based on contiguous setting
  const selectedPixels = options.contiguous
    ? floodFillSelection(imageData, clickX, clickY, width, height, targetColor, options.tolerance)
    : globalSelection(imageData, width, height, targetColor, options.tolerance)
  
  // Calculate bounds
  const bounds = calculateBounds(selectedPixels)
  
  return {
    selectedPixels,
    bounds,
    pixelCount: selectedPixels.size,
    targetColor
  }
}

/**
 * Utility to convert selection bounds to rectangle
 */
export function selectionToRect(bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX + 1,
    height: bounds.maxY - bounds.minY + 1
  }
}

/**
 * Check if a point is inside the selection
 */
export function isPointInSelection(x: number, y: number, selectedPixels: Set<string>): boolean {
  return selectedPixels.has(`${x},${y}`)
}

/**
 * Clear selection
 */
export function clearSelection(): MagicWandResult {
  return {
    selectedPixels: new Set(),
    bounds: null,
    pixelCount: 0,
    targetColor: { r: 0, g: 0, b: 0, a: 0 }
  }
}

/**
 * Expand selection by finding similar colored pixels adjacent to current selection
 * This is a color-aware expansion, not geometric
 */
export function expandSelectionSmart(
  selectedPixels: Set<string>,
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number
): Set<string> {
  const expandedPixels = new Set(selectedPixels)
  const borderPixels = new Set<string>()

  // Find border pixels of current selection
  for (const pixelKey of Array.from(selectedPixels)) {
    const coords = pixelKey.split(',').map(Number)
    if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
      const x = coords[0]
      const y = coords[1]

      // Check 4-way neighbors
      const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      ]

      for (const neighbor of neighbors) {
        if (neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height) {
          const neighborKey = `${neighbor.x},${neighbor.y}`
          if (!selectedPixels.has(neighborKey)) {
            borderPixels.add(neighborKey)
          }
        }
      }
    }
  }

  // Calculate average color of current selection
  let totalR = 0, totalG = 0, totalB = 0, totalA = 0
  let count = 0

  for (const pixelKey of Array.from(selectedPixels)) {
    const coords = pixelKey.split(',').map(Number)
    if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
      const color = getPixelColor(imageData, coords[0], coords[1], width)
      totalR += color.r
      totalG += color.g
      totalB += color.b
      totalA += color.a
      count++
    }
  }

  const avgColor = {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
    a: Math.round(totalA / count)
  }

  // Check border pixels and add those with similar colors
  for (const borderPixelKey of Array.from(borderPixels)) {
    const coords = borderPixelKey.split(',').map(Number)
    if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
      const pixelColor = getPixelColor(imageData, coords[0], coords[1], width)

      if (colorMatches(pixelColor, avgColor, tolerance)) {
        expandedPixels.add(borderPixelKey)
      }
    }
  }

  return expandedPixels
}

/**
 * Legacy geometric expansion (kept for backwards compatibility)
 */
export function expandSelection(
  selectedPixels: Set<string>,
  width: number,
  height: number
): Set<string> {
  const expandedPixels = new Set(selectedPixels)

  for (const pixelKey of Array.from(selectedPixels)) {
    const coords = pixelKey.split(',').map(Number)
    if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
      const x = coords[0]
      const y = coords[1]

      // Add 4-way neighbors only (not diagonal for more precise control)
      const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      ]

      for (const neighbor of neighbors) {
        if (neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height) {
          expandedPixels.add(`${neighbor.x},${neighbor.y}`)
        }
      }
    }
  }

  return expandedPixels
}

/**
 * Contract selection by one pixel in all directions
 */
export function contractSelection(
  selectedPixels: Set<string>,
  width: number,
  height: number
): Set<string> {
  const contractedPixels = new Set<string>()

  for (const pixelKey of Array.from(selectedPixels)) {
    const coords = pixelKey.split(',').map(Number)
    if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
      const x = coords[0]
      const y = coords[1]

      // Check if all 4-way neighbors are also selected
      const neighbors = [
        `${x + 1},${y}`,
        `${x - 1},${y}`,
        `${x},${y + 1}`,
        `${x},${y - 1}`
      ]

      const allNeighborsSelected = neighbors.every(neighborKey => {
        const neighborCoords = neighborKey.split(',').map(Number)
        if (neighborCoords.length === 2 && neighborCoords[0] !== undefined && neighborCoords[1] !== undefined) {
          const nx = neighborCoords[0]
          const ny = neighborCoords[1]
          // Boundary pixels are considered "selected" for contraction
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true
          return selectedPixels.has(neighborKey)
        }
        return false
      })

      if (allNeighborsSelected) {
        contractedPixels.add(pixelKey)
      }
    }
  }

  return contractedPixels
}

/**
 * Add to selection (union operation)
 * Combines existing selection with new selection
 */
export function addToSelection(
  existingSelection: Set<string>,
  newSelection: Set<string>
): Set<string> {
  const combined = new Set(existingSelection)
  Array.from(newSelection).forEach(pixel => combined.add(pixel))
  return combined
}

/**
 * Subtract from selection (difference operation)
 * Removes new selection from existing selection
 */
export function subtractFromSelection(
  existingSelection: Set<string>,
  selectionToRemove: Set<string>
): Set<string> {
  const result = new Set(existingSelection)
  Array.from(selectionToRemove).forEach(pixel => result.delete(pixel))
  return result
}

/**
 * Intersect selection (intersection operation)
 * Keeps only pixels that are in both selections
 */
export function intersectSelection(
  selection1: Set<string>,
  selection2: Set<string>
): Set<string> {
  const result = new Set<string>()
  Array.from(selection1).forEach(pixel => {
    if (selection2.has(pixel)) {
      result.add(pixel)
    }
  })
  return result
}