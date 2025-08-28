/**
 * Tests for file helper utilities
 */

import { 
  downloadFile, 
  generateSafeFileName, 
  isValidDataURL, 
  extractMimeType,
  blobToDataURL 
} from '@/lib/utils/file-helpers'

// Mock DOM methods for testing
const mockCreateElement = jest.fn()
const mockAppendChild = jest.fn()
const mockRemoveChild = jest.fn()
const mockClick = jest.fn()

Object.defineProperty(document, 'createElement', { value: mockCreateElement })
Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild })
Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild })

beforeEach(() => {
  jest.clearAllMocks()
  
  mockCreateElement.mockReturnValue({
    click: mockClick,
    style: {},
    download: '',
    href: ''
  })
})

describe('File Helpers', () => {
  describe('downloadFile', () => {
    test('should create and trigger download link', () => {
      const dataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      const fileName = 'test.png'
      
      downloadFile(dataURL, fileName)
      
      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
    })
  })

  describe('generateSafeFileName', () => {
    test('should generate safe filename with timestamp', () => {
      const fileName = generateSafeFileName('My Project', 'gif')
      
      expect(fileName).toMatch(/^My_Project_\d{12}\.gif$/)
    })

    test('should replace unsafe characters', () => {
      const fileName = generateSafeFileName('My/Project:Test<>|"?*', 'png')
      
      expect(fileName).toMatch(/^My_Project_Test_______\d{12}\.png$/)
    })

    test('should handle empty project name', () => {
      const fileName = generateSafeFileName('', 'jpg')
      
      expect(fileName).toMatch(/^_\d{12}\.jpg$/)
    })
  })

  describe('isValidDataURL', () => {
    test('should validate correct data URLs', () => {
      expect(isValidDataURL('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
      expect(isValidDataURL('data:text/plain;charset=utf-8,Hello')).toBe(true)
    })

    test('should reject invalid data URLs', () => {
      expect(isValidDataURL('http://example.com/image.png')).toBe(false)
      expect(isValidDataURL('data:image/png')).toBe(false)
      expect(isValidDataURL('')).toBe(false)
      expect(isValidDataURL('invalid')).toBe(false)
    })
  })

  describe('extractMimeType', () => {
    test('should extract MIME type from data URLs', () => {
      expect(extractMimeType('data:image/png;base64,iVBORw0KGgo=')).toBe('image/png')
      expect(extractMimeType('data:text/plain;charset=utf-8,Hello')).toBe('text/plain')
      expect(extractMimeType('data:application/json;base64,e30=')).toBe('application/json')
    })

    test('should return null for invalid data URLs', () => {
      expect(extractMimeType('http://example.com')).toBe(null)
      expect(extractMimeType('data:image/png')).toBe(null)
      expect(extractMimeType('')).toBe(null)
    })
  })

  describe('blobToDataURL', () => {
    test('should convert blob to data URL', async () => {
      const mockBlob = new Blob(['test content'], { type: 'text/plain' })
      
      // Mock FileReader
      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsDataURL: jest.fn(),
        result: 'data:text/plain;base64,dGVzdCBjb250ZW50'
      }
      
      global.FileReader = jest.fn(() => mockFileReader) as any
      
      const promise = blobToDataURL(mockBlob)
      
      // Simulate successful read
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({} as any)
        }
      }, 0)
      
      const result = await promise
      expect(result).toBe('data:text/plain;base64,dGVzdCBjb250ZW50')
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockBlob)
    })

    test('should handle errors', async () => {
      const mockBlob = new Blob(['test content'], { type: 'text/plain' })
      
      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsDataURL: jest.fn(),
        result: null
      }
      
      global.FileReader = jest.fn(() => mockFileReader) as any
      
      const promise = blobToDataURL(mockBlob)
      
      // Simulate error
      setTimeout(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror(new Error('Read failed'))
        }
      }, 0)
      
      await expect(promise).rejects.toThrow('Read failed')
    })
  })
})