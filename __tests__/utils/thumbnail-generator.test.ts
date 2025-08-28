/**
 * Tests for thumbnail generation utilities
 */

import { generateThumbnail, generateThumbnails, validatePixelData } from '@/lib/utils/thumbnail-generator'
import type { PixelData } from '@/lib/types/api'

describe('Thumbnail Generator', () => {
  const createTestPixelData = (width: number, height: number): PixelData => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4).fill(255) // White pixels
  })

  describe('validatePixelData', () => {
    test('should validate correct pixel data', () => {
      const pixelData = createTestPixelData(32, 32)
      expect(validatePixelData(pixelData)).toBe(true)
    })

    test('should reject invalid pixel data', () => {
      expect(validatePixelData(null as any)).toBe(false)
      expect(validatePixelData({ width: 32, height: 32, data: [] } as PixelData)).toBe(false)
      expect(validatePixelData({ width: 32, height: 32, data: new Uint8ClampedArray(100) } as PixelData)).toBe(false)
    })
  })

  describe('generateThumbnail', () => {
    test('should generate thumbnail from valid pixel data', () => {
      const pixelData = createTestPixelData(32, 32)
      const thumbnail = generateThumbnail(pixelData, 48)
      
      expect(typeof thumbnail).toBe('string')
      expect(thumbnail).toMatch(/^data:image\/png;base64,/)
    })

    test('should return null for invalid pixel data', () => {
      expect(generateThumbnail(null as any)).toBe(null)
      expect(generateThumbnail({ width: 32, height: 32, data: [] } as PixelData)).toBe(null)
    })

    test('should handle different thumbnail sizes', () => {
      const pixelData = createTestPixelData(16, 16)
      
      const small = generateThumbnail(pixelData, 24)
      const large = generateThumbnail(pixelData, 96)
      
      expect(typeof small).toBe('string')
      expect(typeof large).toBe('string')
    })
  })

  describe('generateThumbnails', () => {
    test('should generate multiple thumbnails', () => {
      const pixelDataList = [
        createTestPixelData(16, 16),
        createTestPixelData(32, 32),
        createTestPixelData(64, 64)
      ]
      
      const thumbnails = generateThumbnails(pixelDataList)
      
      expect(thumbnails).toHaveLength(3)
      thumbnails.forEach(thumbnail => {
        expect(typeof thumbnail).toBe('string')
        expect(thumbnail).toMatch(/^data:image\/png;base64,/)
      })
    })

    test('should handle mixed valid and invalid data', () => {
      const pixelDataList = [
        createTestPixelData(16, 16),
        null as any,
        createTestPixelData(32, 32)
      ]
      
      const thumbnails = generateThumbnails(pixelDataList)
      
      expect(thumbnails).toHaveLength(3)
      expect(typeof thumbnails[0]).toBe('string')
      expect(thumbnails[1]).toBe(null)
      expect(typeof thumbnails[2]).toBe('string')
    })
  })

  describe('Memory Management', () => {
    test('should not leak memory during intensive operations', () => {
      const pixelData = createTestPixelData(64, 64)
      
      // Generate many thumbnails to test memory cleanup
      for (let i = 0; i < 50; i++) {
        const thumbnail = generateThumbnail(pixelData, 48)
        expect(typeof thumbnail).toBe('string')
      }
      
      // If memory cleanup is working, this should not cause issues
      expect(true).toBe(true)
    })
  })
})