/**
 * Canvas Analysis Utilities
 * Analyzes canvas state for AI generation decision making
 */

export interface CanvasAnalysis {
  isEmpty: boolean;
  hasTransparency: boolean;
  dominantColors: string[];
  pixelDensity: number;
  contentBounds: { x: number; y: number; width: number; height: number } | null;
  totalPixels: number;
  filledPixels: number;
  fillPercentage: number;
}

/**
 * Analyzes canvas ImageData to determine its state and characteristics
 */
export function analyzeCanvas(imageData: ImageData): CanvasAnalysis {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  
  let hasTransparency = false;
  let filledPixels = 0;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  const colorCount = new Map<string, number>();
  
  // Analyze each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index] ?? 0;
      const g = data[index + 1] ?? 0;
      const b = data[index + 2] ?? 0;
      const a = data[index + 3] ?? 0;
      
      // Check transparency
      if (a === 0) {
        hasTransparency = true;
      } else {
        filledPixels++;
        
        // Update content bounds
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        
        // Count colors (only non-transparent pixels)
        const colorKey = `rgb(${r},${g},${b})`;
        colorCount.set(colorKey, (colorCount.get(colorKey) || 0) + 1);
      }
    }
  }
  
  // Calculate metrics
  const isEmpty = filledPixels === 0;
  const fillPercentage = (filledPixels / totalPixels) * 100;
  const pixelDensity = fillPercentage / 100;
  
  // Get dominant colors (top 5)
  const sortedColors = Array.from(colorCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([color]) => color);
  
  // Content bounds (null if empty)
  const contentBounds = isEmpty ? null : {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
  
  return {
    isEmpty,
    hasTransparency,
    dominantColors: sortedColors,
    pixelDensity,
    contentBounds,
    totalPixels,
    filledPixels,
    fillPercentage
  };
}

/**
 * Simple check if canvas is empty (no non-transparent pixels)
 */
export function isCanvasEmpty(imageData: ImageData): boolean {
  const { data } = imageData;
  
  // Check every 4th value (alpha channel)
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) > 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Convert canvas to base64 data URL
 */
export function getCanvasAsBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Get canvas ImageData safely
 */
export function getCanvasImageData(canvas: HTMLCanvasElement): ImageData | null {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (error) {
    console.error('Failed to get canvas image data:', error);
    return null;
  }
}

/**
 * Generate content hash for change detection
 */
export function generateContentHash(imageData: ImageData): string {
  const { data } = imageData;
  let hash = 0;
  
  // Simple hash function for image data
  for (let i = 0; i < data.length; i += 4) {
    const pixel = (data[i] ?? 0) << 24 | (data[i + 1] ?? 0) << 16 | (data[i + 2] ?? 0) << 8 | (data[i + 3] ?? 0);
    hash = ((hash << 5) - hash + pixel) & 0xffffffff;
  }
  
  return hash.toString(36);
}

/**
 * Debug function to log canvas analysis results
 */
export function debugCanvasAnalysis(analysis: CanvasAnalysis, label = 'Canvas'): void {
  console.log(`🔍 ${label} Analysis:`, {
    isEmpty: analysis.isEmpty,
    fillPercentage: `${analysis.fillPercentage.toFixed(1)}%`,
    hasTransparency: analysis.hasTransparency,
    dominantColors: analysis.dominantColors.slice(0, 3),
    contentBounds: analysis.contentBounds,
    pixelDensity: analysis.pixelDensity.toFixed(3)
  });
}