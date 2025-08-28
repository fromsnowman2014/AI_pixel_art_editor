'use client'

import { Frame } from '@/lib/types/api'
import { MediaImportOptions, ImportResult, ProgressCallback } from '@/lib/services/enhanced-media-importer'

/**
 * 고속 동영상 처리기 - 부분 로딩 및 최적화된 프레임 추출
 * 전체 파일 다운로드 없이 첫 부분만으로 빠른 프레임 추출
 */
export class FastVideoProcessor {
  private static canvas: HTMLCanvasElement | null = null
  private static ctx: CanvasRenderingContext2D | null = null
  
  /**
   * 캔버스 초기화 (재사용 가능한 캔버스)
   */
  private static getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.canvas || !this.ctx) {
      this.canvas = document.createElement('canvas')
      const ctx = this.canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Canvas context not supported')
      }
      this.ctx = ctx
      this.ctx.imageSmoothingEnabled = false
    }
    return { canvas: this.canvas, ctx: this.ctx }
  }

  /**
   * 방법 1: HTML5 Video Element + Canvas (가장 빠른 방법)
   * - 브라우저 네이티브 디코딩 활용
   - 부분 로딩 지원
   - FFmpeg 오버헤드 없음
   */
  static async processVideoWithHTML5(
    source: string | File,
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(10, 'Initializing HTML5 video processor...')
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.playsInline = true
      
      let resolvedOnce = false
      const cleanup = () => {
        if (video.src && video.src.startsWith('blob:')) {
          URL.revokeObjectURL(video.src)
        }
        video.remove()
      }
      
      const safeResolve = (result: ImportResult) => {
        if (!resolvedOnce) {
          resolvedOnce = true
          cleanup()
          resolve(result)
        }
      }
      
      const safeReject = (error: Error) => {
        if (!resolvedOnce) {
          resolvedOnce = true
          cleanup()
          reject(error)
        }
      }

      video.addEventListener('loadedmetadata', async () => {
        try {
          onProgress?.(30, 'Video metadata loaded, extracting frames...')
          
          const { canvas, ctx } = this.getCanvas()
          canvas.width = options.width
          canvas.height = options.height
          
          const frames: { frame: Frame; imageData: number[] }[] = []
          const duration = Math.min(video.duration, 1.0) // 최대 1초
          const frameCount = Math.min(options.maxFrames || 10, 10)
          const frameInterval = duration / frameCount
          
          console.log(`Processing ${frameCount} frames from ${duration}s duration`)
          
          for (let i = 0; i < frameCount; i++) {
            const timestamp = i * frameInterval
            
            // 정확한 시간으로 시크
            video.currentTime = timestamp
            
            await new Promise<void>((resolveSeek) => {
              const handleSeeked = () => {
                video.removeEventListener('seeked', handleSeeked)
                resolveSeek()
              }
              video.addEventListener('seeked', handleSeeked, { once: true })
              
              // Fallback: 100ms 후에도 seeked가 발생하지 않으면 계속 진행
              setTimeout(resolveSeek, 100)
            })
            
            // 비디오 프레임을 캔버스에 그리기 (픽셀 아트 최적화)
            const originalWidth = video.videoWidth
            const originalHeight = video.videoHeight
            
            // 스케일링 계산
            const scaleX = options.width / originalWidth
            const scaleY = options.height / originalHeight
            const scale = Math.min(scaleX, scaleY)
            
            const drawWidth = Math.round(originalWidth * scale)
            const drawHeight = Math.round(originalHeight * scale)
            const drawX = Math.round((options.width - drawWidth) / 2)
            const drawY = Math.round((options.height - drawHeight) / 2)
            
            // 캔버스 클리어
            ctx.clearRect(0, 0, options.width, options.height)
            
            // 비디오 프레임을 캔버스에 그리기
            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)
            
            // 픽셀 데이터 추출
            const imageData = ctx.getImageData(0, 0, options.width, options.height)
            
            // 색상 양자화 (옵션)
            if (options.colorCount && options.colorCount > 0) {
              this.quantizeColors(imageData, options.colorCount)
            }
            
            const frame: Frame = {
              id: `video_html5_frame_${i}_${Date.now()}`,
              projectId: '',
              index: i,
              delayMs: Math.round(frameInterval * 1000), // ms로 변환
              included: true,
              layers: [],
              flattenedPngUrl: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
            
            frames.push({
              frame,
              imageData: Array.from(imageData.data)
            })
            
            const progress = 30 + ((i + 1) / frameCount) * 60
            onProgress?.(progress, `Extracted frame ${i + 1}/${frameCount}`)
          }
          
          onProgress?.(100, `Successfully extracted ${frames.length} frames with HTML5`)
          
          safeResolve({
            frames,
            originalDimensions: { width: video.videoWidth, height: video.videoHeight },
            mediaType: 'video',
            totalFrames: frames.length,
            avgFrameDelay: Math.round((duration / frameCount) * 1000)
          })
          
        } catch (error) {
          console.error('HTML5 video processing failed:', error)
          safeReject(new Error(`HTML5 video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      })
      
      video.addEventListener('error', (e) => {
        console.error('Video loading error:', e)
        safeReject(new Error('Failed to load video with HTML5'))
      })
      
      // 타임아웃 설정 (30초)
      setTimeout(() => {
        safeReject(new Error('HTML5 video processing timeout'))
      }, 30000)
      
      // 비디오 소스 설정
      if (typeof source === 'string') {
        onProgress?.(20, 'Loading video from URL...')
        video.src = source
      } else {
        onProgress?.(20, 'Loading video file...')
        video.src = URL.createObjectURL(source)
      }
      
      video.load()
    })
  }

  /**
   * 방법 2: Progressive Range Loading (부분 파일 로딩)
   * HTTP Range requests로 파일의 앞부분만 로딩
   */
  static async processVideoWithRangeLoading(
    url: string,
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    onProgress?.(10, 'Starting progressive video loading...')
    
    try {
      // 1단계: HEAD 요청으로 파일 크기 확인
      const headResponse = await fetch(url, { method: 'HEAD' })
      if (!headResponse.ok) {
        throw new Error('Unable to get video file info')
      }
      
      const acceptRanges = headResponse.headers.get('accept-ranges')
      const contentLength = headResponse.headers.get('content-length')
      
      if (acceptRanges !== 'bytes' || !contentLength) {
        throw new Error('Server does not support range requests')
      }
      
      const totalSize = parseInt(contentLength)
      console.log(`Video file size: ${Math.round(totalSize / 1024 / 1024)}MB`)
      
      // 2단계: 파일의 처음 부분만 다운로드 (보통 처음 10-20% 정도)
      // MP4의 경우 moov atom이 처음에 있으면 메타데이터 포함
      const chunkSize = Math.min(totalSize, Math.max(1024 * 1024 * 2, totalSize * 0.15)) // 최소 2MB 또는 15%
      
      onProgress?.(20, `Downloading first ${Math.round(chunkSize / 1024 / 1024)}MB...`)
      
      const rangeResponse = await fetch(url, {
        headers: {
          'Range': `bytes=0-${chunkSize - 1}`
        }
      })
      
      if (!rangeResponse.ok) {
        throw new Error('Range request failed')
      }
      
      const partialData = await rangeResponse.arrayBuffer()
      console.log(`Downloaded ${Math.round(partialData.byteLength / 1024 / 1024)}MB of video data`)
      
      // 3단계: 부분 데이터로 Blob URL 생성
      const blob = new Blob([partialData], { type: 'video/mp4' })
      const blobUrl = URL.createObjectURL(blob)
      
      try {
        // HTML5 비디오 방식으로 처리
        onProgress?.(40, 'Processing partial video data...')
        const result = await this.processVideoWithHTML5(blobUrl, options, (progress: number, message: string) => {
          onProgress?.(40 + (progress - 10) * 0.6, message) // 40-100% 범위로 조정
        })
        
        URL.revokeObjectURL(blobUrl)
        return result
        
      } catch (error) {
        URL.revokeObjectURL(blobUrl)
        throw error
      }
      
    } catch (error) {
      console.error('Progressive loading failed:', error)
      throw new Error(`Progressive loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 방법 3: WebCodecs API (실험적, 최신 브라우저)
   * 가장 효율적이지만 브라우저 지원 제한적
   */
  static async processVideoWithWebCodecs(
    source: string | File,
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    if (!('VideoDecoder' in window) || !('VideoFrame' in window)) {
      throw new Error('WebCodecs API not supported in this browser')
    }
    
    onProgress?.(10, 'Initializing WebCodecs video processor...')
    
    // WebCodecs 구현 (복잡하므로 기본 구조만)
    throw new Error('WebCodecs implementation coming soon - using HTML5 fallback')
  }

  /**
   * 색상 양자화 (기존 로직 재사용)
   */
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

  /**
   * 통합 고속 비디오 처리기
   * 여러 방법을 시도하며 가장 빠른 방법 사용
   */
  static async processVideoFast(
    source: string | File,
    options: MediaImportOptions,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    const startTime = performance.now()
    
    try {
      // 방법 1: HTML5 Video (로컬 파일이나 작은 파일)
      if (typeof source !== 'string' || (typeof source === 'string' && source.length < 1000)) {
        console.log('Using HTML5 video processing for fast extraction')
        const result = await this.processVideoWithHTML5(source, options, onProgress)
        
        const processingTime = performance.now() - startTime
        console.log(`✅ Fast video processing completed in ${Math.round(processingTime)}ms`)
        
        return result
      }
      
      // 방법 2: Progressive Range Loading (URL의 경우)
      if (typeof source === 'string') {
        try {
          console.log('Attempting progressive range loading...')
          const result = await this.processVideoWithRangeLoading(source, options, onProgress)
          
          const processingTime = performance.now() - startTime
          console.log(`✅ Progressive video processing completed in ${Math.round(processingTime)}ms`)
          
          return result
          
        } catch (rangeError) {
          console.warn('Range loading failed, falling back to HTML5:', rangeError)
          
          // Fallback to HTML5
          const result = await this.processVideoWithHTML5(source, options, onProgress)
          
          const processingTime = performance.now() - startTime
          console.log(`✅ Fallback video processing completed in ${Math.round(processingTime)}ms`)
          
          return result
        }
      }
      
      throw new Error('Unsupported video source type')
      
    } catch (error) {
      const processingTime = performance.now() - startTime
      console.error(`❌ Fast video processing failed after ${Math.round(processingTime)}ms:`, error)
      throw error
    }
  }
}