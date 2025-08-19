'use client'

import { Frame } from '@/lib/types/api'
import { decompressFrames, parseGIF } from 'gifuct-js'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

export interface MediaImportOptions {
  width: number
  height: number
  colorCount?: number
  maxFrames?: number
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
      this.ctx = this.canvas.getContext('2d')!
      // Optimize for pixel art
      this.ctx.imageSmoothingEnabled = false
    }
    return { canvas: this.canvas, ctx: this.ctx }
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
    return await this.processGifData(arrayBuffer, options, onProgress)
  }

  /**
   * Process animated GIF from local file
   */
  private static async processGifFromFile(
    file: File, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(20, 'Reading GIF file...')
    
    const arrayBuffer = await file.arrayBuffer()
    return await this.processGifData(arrayBuffer, options, onProgress)
  }

  /**
   * Core GIF processing logic with frame extraction
   */
  private static async processGifData(
    arrayBuffer: ArrayBuffer,
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(30, 'Parsing GIF frames...')

    // Parse GIF using gifuct-js
    const gif = parseGIF(arrayBuffer)
    const frames = decompressFrames(gif, true)
    
    if (frames.length === 0) {
      throw new Error('No frames found in GIF')
    }

    onProgress?.(40, `Found ${frames.length} frames, processing...`)

    // Limit frames for performance
    const maxFrames = options.maxFrames || 30
    const framesToProcess = frames.slice(0, maxFrames)
    
    const processedFrames: { frame: Frame; imageData: number[] }[] = []
    const { canvas, ctx } = this.getCanvas()
    
    // Set canvas to GIF dimensions for processing
    canvas.width = gif.lsd.width
    canvas.height = gif.lsd.height
    
    let totalDelay = 0

    for (let i = 0; i < framesToProcess.length; i++) {
      const gifFrame = framesToProcess[i]
      if (!gifFrame) continue
      
      const progress = 40 + ((i / framesToProcess.length) * 50)
      onProgress?.(progress, `Processing frame ${i + 1}/${framesToProcess.length}`)

      // Create ImageData from GIF frame
      const imageData = new ImageData(
        new Uint8ClampedArray(gifFrame.pixels), 
        gifFrame.dims.width, 
        gifFrame.dims.height
      )
      
      // Clear canvas and draw frame
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Handle frame positioning
      ctx.putImageData(imageData, gifFrame.dims.left, gifFrame.dims.top)
      
      // Create image from canvas for pixelation
      const tempImg = new Image()
      await new Promise<void>((resolve, reject) => {
        tempImg.onload = () => resolve()
        tempImg.onerror = () => reject(new Error(`Failed to process frame ${i + 1}`))
        tempImg.src = canvas.toDataURL()
      })

      // Pixelate the frame
      const pixelatedImageData = await this.pixelateImage(tempImg, options)
      
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
    }

    onProgress?.(100, `Successfully processed ${processedFrames.length} frames`)

    return {
      frames: processedFrames,
      originalDimensions: { width: gif.lsd.width, height: gif.lsd.height },
      mediaType: 'gif',
      totalFrames: processedFrames.length,
      avgFrameDelay: Math.round(totalDelay / processedFrames.length)
    }
  }

  /**
   * Process video with frame extraction using FFmpeg
   */
  private static async processVideoFromUrl(
    url: string, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(20, 'Fetching video data...')
    
    const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`
    const response = await fetch(proxyUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return await this.processVideoData(arrayBuffer, 'video.mp4', options, onProgress)
  }

  /**
   * Process video from local file
   */
  private static async processVideoFromFile(
    file: File, 
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(20, 'Reading video file...')
    
    const arrayBuffer = await file.arrayBuffer()
    return await this.processVideoData(arrayBuffer, file.name, options, onProgress)
  }

  /**
   * Core video processing logic with FFmpeg
   */
  private static async processVideoData(
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
    
    // Extract frames (max 1 second, 10 FPS = max 10 frames)
    const maxFrames = Math.min(options.maxFrames || 10, 10)
    const frameRate = maxFrames // frames per second
    
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
    const { width: targetWidth, height: targetHeight } = options

    canvas.width = targetWidth
    canvas.height = targetHeight

    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false
    ;(ctx as any).webkitImageSmoothingEnabled = false
    ;(ctx as any).mozImageSmoothingEnabled = false
    ;(ctx as any).msImageSmoothingEnabled = false

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
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