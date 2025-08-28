/**
 * Project Factory Functions
 * 
 * Factory functions for creating default project objects
 * Extracted from project-store.ts for better organization and testing
 */

import type { Project, Frame, PixelData, CanvasState } from '@/lib/types/api'
import { generatePalette, DEFAULT_PALETTE } from '@/lib/utils'

/**
 * Create default canvas state
 * 
 * @returns Default CanvasState object
 */
export const createDefaultCanvasState = (): CanvasState => ({
  tool: 'pencil',
  color: '#000000',
  brushSize: 1,
  zoom: 8, // 8x zoom for pixel art
  panX: 0,
  panY: 0,
  selection: {
    isActive: false,
    selectedPixels: new Set<string>(),
    bounds: null,
    tolerance: 0 // Exact color match by default
  }
})

/**
 * Create default project with customizable options
 * 
 * @param options - Optional project configuration
 * @returns Default Project object (without id and timestamps)
 */
export const createDefaultProject = (options?: {
  width?: number
  height?: number
  colorLimit?: number
  userId?: string | null
}): Omit<Project, 'id' | 'createdAt' | 'updatedAt'> => ({
  userId: options?.userId || null,
  name: 'New Project',
  width: options?.width || 32,
  height: options?.height || 32,
  colorLimit: options?.colorLimit || 24,
  palette: generatePalette(options?.colorLimit || 24),
  frames: [],
  activeFrameId: null,
})

/**
 * Create default frame template
 * 
 * @returns Default Frame object (without id and timestamps)
 */
export const createDefaultFrame = (): Omit<Frame, 'id' | 'createdAt' | 'updatedAt'> => ({
  projectId: '',
  index: 0,
  delayMs: 300,
  included: true,
  layers: [],
  flattenedPngUrl: null
})

/**
 * Create empty pixel data with specified dimensions
 * 
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @returns Empty PixelData object with transparent pixels
 */
export const createEmptyPixelData = (width: number, height: number): PixelData => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4), // RGBA
})

/**
 * Create a new frame with proper initialization
 * 
 * @param projectId - ID of the parent project
 * @param index - Frame index in sequence
 * @param delayMs - Frame delay in milliseconds
 * @returns Complete Frame object
 */
export const createFrame = (
  projectId: string, 
  index: number, 
  delayMs: number = 300
): Frame => {
  const baseFrame = createDefaultFrame()
  const now = new Date().toISOString()
  
  return {
    ...baseFrame,
    id: `frame-${Date.now()}`,
    projectId,
    index,
    delayMs,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Create project with initial frame
 * 
 * @param options - Project creation options
 * @returns Object containing project and initial frame
 */
export const createProjectWithFrame = (options?: {
  name?: string
  width?: number
  height?: number
  colorLimit?: number
}) => {
  const projectBase = createDefaultProject(options)
  const projectId = `project-${Date.now()}`
  const now = new Date().toISOString()
  
  const project: Project = {
    ...projectBase,
    id: projectId,
    name: options?.name || 'New Project',
    createdAt: now,
    updatedAt: now
  }
  
  const frame = createFrame(project.id, 0)
  
  return { project, frame }
}

/**
 * Validate project dimensions
 * 
 * @param width - Proposed width
 * @param height - Proposed height
 * @returns Validation result with adjusted dimensions if needed
 */
export const validateProjectDimensions = (width: number, height: number) => {
  const minSize = 8
  const maxSize = 128
  
  const validWidth = Math.max(minSize, Math.min(maxSize, Math.floor(width)))
  const validHeight = Math.max(minSize, Math.min(maxSize, Math.floor(height)))
  
  return {
    width: validWidth,
    height: validHeight,
    isValid: validWidth === width && validHeight === height,
    wasAdjusted: validWidth !== width || validHeight !== height
  }
}