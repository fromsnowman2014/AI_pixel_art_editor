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
  
  for (const pixelKey of selectedPixels) {
    const [x, y] = pixelKey.split(',').map(Number)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
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
 * Expand selection by one pixel in all directions
 */
export function expandSelection(
  selectedPixels: Set<string>,
  width: number,
  height: number
): Set<string> {
  const expandedPixels = new Set(selectedPixels)
  
  for (const pixelKey of selectedPixels) {
    const [x, y] = pixelKey.split(',').map(Number)
    
    // Add neighboring pixels
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
      // Diagonal neighbors for smoother expansion
      { x: x + 1, y: y + 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
      { x: x - 1, y: y - 1 }
    ]
    
    for (const neighbor of neighbors) {
      if (neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height) {
        expandedPixels.add(`${neighbor.x},${neighbor.y}`)
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
  
  for (const pixelKey of selectedPixels) {
    const [x, y] = pixelKey.split(',').map(Number)
    
    // Check if all 4-way neighbors are also selected
    const neighbors = [
      `${x + 1},${y}`,
      `${x - 1},${y}`,
      `${x},${y + 1}`,
      `${x},${y - 1}`
    ]
    
    const allNeighborsSelected = neighbors.every(neighborKey => {
      const [nx, ny] = neighborKey.split(',').map(Number)
      // Boundary pixels are considered "selected" for contraction
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true
      return selectedPixels.has(neighborKey)
    })
    
    if (allNeighborsSelected) {
      contractedPixels.add(pixelKey)
    }
  }
  
  return contractedPixels
}