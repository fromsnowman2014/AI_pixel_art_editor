/**
 * Tests for project factory functions
 */

import { 
  createDefaultCanvasState,
  createDefaultProject,
  createDefaultFrame,
  createEmptyPixelData,
  createFrame,
  createProjectWithFrame,
  validateProjectDimensions
} from '@/lib/factories/project-factories'

describe('Project Factories', () => {
  describe('createDefaultCanvasState', () => {
    test('should create default canvas state', () => {
      const canvasState = createDefaultCanvasState()
      
      expect(canvasState).toEqual({
        tool: 'pencil',
        color: '#000000',
        brushSize: 1,
        brushShape: 'square',
        zoom: 8,
        panX: 0,
        panY: 0,
        selection: {
          isActive: false,
          selectedPixels: new Set<string>(),
          bounds: null,
          tolerance: 0
        }
      })
    })
  })

  describe('createDefaultProject', () => {
    test('should create default project with defaults', () => {
      const project = createDefaultProject()
      
      expect(project).toEqual({
        userId: null,
        name: 'New Project',
        width: 32,
        height: 32,
        colorLimit: 24,
        palette: expect.any(Array),
        frames: [],
        activeFrameId: null,
      })
    })

    test('should create project with custom options', () => {
      const options = {
        width: 64,
        height: 48,
        colorLimit: 16,
        userId: 'user123'
      }
      
      const project = createDefaultProject(options)
      
      expect(project).toEqual({
        userId: 'user123',
        name: 'New Project',
        width: 64,
        height: 48,
        colorLimit: 16,
        palette: expect.any(Array),
        frames: [],
        activeFrameId: null,
      })
    })
  })

  describe('createDefaultFrame', () => {
    test('should create default frame', () => {
      const frame = createDefaultFrame()
      
      expect(frame).toEqual({
        projectId: '',
        index: 0,
        delayMs: 300,
        included: true,
        layers: [],
        flattenedPngUrl: null,
      })
    })
  })

  describe('createEmptyPixelData', () => {
    test('should create empty pixel data', () => {
      const pixelData = createEmptyPixelData(16, 16)
      
      expect(pixelData).toEqual({
        width: 16,
        height: 16,
        data: expect.any(Uint8ClampedArray)
      })
      
      expect(pixelData.data.length).toBe(16 * 16 * 4)
      expect(pixelData.data.every(pixel => pixel === 0)).toBe(true)
    })
  })

  describe('createFrame', () => {
    test('should create frame with proper ID and timestamps', () => {
      const projectId = 'project-123'
      const index = 2
      const delayMs = 500
      
      const frame = createFrame(projectId, index, delayMs)
      
      expect(frame).toEqual({
        id: expect.stringMatching(/^frame-\d+$/),
        projectId: 'project-123',
        index: 2,
        delayMs: 500,
        included: true,
        layers: [],
        flattenedPngUrl: null,
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      })
    })

    test('should use default delay if not provided', () => {
      const frame = createFrame('project-123', 0)
      expect(frame.delayMs).toBe(300)
    })
  })

  describe('createProjectWithFrame', () => {
    test('should create project and initial frame', () => {
      const result = createProjectWithFrame({ name: 'Test Project' })
      
      expect(result.project).toEqual({
        id: expect.stringMatching(/^project-\d+$/),
        name: 'Test Project',
        width: 32,
        height: 32,
        colorLimit: 24,
        userId: null,
        palette: expect.any(Array),
        frames: [],
        activeFrameId: null,
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      })
      
      expect(result.frame).toEqual({
        id: expect.stringMatching(/^frame-\d+$/),
        projectId: result.project.id,
        index: 0,
        delayMs: 300,
        included: true,
        layers: [],
        flattenedPngUrl: null,
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      })
    })
  })

  describe('validateProjectDimensions', () => {
    test('should validate correct dimensions', () => {
      const result = validateProjectDimensions(32, 64)
      
      expect(result).toEqual({
        width: 32,
        height: 64,
        isValid: true,
        wasAdjusted: false
      })
    })

    test('should adjust dimensions below minimum', () => {
      const result = validateProjectDimensions(4, 6)
      
      expect(result).toEqual({
        width: 8,
        height: 8,
        isValid: false,
        wasAdjusted: true
      })
    })

    test('should adjust dimensions above maximum', () => {
      const result = validateProjectDimensions(200, 150)
      
      expect(result).toEqual({
        width: 128,
        height: 128,
        isValid: false,
        wasAdjusted: true
      })
    })

    test('should handle decimal values', () => {
      const result = validateProjectDimensions(32.7, 45.3)
      
      expect(result).toEqual({
        width: 32,
        height: 45,
        isValid: false,
        wasAdjusted: true
      })
    })
  })
})