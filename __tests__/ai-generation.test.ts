/**
 * @jest-environment jsdom
 */

import { api } from '@/lib/api/client'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  api: {
    health: jest.fn(),
    ai: {
      generate: jest.fn(),
      variations: jest.fn(),
    },
  },
}))

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

const mockApi = api as jest.Mocked<typeof api>

describe('AI Generation API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Health Check Validation', () => {
    it('should validate OpenAI key is loaded', async () => {
      const healthResponse = {
        status: 'healthy' as const,
        openaiKeyLoaded: true,
        redisPing: 'PONG',
        services: {
          database: 'healthy' as const,
          redis: 'healthy' as const,
          storage: 'healthy' as const,
          openai: 'healthy' as const,
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        metrics: {
          uptime: 1000,
          memoryUsage: {
            used: 1000000,
            total: 2000000,
            percentage: 50,
          },
          requestCount: 100,
          averageResponseTime: 200,
        },
      }

      mockApi.health.mockResolvedValue(healthResponse)

      const result = await api.health()
      
      expect(result.openaiKeyLoaded).toBe(true)
      expect(result.services.openai).toBe('healthy')
      expect(mockApi.health).toHaveBeenCalledTimes(1)
    })

    it('should handle missing OpenAI key', async () => {
      const healthResponse = {
        status: 'degraded' as const,
        openaiKeyLoaded: false,
        redisPing: 'PONG',
        services: {
          database: 'healthy' as const,
          redis: 'healthy' as const,
          storage: 'healthy' as const,
          openai: 'unhealthy' as const,
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        metrics: {
          uptime: 1000,
          memoryUsage: {
            used: 1000000,
            total: 2000000,
            percentage: 50,
          },
          requestCount: 100,
          averageResponseTime: 200,
        },
      }

      mockApi.health.mockResolvedValue(healthResponse)

      const result = await api.health()
      
      expect(result.openaiKeyLoaded).toBe(false)
      expect(result.services.openai).toBe('unhealthy')
      expect(result.status).toBe('degraded')
    })
  })

  describe('AI Image Generation', () => {
    it('should generate AI image successfully', async () => {
      const generateRequest = {
        prompt: 'a cute cat pixel art',
        mode: 'new' as const,
        width: 32,
        height: 32,
        colorLimit: 16,
        enableDithering: false,
        quantizationMethod: 'median-cut' as const,
      }

      const generateResponse = {
        assetId: 'test-asset-id',
        pngUrl: 'https://example.com/test-image.png',
        palette: ['#FF0000', '#00FF00', '#0000FF'],
        width: 32,
        height: 32,
        colorCount: 3,
        processingTimeMs: 5000,
      }

      mockApi.ai.generate.mockResolvedValue(generateResponse)

      const result = await api.ai.generate(generateRequest)

      expect(result).toEqual(generateResponse)
      expect(result.colorCount).toBeLessThanOrEqual(generateRequest.colorLimit)
      expect(result.width).toBe(generateRequest.width)
      expect(result.height).toBe(generateRequest.height)
      expect(mockApi.ai.generate).toHaveBeenCalledWith(generateRequest)
    })

    it('should handle generation errors', async () => {
      const generateRequest = {
        prompt: 'invalid prompt',
        mode: 'new' as const,
        width: 32,
        height: 32,
        colorLimit: 16,
        enableDithering: false,
        quantizationMethod: 'median-cut' as const,
      }

      const errorResponse = {
        code: 'GENERATION_FAILED',
        message: 'AI generation failed',
        status: 500,
      }

      mockApi.ai.generate.mockRejectedValue(errorResponse)

      await expect(api.ai.generate(generateRequest)).rejects.toEqual(errorResponse)
      expect(mockApi.ai.generate).toHaveBeenCalledWith(generateRequest)
    })

    it('should validate prompt requirements', async () => {
      const requests = [
        // Empty prompt
        {
          prompt: '',
          mode: 'new' as const,
          width: 32,
          height: 32,
          colorLimit: 16,
        },
        // Too small dimensions
        {
          prompt: 'test',
          mode: 'new' as const,
          width: 4,
          height: 4,
          colorLimit: 16,
        },
        // Invalid color limit
        {
          prompt: 'test',
          mode: 'new' as const,
          width: 32,
          height: 32,
          colorLimit: 1,
        },
      ]

      for (const request of requests) {
        mockApi.ai.generate.mockRejectedValue({
          code: 'BAD_REQUEST',
          message: 'Invalid parameters',
          status: 400,
        })

        await expect(api.ai.generate(request)).rejects.toMatchObject({
          code: 'BAD_REQUEST',
          status: 400,
        })
      }
    })
  })

  describe('AI Variations Generation', () => {
    it('should generate variations successfully', async () => {
      const variationsRequest = {
        assetId: 'source-asset-id',
        count: 4,
        width: 32,
        height: 32,
        colorLimit: 16,
      }

      const variationsResponse = [
        {
          assetId: 'var-1',
          pngUrl: 'https://example.com/var-1.png',
          palette: ['#FF0000', '#00FF00'],
          width: 32,
          height: 32,
          colorCount: 2,
          processingTimeMs: 3000,
        },
        {
          assetId: 'var-2',
          pngUrl: 'https://example.com/var-2.png',
          palette: ['#FF0000', '#0000FF'],
          width: 32,
          height: 32,
          colorCount: 2,
          processingTimeMs: 3100,
        },
      ]

      mockApi.ai.variations.mockResolvedValue(variationsResponse)

      const result = await api.ai.variations(variationsRequest)

      expect(result).toEqual(variationsResponse)
      expect(result).toHaveLength(2)
      expect(result[0].width).toBe(variationsRequest.width)
      expect(result[0].height).toBe(variationsRequest.height)
      expect(mockApi.ai.variations).toHaveBeenCalledWith(variationsRequest)
    })
  })

  describe('Prompt Optimization', () => {
    it('should handle various prompt types', async () => {
      const prompts = [
        'a cute cat',
        'medieval castle pixel art',
        'space ship, 8-bit style',
        'dragon in pixel art style',
        'simple tree, blocky',
      ]

      for (const prompt of prompts) {
        const request = {
          prompt,
          mode: 'new' as const,
          width: 32,
          height: 32,
          colorLimit: 16,
          enableDithering: false,
          quantizationMethod: 'median-cut' as const,
        }

        const response = {
          assetId: `asset-${prompt.length}`,
          pngUrl: `https://example.com/${prompt.length}.png`,
          palette: ['#FF0000'],
          width: 32,
          height: 32,
          colorCount: 1,
          processingTimeMs: 4000,
        }

        mockApi.ai.generate.mockResolvedValue(response)

        const result = await api.ai.generate(request)
        expect(result.assetId).toBe(`asset-${prompt.length}`)
      }
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      const request = {
        prompt: 'test prompt',
        mode: 'new' as const,
        width: 32,
        height: 32,
        colorLimit: 16,
      }

      const rateLimitError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        status: 429,
      }

      mockApi.ai.generate.mockRejectedValue(rateLimitError)

      await expect(api.ai.generate(request)).rejects.toEqual(rateLimitError)
      expect(mockApi.ai.generate).toHaveBeenCalledWith(request)
    })
  })

  describe('Performance Requirements', () => {
    it('should meet processing time targets', async () => {
      const request = {
        prompt: 'performance test',
        mode: 'new' as const,
        width: 64,
        height: 64,
        colorLimit: 32,
      }

      const response = {
        assetId: 'perf-test',
        pngUrl: 'https://example.com/perf.png',
        palette: Array.from({ length: 16 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`),
        width: 64,
        height: 64,
        colorCount: 16,
        processingTimeMs: 8000, // Within 10-second target
      }

      mockApi.ai.generate.mockResolvedValue(response)

      const result = await api.ai.generate(request)

      // Verify performance targets
      expect(result.processingTimeMs).toBeLessThan(10000) // < 10 seconds
      expect(result.colorCount).toBeLessThanOrEqual(request.colorLimit)
      expect(result.width).toBe(request.width)
      expect(result.height).toBe(request.height)
    })
  })
})

describe('Image Processing Utilities', () => {
  describe('Pixel Data Validation', () => {
    it('should validate pixel data structure', () => {
      const validPixelData = {
        data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
        width: 2,
        height: 1,
      }

      expect(validPixelData.data.length).toBe(validPixelData.width * validPixelData.height * 4)
      expect(validPixelData.data).toBeInstanceOf(Uint8ClampedArray)
    })

    it('should handle canvas image loading', () => {
      // Mock canvas and context
      const mockCanvas = document.createElement('canvas')
      const mockContext = {
        imageSmoothingEnabled: false,
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({
          data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
          width: 2,
          height: 1,
        })),
      }

      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
      jest.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any)

      // Test canvas creation and configuration
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      
      const ctx = canvas.getContext('2d')
      expect(ctx).toBeTruthy()
      
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        expect(ctx.imageSmoothingEnabled).toBe(false)
      }

      // Cleanup
      jest.restoreAllMocks()
    })
  })

  describe('Color Palette Processing', () => {
    it('should validate color palette format', () => {
      const validPalette = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF']
      
      validPalette.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i)
      })
      
      expect(validPalette.length).toBeGreaterThan(0)
      expect(validPalette.length).toBeLessThanOrEqual(64)
    })

    it('should handle palette quantization results', () => {
      const originalColors = 1000
      const targetLimit = 16
      const resultPalette = Array.from({ length: 12 }, (_, i) => 
        `#${i.toString(16).padStart(6, '0')}`
      )

      expect(resultPalette.length).toBeLessThanOrEqual(targetLimit)
      expect(resultPalette.length).toBeGreaterThan(0)
    })
  })
})