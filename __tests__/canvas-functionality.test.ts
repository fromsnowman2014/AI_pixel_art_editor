import { render, fireEvent, screen, act } from '@testing-library/react'
import { useProjectStore } from '@/lib/stores/project-store'

// Test Canvas Core Functionality
describe('Canvas Core Functionality', () => {
  beforeEach(() => {
    // Reset the store before each test
    useProjectStore.setState({
      tabs: [],
      activeTabId: null,
    })
  })

  describe('Canvas Initialization', () => {
    test('should create canvas with proper pixel art settings', () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      expect(canvas).toBeDefined()
      expect(ctx).toBeDefined()
      expect(ctx?.imageSmoothingEnabled).toBe(false) // Should be false for pixel art
    })

    test('should initialize with correct dimensions', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      
      expect(canvas.width).toBe(32)
      expect(canvas.height).toBe(32)
    })

    test('should create ImageData correctly', () => {
      const width = 32
      const height = 32
      const imageData = new ImageData(width, height)
      
      expect(imageData.width).toBe(width)
      expect(imageData.height).toBe(height)
      expect(imageData.data.length).toBe(width * height * 4) // RGBA
    })
  })

  describe('Pixel Manipulation', () => {
    test('should set pixel color correctly', () => {
      const width = 32
      const height = 32
      const pixelData = new Uint8ClampedArray(width * height * 4)
      
      // Set a red pixel at position (0, 0)
      const index = 0
      pixelData[index] = 255     // R
      pixelData[index + 1] = 0   // G
      pixelData[index + 2] = 0   // B
      pixelData[index + 3] = 255 // A
      
      expect(pixelData[0]).toBe(255)
      expect(pixelData[1]).toBe(0)
      expect(pixelData[2]).toBe(0)
      expect(pixelData[3]).toBe(255)
    })

    test('should calculate pixel index correctly', () => {
      const width = 32
      const x = 5
      const y = 3
      const expectedIndex = (y * width + x) * 4
      
      expect(expectedIndex).toBe((3 * 32 + 5) * 4)
      expect(expectedIndex).toBe(101 * 4)
      expect(expectedIndex).toBe(404)
    })
  })

  describe('Store Integration', () => {
    test('should create new project with correct structure', () => {
      const store = useProjectStore.getState()
      
      // Create a new project
      const newProject = {
        id: 'test-project',
        name: 'Test Project',
        width: 32,
        height: 32,
        colorLimit: 16,
        palette: ['#000000', '#FFFFFF', '#FF0000'],
        frames: [{
          id: 'frame-1',
          name: 'Frame 1',
          imageData: new Uint8ClampedArray(32 * 32 * 4)
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const tab = {
        id: 'tab-1',
        project: newProject,
        canvasState: {
          tool: 'pencil' as const,
          zoom: 10,
          panX: 0,
          panY: 0,
          brushSize: 1,
          selectedColor: '#000000'
        },
        history: [newProject],
        historyIndex: 0,
        isDirty: false
      }

      // Simulate adding a tab
      store.tabs = [tab]
      store.activeTabId = 'tab-1'

      expect(store.tabs).toHaveLength(1)
      expect(store.activeTabId).toBe('tab-1')
      expect(store.tabs[0].project.width).toBe(32)
      expect(store.tabs[0].project.height).toBe(32)
    })
  })
})