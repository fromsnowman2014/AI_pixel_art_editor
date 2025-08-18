'use client'

import { Frame } from '@/lib/types/api'

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
}

export class MediaImporter {
  private static canvas: HTMLCanvasElement | null = null
  private static ctx: CanvasRenderingContext2D | null = null

  private static getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.canvas || !this.ctx) {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d')!
    }
    return { canvas: this.canvas, ctx: this.ctx }
  }

  /**
   * Import media from URL and convert to pixel art frames
   */
  static async importFromUrl(url: string, options: MediaImportOptions): Promise<ImportResult> {
    try {
      // Validate URL
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported')
      }

      // Determine media type from URL
      const mediaType = this.detectMediaType(url)
      
      switch (mediaType) {
        case 'gif':
          return await this.processGif(url, options)
        case 'video':
          return await this.processVideo(url, options)
        case 'image':
        default:
          return await this.processImage(url, options)
      }
    } catch (error) {
      console.error('Media import failed:', error)
      throw new Error(`Failed to import media: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Detect media type from URL
   */
  private static detectMediaType(url: string): 'image' | 'gif' | 'video' {
    const lowerUrl = url.toLowerCase()
    
    if (lowerUrl.includes('.gif') || lowerUrl.includes('gif')) {
      return 'gif'
    }
    
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi']
    if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
      return 'video'
    }
    
    return 'image'
  }

  /**
   * Process static image
   */
  private static async processImage(url: string, options: MediaImportOptions): Promise<ImportResult> {
    const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = async () => {
        try {
          const pixelatedImageData = await this.pixelateImage(img, options)
          const frame: Frame = {
            id: `imported_${Date.now()}`,
            projectId: '',
            index: 0,
            delayMs: 500,
            included: true,
            layers: [],
            flattenedPngUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          resolve({
            frames: [{ frame, imageData: Array.from(pixelatedImageData.data) }],
            originalDimensions: { width: img.width, height: img.height },
            mediaType: 'image'
          })
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = proxyUrl
    })
  }

  /**
   * Process animated GIF (simplified - extracts first frame only)
   */
  private static async processGif(url: string, options: MediaImportOptions): Promise<ImportResult> {
    // For now, treat GIF as static image (first frame)
    // TODO: Add proper GIF frame extraction using gifuct-js library
    return await this.processImage(url, options)
  }

  /**
   * Process video (extracts first frame only)
   */
  private static async processVideo(url: string, options: MediaImportOptions): Promise<ImportResult> {
    const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      
      video.onloadedmetadata = () => {
        video.currentTime = 0 // Get first frame
      }
      
      video.onseeked = async () => {
        try {
          const { canvas, ctx } = this.getCanvas()
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          ctx.drawImage(video, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          
          // Create temporary image from video frame
          const tempImg = new Image()
          tempImg.onload = async () => {
            try {
              const pixelatedImageData = await this.pixelateImage(tempImg, options)
              const frame: Frame = {
                id: `imported_video_${Date.now()}`,
                projectId: '',
                index: 0,
                delayMs: 500,
                included: true,
                layers: [],
                flattenedPngUrl: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }

              resolve({
                frames: [{ frame, imageData: Array.from(pixelatedImageData.data) }],
                originalDimensions: { width: video.videoWidth, height: video.videoHeight },
                mediaType: 'video'
              })
            } catch (error) {
              reject(error)
            }
          }
          tempImg.src = canvas.toDataURL()
        } catch (error) {
          reject(error)
        }
      }
      
      video.onerror = () => reject(new Error('Failed to load video'))
      video.src = proxyUrl
    })
  }

  /**
   * Convert image to pixel art using nearest-neighbor scaling
   */
  private static async pixelateImage(
    img: HTMLImageElement, 
    options: MediaImportOptions
  ): Promise<ImageData> {
    const { canvas, ctx } = this.getCanvas()
    const { width: targetWidth, height: targetHeight } = options

    // Set canvas to target size
    canvas.width = targetWidth
    canvas.height = targetHeight

    // Disable image smoothing for pixel art effect
    ctx.imageSmoothingEnabled = false
    ;(ctx as any).webkitImageSmoothingEnabled = false
    ;(ctx as any).mozImageSmoothingEnabled = false
    ;(ctx as any).msImageSmoothingEnabled = false

    // Draw image scaled to target size (nearest-neighbor)
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)

    // Apply color quantization if specified
    if (options.colorCount && options.colorCount > 0) {
      this.quantizeColors(imageData, options.colorCount)
    }

    return imageData
  }

  /**
   * Simple color quantization using median cut algorithm (simplified)
   */
  private static quantizeColors(imageData: ImageData, maxColors: number): void {
    const data = imageData.data
    const pixels: number[][] = []

    // Collect unique colors
    for (let i = 0; i < data.length; i += 4) {
      pixels.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, data[i + 3] ?? 255])
    }

    // Simple quantization by reducing color precision
    const colorReduction = Math.max(1, Math.floor(256 / Math.pow(maxColors, 1/3)))
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor((data[i] ?? 0) / colorReduction) * colorReduction     // R
      data[i + 1] = Math.floor((data[i + 1] ?? 0) / colorReduction) * colorReduction // G
      data[i + 2] = Math.floor((data[i + 2] ?? 0) / colorReduction) * colorReduction // B
      data[i + 3] = data[i + 3] ?? 255 // Keep alpha as-is, default to fully opaque
    }
  }

  /**
   * Validate if URL is accessible
   */
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