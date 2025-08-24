'use client'

import { Frame } from '@/lib/types/api'
import { getVideoFrameLimit, getGifFrameLimit } from '@/lib/types/user'
import { decompressFrames, parseGIF } from 'gifuct-js'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { FastVideoProcessor } from './fast-video-processor'

export type ScalingMode = 'fit' | 'fill' | 'original' | 'smart'

// Extended scaling modes for small-to-large scenarios
export type ExtendedScalingMode = ScalingMode | 'fit-upscale' | 'smart-upscale' | 'original-center'

export type SizeRelationship = 'small-to-large' | 'large-to-small' | 'similar-size'

export interface SizeAnalysis {
  relationship: SizeRelationship
  scaleFactorX: number
  scaleFactorY: number
  optimalIntegerScale?: number // 2, 3, 4, etc.
  recommendation: ExtendedScalingMode
  reasons: string[]
  isUpscalingBeneficial: boolean
}

export interface ScalingModeConfig {
  mode: ExtendedScalingMode
  displayName: string
  description: string
  color: 'blue' | 'orange' | 'green' | 'purple' | 'teal' | 'pink'
  isUpscaling?: boolean
  integerScale?: number
  recommendation?: boolean
}

export interface MediaImportOptions {
  width: number
  height: number
  colorCount?: number
  maxFrames?: number
  scalingMode?: ScalingMode | ExtendedScalingMode
}

/**
 * Analyze the size relationship between original and target dimensions
 * to provide intelligent scaling recommendations
 */
export function analyzeSizeRelationship(
  original: { width: number; height: number },
  target: { width: number; height: number }
): SizeAnalysis {
  const scaleFactorX = target.width / original.width
  const scaleFactorY = target.height / original.height
  const minScale = Math.min(scaleFactorX, scaleFactorY)
  const maxScale = Math.max(scaleFactorX, scaleFactorY)
  
  // Determine size relationship
  let relationship: SizeRelationship
  if (minScale >= 2) {
    relationship = 'small-to-large'
  } else if (maxScale < 0.8) {
    relationship = 'large-to-small'
  } else {
    relationship = 'similar-size'
  }
  
  // Find optimal integer scale for pixel art
  let optimalIntegerScale: number | undefined
  if (relationship === 'small-to-large') {
    const possibleScales = [2, 3, 4, 5, 6, 8, 10]
    for (const scale of possibleScales) {
      const scaledWidth = original.width * scale
      const scaledHeight = original.height * scale
      
      if (scaledWidth <= target.width && scaledHeight <= target.height) {
        optimalIntegerScale = scale
      } else {
        break
      }
    }
  }
  
  // Generate recommendation and reasons
  let recommendation: ExtendedScalingMode
  const reasons: string[] = []
  let isUpscalingBeneficial = false
  
  if (relationship === 'small-to-large') {
    isUpscalingBeneficial = true
    
    if (optimalIntegerScale && optimalIntegerScale >= 2) {
      recommendation = 'smart-upscale'
      reasons.push(`Perfect ${optimalIntegerScale}× scaling available`)
      reasons.push('Maintains pixel-perfect quality')
    } else {
      recommendation = 'fit-upscale'
      reasons.push('Proportional upscaling recommended')
    }
    
    if (minScale >= 4) {
      reasons.push('Large size difference detected')
    }
  } else if (relationship === 'large-to-small') {
    recommendation = 'fit'
    reasons.push('Downscaling to preserve details')
  } else {
    recommendation = 'original'
    reasons.push('Similar sizes - keep original')
  }
  
  return {
    relationship,
    scaleFactorX,
    scaleFactorY,
    optimalIntegerScale,
    recommendation,
    reasons,
    isUpscalingBeneficial
  }
}

/**
 * Get available scaling modes based on size analysis
 */
export function getAvailableScalingModes(analysis: SizeAnalysis): ScalingModeConfig[] {
  const baseModes: ScalingModeConfig[] = [
    {
      mode: 'fit',
      displayName: 'Fit',
      description: 'Scale proportionally to fit canvas',
      color: 'blue'
    },
    {
      mode: 'fill', 
      displayName: 'Fill',
      description: 'Fill entire canvas, may crop edges',
      color: 'orange'
    },
    {
      mode: 'original',
      displayName: 'Original Size',
      description: 'Keep original size, center if smaller',
      color: 'green'
    },
    {
      mode: 'smart',
      displayName: 'Smart Scale',
      description: 'Integer scaling when possible',
      color: 'purple'
    }
  ]
  
  // Add extended modes for small-to-large scenarios
  if (analysis.relationship === 'small-to-large') {
    const extendedModes: ScalingModeConfig[] = [
      {
        mode: 'fit-upscale',
        displayName: 'Fit Upscale',
        description: 'Scale up proportionally to fit canvas',
        color: 'teal',
        isUpscaling: true,
        recommendation: analysis.recommendation === 'fit-upscale'
      },
      {
        mode: 'smart-upscale',
        displayName: analysis.optimalIntegerScale ? 
          `Smart ${analysis.optimalIntegerScale}× Upscale` : 
          'Smart Upscale',
        description: analysis.optimalIntegerScale ?
          `Perfect ${analysis.optimalIntegerScale}× integer scaling for crisp pixels` :
          'Intelligent upscaling for pixel art',
        color: 'pink',
        isUpscaling: true,
        integerScale: analysis.optimalIntegerScale,
        recommendation: analysis.recommendation === 'smart-upscale'
      },
      {
        mode: 'original-center',
        displayName: 'Original (Centered)',
        description: 'Keep original size, center on canvas',
        color: 'green',
        isUpscaling: false
      }
    ]
    
    return [...extendedModes, ...baseModes]
  }
  
  return baseModes
}

export interface ImportResult {
  frames: { frame: Frame; imageData: number[] }[]
  originalDimensions: { width: number; height: number }
  mediaType: 'image' | 'gif' | 'video'
  totalFrames: number
  avgFrameDelay: number
}

export interface ProgressCallback {
  (progress: number, message: string): void
}

export class EnhancedMediaImporter {
  private static canvas: HTMLCanvasElement | null = null
  private static ctx: CanvasRenderingContext2D | null = null
  private static ffmpeg: FFmpeg | null = null

  private static getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.canvas || !this.ctx) {
      this.canvas = document.createElement('canvas')
      const ctx = this.canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get 2D canvas context - browser may not support canvas')
      }
      this.ctx = ctx
      // Optimize for pixel art
      this.ctx.imageSmoothingEnabled = false
    }
    return { canvas: this.canvas, ctx: this.ctx }
  }

  /**
   * Clean up static canvas to prevent memory leaks
   */
  private static cleanupCanvas(): void {
    if (this.canvas && this.ctx) {
      // Clear the canvas content
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      // Reset canvas size to minimum to free memory
      this.canvas.width = 1
      this.canvas.height = 1
      // Keep references for reuse (don't null them out)
    }
  }

  /**
   * Create temporary canvas for one-time use
   */
  private static createTempCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context for temporary canvas')
    }
    
    // Validate canvas dimensions (browser limits)
    const maxSize = 32768 // Most browsers support up to ~32k pixels
    if (width > maxSize || height > maxSize) {
      throw new Error(`Canvas dimensions too large: ${width}x${height}. Maximum: ${maxSize}x${maxSize}`)
    }
    
    canvas.width = width
    canvas.height = height
    ctx.imageSmoothingEnabled = false
    
    return { canvas, ctx }
  }

  /**
   * Cleanup temporary canvas
   */
  private static cleanupTempCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 1
    canvas.height = 1
  }

  /**
   * Initialize FFmpeg instance (lazy loading)
   */
  private static async initFFmpeg(): Promise<FFmpeg> {
    if (!this.ffmpeg) {
      this.ffmpeg = new FFmpeg()
      
      // Load FFmpeg with optimized WASM
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
    }
    return this.ffmpeg
  }

  /**
   * Import media from URL with full multi-frame support
   */
  static async importFromUrl(
    url: string, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      onProgress?.(0, 'Validating URL...')
      
      // Validate URL
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported')
      }

      // Determine media type from URL
      const mediaType = this.detectMediaType(url)
      onProgress?.(10, `Detected ${mediaType} format`)
      
      switch (mediaType) {
        case 'gif':
          return await this.processGifFromUrl(url, options, onProgress)
        case 'video':
          return await this.processVideoFromUrl(url, options, onProgress)
        case 'image':
        default:
          return await this.processImageFromUrl(url, options, onProgress)
      }
    } catch (error) {
      console.error('Enhanced media import failed:', error)
      throw new Error(`Failed to import media: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Import media from local file with full multi-frame support
   */
  static async importFromFile(
    file: File, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      onProgress?.(0, 'Validating file...')
      
      // Validate file
      this.validateFile(file)

      // Determine media type from file
      const mediaType = this.detectMediaTypeFromFile(file)
      onProgress?.(10, `Processing ${mediaType} file`)
      
      // ENHANCED: Add safety checks for target dimensions
      if (options.width <= 0 || options.height <= 0) {
        throw new Error(`Invalid target dimensions: ${options.width}x${options.height}`)
      }
      
      if (options.width > 512 || options.height > 512) {
        console.warn(`Large target dimensions detected: ${options.width}x${options.height}`)
      }
      
      switch (mediaType) {
        case 'gif':
          return await this.processGifFromFile(file, options, onProgress)
        case 'video':
          return await this.processVideoFromFile(file, options, onProgress)
        case 'image':
        default:
          return await this.processImageFromFile(file, options, onProgress)
      }
    } catch (error) {
      console.error('Enhanced file import failed:', error)
      throw new Error(`Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process animated GIF with proper frame extraction
   */
  private static async processGifFromUrl(
    url: string, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(20, 'Fetching GIF data...')
    
    const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`
    const response = await fetch(proxyUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GIF: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    
    try {
      return await this.processGifData(arrayBuffer, options, onProgress)
    } catch (gifProcessingError) {
      console.warn('Primary GIF processing failed for URL, attempting canvas-based fallback...', gifProcessingError)
      
      // FALLBACK: Canvas-based GIF processing for URL
      onProgress?.(50, 'Primary processing failed, trying fallback method...')
      return await this.processGifFromUrlWithCanvasFallback(url, options, onProgress)
    }
  }

  /**
   * Fallback canvas-based GIF processing for URLs when gifuct-js fails
   */
  private static async processGifFromUrlWithCanvasFallback(
    url: string,
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(60, 'Using canvas-based fallback for URL...')
    
    const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = async () => {
        try {
          console.log('Canvas fallback for URL: GIF loaded as image, extracting first frame only')
          
          const pixelatedImageData = await this.pixelateImage(img, options)
          
          const frame: Frame = {
            id: `gif_url_fallback_frame_${Date.now()}`,
            projectId: '',
            index: 0,
            delayMs: 500,
            included: true,
            layers: [],
            flattenedPngUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          onProgress?.(100, 'URL fallback processing complete (single frame extracted)')

          resolve({
            frames: [{ frame, imageData: Array.from(pixelatedImageData.data) }],
            originalDimensions: { width: img.width, height: img.height },
            mediaType: 'gif',
            totalFrames: 1,
            avgFrameDelay: 500
          })
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Canvas fallback failed: Could not load GIF from URL'))
      }
      
      img.src = proxyUrl
    })
  }

  /**
   * Process animated GIF from local file - ENHANCED WITH VALIDATION AND FALLBACK
   */
  private static async processGifFromFile(
    file: File, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(20, 'Reading GIF file...')
    
    // Additional GIF file validation
    if (file.size > 10 * 1024 * 1024) { // 10MB limit for GIFs
      throw new Error(`GIF file too large: ${Math.round(file.size / (1024 * 1024))}MB. Maximum: 10MB`)
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      
      // Validate ArrayBuffer
      if (arrayBuffer.byteLength === 0) {
        throw new Error('GIF file is empty')
      }
      
      if (arrayBuffer.byteLength < 6) {
        throw new Error('Invalid GIF file: Too small to contain GIF header')
      }
      
      // Check GIF header signature
      const headerBytes = new Uint8Array(arrayBuffer.slice(0, 6))
      const headerString = String.fromCharCode.apply(null, Array.from(headerBytes))
      if (!headerString.startsWith('GIF87a') && !headerString.startsWith('GIF89a')) {
        throw new Error('Invalid GIF file: Missing GIF header signature')
      }
      
      try {
        return await this.processGifData(arrayBuffer, options, onProgress)
      } catch (gifProcessingError) {
        console.warn('Primary GIF processing failed, attempting canvas-based fallback...', gifProcessingError)
        
        // FALLBACK: Canvas-based GIF processing
        onProgress?.(50, 'Primary processing failed, trying fallback method...')
        return await this.processGifWithCanvasFallback(file, options, onProgress)
      }
    } catch (error) {
      console.error('GIF file processing failed:', error)
      throw new Error(`Failed to process GIF file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fallback canvas-based GIF processing when gifuct-js fails
   */
  private static async processGifWithCanvasFallback(
    file: File,
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(60, 'Using canvas-based fallback processing...')
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = async () => {
        try {
          console.log('Canvas fallback: GIF loaded as image, extracting first frame only')
          
          // Since canvas can only extract the first frame of a GIF,
          // we treat it as a single-frame image
          const pixelatedImageData = await this.pixelateImage(img, options)
          
          const frame: Frame = {
            id: `gif_fallback_frame_${Date.now()}`,
            projectId: '',
            index: 0,
            delayMs: 500, // Default delay
            included: true,
            layers: [],
            flattenedPngUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          onProgress?.(100, 'Fallback processing complete (single frame extracted)')

          resolve({
            frames: [{ frame, imageData: Array.from(pixelatedImageData.data) }],
            originalDimensions: { width: img.width, height: img.height },
            mediaType: 'gif',
            totalFrames: 1, // Only first frame available with this method
            avgFrameDelay: 500
          })
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Canvas fallback failed: Could not load GIF as image'))
      }
      
      // Convert file to data URL for image loading
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = () => {
        reject(new Error('Failed to read GIF file for canvas fallback'))
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * Core GIF processing logic with frame extraction - ENHANCED WITH COMPREHENSIVE ERROR RECOVERY
   */
  private static async processGifData(
    arrayBuffer: ArrayBuffer,
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(30, 'Parsing GIF frames...')

    // Parse GIF using gifuct-js with enhanced error handling
    let gif: any
    let frames: any[]
    
    try {
      gif = parseGIF(arrayBuffer)
    } catch (parseError) {
      console.error('GIF parsing failed:', parseError)
      throw new Error(`Invalid GIF format: Unable to parse GIF structure. ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`)
    }
    
    // Validate GIF structure
    if (!gif || !gif.lsd) {
      throw new Error('Invalid GIF format: Missing logical screen descriptor')
    }
    
    if (gif.lsd.width <= 0 || gif.lsd.height <= 0) {
      throw new Error(`Invalid GIF dimensions: ${gif.lsd.width}x${gif.lsd.height}`)
    }
    
    if (gif.lsd.width > 4096 || gif.lsd.height > 4096) {
      throw new Error(`GIF too large: ${gif.lsd.width}x${gif.lsd.height}. Maximum: 4096x4096`)
    }
    
    try {
      frames = decompressFrames(gif, true)
    } catch (decompressError) {
      console.error('GIF decompression failed:', decompressError)
      throw new Error(`Failed to decompress GIF frames: ${decompressError instanceof Error ? decompressError.message : 'Unknown decompression error'}`)
    }
    
    if (!frames || frames.length === 0) {
      throw new Error('No frames found in GIF')
    }
    
    console.log(`GIF Analysis: ${gif.lsd.width}x${gif.lsd.height}, ${frames.length} frames`)

    onProgress?.(40, `Found ${frames.length} frames, processing...`)

    // Limit frames based on user tier
    const tierFrameLimit = getGifFrameLimit()
    const maxFrames = Math.min(options.maxFrames || tierFrameLimit, tierFrameLimit)
    const framesToProcess = frames.slice(0, maxFrames)
    
    const processedFrames: { frame: Frame; imageData: number[] }[] = []
    const { canvas, ctx } = this.getCanvas()
    
    // Set canvas to GIF dimensions for processing
    const gifWidth = gif.lsd.width
    const gifHeight = gif.lsd.height
    canvas.width = gifWidth
    canvas.height = gifHeight
    
    let totalDelay = 0
    let skippedFrames = 0
    let recoveredFrames = 0
    
    // Initialize canvas with transparent background and maintain frame history for recovery
    ctx.clearRect(0, 0, gifWidth, gifHeight)
    let previousFrameImageData: ImageData | null = null

    for (let i = 0; i < framesToProcess.length; i++) {
      const gifFrame = framesToProcess[i]
      if (!gifFrame) {
        skippedFrames++
        continue
      }
      
      const progress = 40 + ((i / framesToProcess.length) * 50)
      onProgress?.(progress, `Processing frame ${i + 1}/${framesToProcess.length} (${skippedFrames} skipped)`)

      try {
        // ENHANCED FRAME VALIDATION: Comprehensive frame data validation with recovery
        if (!gifFrame.dims || typeof gifFrame.dims.width !== 'number' || typeof gifFrame.dims.height !== 'number') {
          console.warn(`Frame ${i + 1}: Invalid frame dimensions structure, attempting recovery...`)
          
          // RECOVERY STRATEGY 1: Use default frame dimensions
          gifFrame.dims = {
            width: gifWidth,
            height: gifHeight,
            left: 0,
            top: 0
          }
          recoveredFrames++
        }
        
        if (gifFrame.dims.width <= 0 || gifFrame.dims.height <= 0) {
          console.warn(`Frame ${i + 1}: Invalid dimensions: ${gifFrame.dims.width}x${gifFrame.dims.height}, using full GIF size`)
          gifFrame.dims.width = gifWidth
          gifFrame.dims.height = gifHeight
          recoveredFrames++
        }
        
        if (gifFrame.dims.left < 0 || gifFrame.dims.top < 0) {
          console.warn(`Frame ${i + 1}: Negative frame offset: ${gifFrame.dims.left},${gifFrame.dims.top}, normalizing...`)
          gifFrame.dims.left = Math.max(0, gifFrame.dims.left)
          gifFrame.dims.top = Math.max(0, gifFrame.dims.top)
        }
        
        // Check frame boundaries and adjust if necessary
        if (gifFrame.dims.left + gifFrame.dims.width > gifWidth ||
            gifFrame.dims.top + gifFrame.dims.height > gifHeight) {
          console.warn(`Frame ${i + 1}: Frame exceeds GIF boundaries, adjusting...`)
          gifFrame.dims.width = Math.min(gifFrame.dims.width, gifWidth - gifFrame.dims.left)
          gifFrame.dims.height = Math.min(gifFrame.dims.height, gifHeight - gifFrame.dims.top)
        }
        
        // CRITICAL FIX: Enhanced pixel data validation with multiple recovery strategies
        if (!gifFrame.pixels || !(gifFrame.pixels instanceof Uint8ClampedArray)) {
          console.warn(`Frame ${i + 1}: Missing or invalid pixel data, attempting recovery...`)
          
          let recoveredPixels: Uint8ClampedArray | null = null
          
          // RECOVERY STRATEGY 1: Use imageData or patch if available
          if (gifFrame.imageData && gifFrame.imageData instanceof Uint8ClampedArray) {
            console.log(`Frame ${i + 1}: Using imageData as pixel source`)
            recoveredPixels = gifFrame.imageData
          } else if (gifFrame.patch && gifFrame.patch instanceof Uint8ClampedArray) {
            console.log(`Frame ${i + 1}: Using patch as pixel source`)
            recoveredPixels = gifFrame.patch
          }
          
          // RECOVERY STRATEGY 2: Use previous frame data if available
          if (!recoveredPixels && previousFrameImageData) {
            console.log(`Frame ${i + 1}: Creating frame from previous frame data`)
            const expectedSize = gifFrame.dims.width * gifFrame.dims.height * 4
            recoveredPixels = new Uint8ClampedArray(expectedSize)
            
            // Extract relevant portion from previous frame
            for (let y = 0; y < gifFrame.dims.height; y++) {
              for (let x = 0; x < gifFrame.dims.width; x++) {
                const srcX = Math.min(gifFrame.dims.left + x, gifWidth - 1)
                const srcY = Math.min(gifFrame.dims.top + y, gifHeight - 1)
                const srcIndex = (srcY * gifWidth + srcX) * 4
                const dstIndex = (y * gifFrame.dims.width + x) * 4
                
                if (srcIndex < previousFrameImageData.data.length - 3 && dstIndex < recoveredPixels.length - 3) {
                  recoveredPixels[dstIndex] = previousFrameImageData.data[srcIndex] || 0
                  recoveredPixels[dstIndex + 1] = previousFrameImageData.data[srcIndex + 1] || 0
                  recoveredPixels[dstIndex + 2] = previousFrameImageData.data[srcIndex + 2] || 0
                  recoveredPixels[dstIndex + 3] = previousFrameImageData.data[srcIndex + 3] || 0
                }
              }
            }
          }
          
          // RECOVERY STRATEGY 3: Create transparent frame if no data available
          if (!recoveredPixels) {
            console.log(`Frame ${i + 1}: Creating transparent frame as fallback`)
            const expectedSize = gifFrame.dims.width * gifFrame.dims.height * 4
            recoveredPixels = new Uint8ClampedArray(expectedSize)
            
            // Fill with transparent pixels (RGBA: 0,0,0,0)
            for (let j = 0; j < expectedSize; j += 4) {
              recoveredPixels[j] = 0     // R
              recoveredPixels[j + 1] = 0 // G
              recoveredPixels[j + 2] = 0 // B
              recoveredPixels[j + 3] = 0 // A (transparent)
            }
          }
          
          if (recoveredPixels) {
            gifFrame.pixels = recoveredPixels
            recoveredFrames++
            console.log(`Frame ${i + 1}: Successfully recovered pixel data (${recoveredPixels.length} bytes)`)
          } else {
            throw new Error(`Frame ${i + 1}: Failed all recovery attempts for pixel data`)
          }
        }
        
        // CRITICAL FIX: Validate frame data before ImageData creation
        const expectedPixelCount = gifFrame.dims.width * gifFrame.dims.height
        const expectedDataLength = expectedPixelCount * 4 // RGBA
        const actualDataLength = gifFrame.pixels.length

        if (actualDataLength !== expectedDataLength) {
          console.warn(`Frame ${i + 1}: Data length mismatch. Expected: ${expectedDataLength}, Got: ${actualDataLength}`)
          
          // Advanced data correction strategies
          if (actualDataLength < expectedDataLength) {
            // Pad with transparent pixels if data is too short
            const paddedPixels = new Uint8ClampedArray(expectedDataLength)
            
            // Copy existing data
            paddedPixels.set(gifFrame.pixels.slice(0, Math.min(actualDataLength, expectedDataLength)))
            
            // Fill remaining pixels with transparent
            for (let j = actualDataLength; j < expectedDataLength; j += 4) {
              paddedPixels[j] = 0     // R
              paddedPixels[j + 1] = 0 // G 
              paddedPixels[j + 2] = 0 // B
              paddedPixels[j + 3] = 0 // A (transparent)
            }
            gifFrame.pixels = paddedPixels
            
          } else if (actualDataLength > expectedDataLength) {
            // Truncate if data is too long
            gifFrame.pixels = gifFrame.pixels.slice(0, expectedDataLength)
            
          } else if (actualDataLength % 4 !== 0) {
            // Handle non-RGBA aligned data
            const alignedLength = Math.floor(actualDataLength / 4) * 4
            console.warn(`Frame ${i + 1}: Non-RGBA aligned data, truncating to ${alignedLength} bytes`)
            gifFrame.pixels = gifFrame.pixels.slice(0, alignedLength)
          }
        }
        
        // Final validation of corrected data
        if (gifFrame.pixels.length !== expectedDataLength) {
          throw new Error(`Frame ${i + 1}: Failed to correct pixel data length after validation`)
        }

        // Create ImageData from validated GIF frame pixels
        const frameImageData = new ImageData(
          new Uint8ClampedArray(gifFrame.pixels), 
          gifFrame.dims.width, 
          gifFrame.dims.height
        )
        
        // FIXED: Process each frame independently to avoid cross-frame contamination
        // Create a separate temporary canvas for individual frame processing
        const { canvas: frameCanvas, ctx: frameCtx } = this.createTempCanvas(gifWidth, gifHeight)
        
        // Place ONLY this frame's data on the clean canvas
        frameCtx.putImageData(frameImageData, gifFrame.dims.left, gifFrame.dims.top)
        
        // Create image from the clean frame canvas
        const tempImg = new Image()
        await new Promise<void>((resolve, reject) => {
          tempImg.onload = () => resolve()
          tempImg.onerror = () => reject(new Error(`Failed to process frame ${i + 1}`))
          tempImg.src = frameCanvas.toDataURL()
        })

        // Pixelate this individual frame with consistent sizing
        const pixelatedImageData = await this.pixelateImage(tempImg, options)
        
        console.log(`Frame ${i + 1} processing: ${gifFrame.dims.width}x${gifFrame.dims.height} -> ${options.width}x${options.height}`)
        
        // Clean up temporary canvas immediately after processing
        this.cleanupTempCanvas(frameCanvas, frameCtx)
        
        // OPTIONAL: Still maintain the main canvas for disposal method tracking (for reference)
        // This helps with debugging but doesn't affect the final output
        if (i === 0 || gifFrame.disposal === 2) {
          ctx.clearRect(0, 0, gifWidth, gifHeight)
        } else if (gifFrame.disposal === 3) {
          console.warn(`Frame ${i + 1}: Disposal method 3 not fully supported`)
        }
        ctx.putImageData(frameImageData, gifFrame.dims.left, gifFrame.dims.top)
        
        // Calculate frame delay (convert centiseconds to milliseconds)
        const frameDelay = Math.max(50, (gifFrame.delay || 10) * 10) // Minimum 50ms
        totalDelay += frameDelay

        // Create frame object
        const frame: Frame = {
          id: `gif_frame_${i}_${Date.now()}`,
          projectId: '',
          index: i,
          delayMs: frameDelay,
          included: true,
          layers: [],
          flattenedPngUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        processedFrames.push({
          frame,
          imageData: Array.from(pixelatedImageData.data)
        })

        // Store current frame for potential use in recovery of next frame
        const currentFrameImageData = ctx.getImageData(0, 0, gifWidth, gifHeight)
        previousFrameImageData = currentFrameImageData
        
      } catch (frameError) {
        console.error(`Failed to process frame ${i + 1}:`, frameError)
        skippedFrames++
        
        // ENHANCED ERROR RECOVERY: Try alternative processing methods
        try {
          console.log(`Frame ${i + 1}: Attempting alternative processing...`)
          
          // Alternative 1: Create a duplicate of the previous frame if available
          if (processedFrames.length > 0) {
            const lastProcessedFrame = processedFrames[processedFrames.length - 1]
            if (lastProcessedFrame) {
              const duplicateFrame: Frame = {
                id: `gif_frame_recovery_${i}_${Date.now()}`,
                projectId: '',
                index: i,
                delayMs: Math.max(50, (gifFrame?.delay || 10) * 10),
                included: true,
                layers: [],
                flattenedPngUrl: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
              
              processedFrames.push({
                frame: duplicateFrame,
                imageData: [...lastProcessedFrame.imageData] // Clone the array
              })
              
              console.log(`Frame ${i + 1}: Successfully created duplicate frame for recovery`)
              recoveredFrames++
            }
          } else {
            console.log(`Frame ${i + 1}: No previous frame available for duplication, skipping...`)
          }
        } catch (recoveryError) {
          console.error(`Frame ${i + 1}: Recovery attempt also failed:`, recoveryError)
        }
        
        onProgress?.(progress, `Skipped frame ${i + 1}/${framesToProcess.length} (${skippedFrames} total skipped)`)
        continue
      }
    }

    if (processedFrames.length === 0) {
      throw new Error('No frames could be successfully processed from GIF. The GIF may be severely corrupted.')
    }

    const finalMessage = [
      `Successfully processed ${processedFrames.length} frames`,
      skippedFrames > 0 ? `(${skippedFrames} skipped)` : '',
      recoveredFrames > 0 ? `(${recoveredFrames} recovered)` : ''
    ].filter(Boolean).join(' ')
    
    onProgress?.(100, finalMessage)
    
    // Log final statistics
    console.log(`GIF Import Complete:`, {
      originalFrames: framesToProcess.length,
      processedFrames: processedFrames.length,
      skippedFrames,
      recoveredFrames,
      successRate: `${Math.round((processedFrames.length / framesToProcess.length) * 100)}%`
    })

    // Clean up static canvas after processing
    this.cleanupCanvas()

    return {
      frames: processedFrames,
      originalDimensions: { width: gifWidth, height: gifHeight },
      mediaType: 'gif',
      totalFrames: processedFrames.length,
      avgFrameDelay: Math.round(totalDelay / processedFrames.length)
    }
  }

  /**
   * Enhanced video processing with fast loading optimizations
   */
  private static async processVideoFromUrl(
    url: string, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(10, 'Initializing fast video processor...')
    
    try {
      // Try fast video processing first (HTML5 + Range loading)
      console.log('🚀 Using FastVideoProcessor for optimized video loading')
      
      const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`
      return await FastVideoProcessor.processVideoFast(proxyUrl, options, onProgress)
      
    } catch (fastError) {
      console.warn('⚠️ Fast video processing failed, falling back to FFmpeg:', fastError)
      onProgress?.(20, 'Fast processing failed, using FFmpeg fallback...')
      
      // Fallback to original FFmpeg method
      const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return await this.processVideoDataWithFFmpeg(arrayBuffer, 'video.mp4', options, onProgress)
    }
  }

  /**
   * Enhanced video processing from local file with fast extraction
   */
  private static async processVideoFromFile(
    file: File, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(10, 'Starting fast video file processing...')
    
    try {
      // Try fast video processing first (HTML5 native)
      console.log(`🚀 Processing video file: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB) with FastVideoProcessor`)
      
      return await FastVideoProcessor.processVideoFast(file, options, onProgress)
      
    } catch (fastError) {
      console.warn('⚠️ Fast video file processing failed, falling back to FFmpeg:', fastError)
      onProgress?.(20, 'Fast processing failed, using FFmpeg fallback...')
      
      // Fallback to original FFmpeg method
      const arrayBuffer = await file.arrayBuffer()
      return await this.processVideoDataWithFFmpeg(arrayBuffer, file.name, options, onProgress)
    }
  }

  /**
   * Legacy FFmpeg-based video processing (fallback method)
   */
  private static async processVideoDataWithFFmpeg(
    arrayBuffer: ArrayBuffer,
    filename: string,
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(30, 'Initializing video processor...')

    // Initialize FFmpeg
    const ffmpeg = await this.initFFmpeg()
    
    onProgress?.(40, 'Extracting video frames...')

    // Write input file
    await ffmpeg.writeFile(filename, new Uint8Array(arrayBuffer))
    
    // Extract frames based on user tier limits
    const tierFrameLimit = getVideoFrameLimit()
    const maxFrames = Math.min(options.maxFrames || tierFrameLimit, tierFrameLimit)
    const frameRate = Math.min(maxFrames, 10) // Max 10 FPS for processing efficiency
    
    await ffmpeg.exec([
      '-i', filename,
      '-t', '1', // Limit to 1 second
      '-r', frameRate.toString(), // Frame rate
      '-vf', 'scale=320:240', // Scale down for processing
      '-f', 'image2',
      'frame_%03d.png'
    ])

    onProgress?.(60, 'Processing extracted frames...')

    const processedFrames: { frame: Frame; imageData: number[] }[] = []
    let originalWidth = 320
    let originalHeight = 240

    // Read extracted frames
    for (let i = 1; i <= maxFrames; i++) {
      const frameFilename = `frame_${i.toString().padStart(3, '0')}.png`
      
      try {
        const frameData = await ffmpeg.readFile(frameFilename)
        
        if (frameData && frameData instanceof Uint8Array) {
          const progress = 60 + ((i / maxFrames) * 35)
          onProgress?.(progress, `Processing frame ${i}/${maxFrames}`)

          // Create blob and image from frame data
          const blob = new Blob([new Uint8Array(frameData)], { type: 'image/png' })
          const imageUrl = URL.createObjectURL(blob)
          
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              if (i === 1) {
                originalWidth = img.width
                originalHeight = img.height
              }
              resolve()
            }
            img.onerror = () => reject(new Error(`Failed to load frame ${i}`))
            img.src = imageUrl
          })

          // Pixelate the frame
          const pixelatedImageData = await this.pixelateImage(img, options)
          
          // Calculate frame delay (100ms per frame for 10 FPS)
          const frameDelay = 1000 / frameRate

          // Create frame object
          const frame: Frame = {
            id: `video_frame_${i}_${Date.now()}`,
            projectId: '',
            index: i - 1,
            delayMs: frameDelay,
            included: true,
            layers: [],
            flattenedPngUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          processedFrames.push({
            frame,
            imageData: Array.from(pixelatedImageData.data)
          })

          // Clean up
          URL.revokeObjectURL(imageUrl)
        }
      } catch (error) {
        // Frame doesn't exist (video is shorter than expected)
        console.log(`Frame ${i} not found, stopping extraction`)
        break
      }
    }

    // Clean up FFmpeg files
    try {
      await ffmpeg.deleteFile(filename)
      for (let i = 1; i <= maxFrames; i++) {
        const frameFilename = `frame_${i.toString().padStart(3, '0')}.png`
        await ffmpeg.deleteFile(frameFilename).catch(() => {}) // Ignore errors
      }
    } catch (error) {
      console.warn('Failed to clean up FFmpeg files:', error)
    }

    if (processedFrames.length === 0) {
      throw new Error('No frames could be extracted from video')
    }

    onProgress?.(100, `Successfully extracted ${processedFrames.length} frames`)

    return {
      frames: processedFrames,
      originalDimensions: { width: originalWidth, height: originalHeight },
      mediaType: 'video',
      totalFrames: processedFrames.length,
      avgFrameDelay: 1000 / frameRate
    }
  }

  /**
   * Process static image (single frame)
   */
  private static async processImageFromUrl(
    url: string, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = async () => {
        try {
          onProgress?.(50, 'Processing image...')
          const pixelatedImageData = await this.pixelateImage(img, options)
          
          const frame: Frame = {
            id: `image_${Date.now()}`,
            projectId: '',
            index: 0,
            delayMs: 500,
            included: true,
            layers: [],
            flattenedPngUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          onProgress?.(100, 'Image processed successfully')

          resolve({
            frames: [{ frame, imageData: Array.from(pixelatedImageData.data) }],
            originalDimensions: { width: img.width, height: img.height },
            mediaType: 'image',
            totalFrames: 1,
            avgFrameDelay: 500
          })
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      onProgress?.(20, 'Loading image...')
      img.src = proxyUrl
    })
  }

  /**
   * Process static image from file
   */
  private static async processImageFromFile(
    file: File, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = async () => {
        try {
          onProgress?.(50, 'Processing image...')
          const pixelatedImageData = await this.pixelateImage(img, options)
          
          const frame: Frame = {
            id: `image_file_${Date.now()}`,
            projectId: '',
            index: 0,
            delayMs: 500,
            included: true,
            layers: [],
            flattenedPngUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          onProgress?.(100, 'Image processed successfully')

          resolve({
            frames: [{ frame, imageData: Array.from(pixelatedImageData.data) }],
            originalDimensions: { width: img.width, height: img.height },
            mediaType: 'image',
            totalFrames: 1,
            avgFrameDelay: 500
          })
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image file'))
      
      onProgress?.(20, 'Reading image file...')
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Utility methods (same as original MediaImporter)
   */
  private static validateFile(file: File): void {
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`)
    }

    const allowedTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/mov', 'video/avi'
    ]
    
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Unsupported file type: ${file.type}. Supported: PNG, JPG, WebP, GIF, MP4, WebM`)
    }
  }

  private static detectMediaTypeFromFile(file: File): 'image' | 'gif' | 'video' {
    if (file.type === 'image/gif') return 'gif'
    if (file.type.startsWith('video/')) return 'video'
    return 'image'
  }

  private static detectMediaType(url: string): 'image' | 'gif' | 'video' {
    const lowerUrl = url.toLowerCase()
    if (lowerUrl.includes('.gif') || lowerUrl.includes('gif')) return 'gif'
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi']
    if (videoExtensions.some(ext => lowerUrl.includes(ext))) return 'video'
    return 'image'
  }

  private static async pixelateImage(
    img: HTMLImageElement, 
    options: MediaImportOptions
  ): Promise<ImageData> {
    const { canvas, ctx } = this.getCanvas()
    const { width: targetWidth, height: targetHeight, scalingMode = 'fit' } = options
    const originalWidth = img.naturalWidth || img.width
    const originalHeight = img.naturalHeight || img.height

    canvas.width = targetWidth
    canvas.height = targetHeight

    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false
    ;(ctx as any).webkitImageSmoothingEnabled = false
    ;(ctx as any).mozImageSmoothingEnabled = false
    ;(ctx as any).msImageSmoothingEnabled = false

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, targetWidth, targetHeight)

    let drawX = 0, drawY = 0, drawWidth = 0, drawHeight = 0
    let sourceX = 0, sourceY = 0, sourceWidth = originalWidth, sourceHeight = originalHeight

    switch (scalingMode) {
      case 'fit': {
        // Preserve aspect ratio, fit within canvas, add transparent padding
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const scale = Math.min(scaleX, scaleY)
        
        drawWidth = Math.round(originalWidth * scale)
        drawHeight = Math.round(originalHeight * scale)
        drawX = Math.round((targetWidth - drawWidth) / 2)
        drawY = Math.round((targetHeight - drawHeight) / 2)
        break
      }
      
      case 'fill': {
        // Preserve aspect ratio, fill entire canvas, crop excess
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const scale = Math.max(scaleX, scaleY)
        
        const scaledWidth = originalWidth * scale
        const scaledHeight = originalHeight * scale
        
        // Calculate source crop area to maintain aspect ratio
        if (scaledWidth > targetWidth) {
          // Need to crop horizontally
          sourceWidth = targetWidth / scale
          sourceX = (originalWidth - sourceWidth) / 2
        }
        if (scaledHeight > targetHeight) {
          // Need to crop vertically  
          sourceHeight = targetHeight / scale
          sourceY = (originalHeight - sourceHeight) / 2
        }
        
        drawX = 0
        drawY = 0
        drawWidth = targetWidth
        drawHeight = targetHeight
        break
      }
      
      case 'original': {
        // Use original size, center in canvas if smaller, or scale down if larger
        if (originalWidth <= targetWidth && originalHeight <= targetHeight) {
          // Original is smaller or equal - use original size and center
          drawWidth = originalWidth
          drawHeight = originalHeight
          drawX = Math.round((targetWidth - drawWidth) / 2)
          drawY = Math.round((targetHeight - drawHeight) / 2)
        } else {
          // Original is larger - scale down using 'fit' logic
          const scaleX = targetWidth / originalWidth
          const scaleY = targetHeight / originalHeight
          const scale = Math.min(scaleX, scaleY)
          
          drawWidth = Math.round(originalWidth * scale)
          drawHeight = Math.round(originalHeight * scale)
          drawX = Math.round((targetWidth - drawWidth) / 2)
          drawY = Math.round((targetHeight - drawHeight) / 2)
        }
        break
      }
      
      case 'smart': {
        // Smart integer scaling for pixel art - scale by integer factors when possible
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const minScale = Math.min(scaleX, scaleY)
        
        // Find the largest integer scale that fits
        const integerScale = Math.floor(minScale)
        
        if (integerScale >= 1) {
          // Use integer scaling for crisp pixel art
          drawWidth = originalWidth * integerScale
          drawHeight = originalHeight * integerScale
          drawX = Math.round((targetWidth - drawWidth) / 2)
          drawY = Math.round((targetHeight - drawHeight) / 2)
        } else {
          // If integer scaling would make it too small, fall back to 'fit' mode
          const scale = minScale
          drawWidth = Math.round(originalWidth * scale)
          drawHeight = Math.round(originalHeight * scale)
          drawX = Math.round((targetWidth - drawWidth) / 2)
          drawY = Math.round((targetHeight - drawHeight) / 2)
        }
        break
      }
      
      // Extended modes for small-to-large scenarios
      case 'fit-upscale': {
        // Scale up proportionally to fit canvas (similar to fit but intended for upscaling)
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const scale = Math.min(scaleX, scaleY)
        
        drawWidth = Math.round(originalWidth * scale)
        drawHeight = Math.round(originalHeight * scale)
        drawX = Math.round((targetWidth - drawWidth) / 2)
        drawY = Math.round((targetHeight - drawHeight) / 2)
        break
      }
      
      case 'smart-upscale': {
        // Use intelligent upscaling with integer scaling when possible
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const minScale = Math.min(scaleX, scaleY)
        
        // Find the largest integer scale that fits
        const possibleScales = [2, 3, 4, 5, 6, 8, 10]
        let integerScale = 1
        
        for (const scale of possibleScales) {
          if (originalWidth * scale <= targetWidth && originalHeight * scale <= targetHeight) {
            integerScale = scale
          } else {
            break
          }
        }
        
        // Use integer scale if beneficial, otherwise use proportional scaling
        if (integerScale >= 2) {
          drawWidth = originalWidth * integerScale
          drawHeight = originalHeight * integerScale
        } else {
          drawWidth = Math.round(originalWidth * minScale)
          drawHeight = Math.round(originalHeight * minScale)
        }
        
        drawX = Math.round((targetWidth - drawWidth) / 2)
        drawY = Math.round((targetHeight - drawHeight) / 2)
        break
      }
      
      case 'original-center': {
        // Keep original size and center on canvas
        drawWidth = originalWidth
        drawHeight = originalHeight
        drawX = Math.round((targetWidth - drawWidth) / 2)
        drawY = Math.round((targetHeight - drawHeight) / 2)
        break
      }

      default: {
        // Default to 'fit' mode for any unrecognized scaling mode
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const scale = Math.min(scaleX, scaleY)
        
        drawWidth = Math.round(originalWidth * scale)
        drawHeight = Math.round(originalHeight * scale)
        drawX = Math.round((targetWidth - drawWidth) / 2)
        drawY = Math.round((targetHeight - drawHeight) / 2)
        break
      }
    }

    // Ensure minimum size to prevent Canvas API issues with 0-sized draws
    const finalDrawWidth = Math.max(1, drawWidth)
    const finalDrawHeight = Math.max(1, drawHeight)
    
    // Draw the image with calculated parameters (only if there's something to draw)
    if (finalDrawWidth > 0 && finalDrawHeight > 0) {
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        drawX, drawY, finalDrawWidth, finalDrawHeight
      )
    }

    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)

    if (options.colorCount && options.colorCount > 0) {
      this.quantizeColors(imageData, options.colorCount)
    }

    return imageData
  }

  private static quantizeColors(imageData: ImageData, maxColors: number): void {
    const data = imageData.data
    const colorReduction = Math.max(1, Math.floor(256 / Math.pow(maxColors, 1/3)))
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor((data[i] ?? 0) / colorReduction) * colorReduction
      data[i + 1] = Math.floor((data[i + 1] ?? 0) / colorReduction) * colorReduction
      data[i + 2] = Math.floor((data[i + 2] ?? 0) / colorReduction) * colorReduction
      data[i + 3] = data[i + 3] ?? 255
    }
  }

  static async validateUrl(url: string): Promise<boolean> {
    try {
      const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}&validate=true`
      const response = await fetch(proxyUrl, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }
}