'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EnhancedMediaImporter, MediaImportOptions, ProgressCallback, type ScalingMode } from '@/lib/utils/enhanced-media-importer'
import { useProjectStore } from '@/lib/stores/project-store'
import { FrameImportOptionsModal } from './frame-import-options-modal'
import { getVideoFrameLimit, getGifFrameLimit, getCurrentUserTier } from '@/lib/types/user'
import { cn } from '@/lib/utils'
import { 
  Download, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Image as ImageIcon,
  Film,
  FileImage,
  Upload,
  Globe,
  HardDrive,
  X
} from 'lucide-react'

interface MediaImportProps {
  className?: string
  onImportSuccess?: () => void
}

type ImportMode = 'url' | 'file'

export function MediaImport({ className, onImportSuccess }: MediaImportProps) {
  const { activeTabId, getActiveTab, addFrameWithData, resetToSingleFrame, setActiveFrame } = useProjectStore()
  const [mode, setMode] = useState<ImportMode>('file')
  const [url, setUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Progress tracking for multi-frame import
  const [importProgress, setImportProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  
  // Advanced options
  const [colorCount, setColorCount] = useState(16)
  const [useColorLimit, setUseColorLimit] = useState(false)
  
  // Get tier-based limits
  const userTier = getCurrentUserTier()
  const videoFrameLimit = getVideoFrameLimit()
  const gifFrameLimit = getGifFrameLimit()
  const [maxFrames, setMaxFrames] = useState(Math.min(videoFrameLimit, gifFrameLimit))

  // Frame import options  
  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<{
    result: any
    mediaType: 'image' | 'gif' | 'video'
  } | null>(null)
  
  // Import operation tracking for race condition prevention
  const [importOperationId, setImportOperationId] = useState<string | null>(null)
  const importAbortController = useRef<AbortController | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeTab = getActiveTab()
  const project = activeTab?.project

  if (!project || !activeTabId) {
    return null
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // Cancel any ongoing import operation
  const cancelImport = () => {
    if (importAbortController.current) {
      importAbortController.current.abort()
      importAbortController.current = null
    }
    setImportOperationId(null)
    setIsImporting(false)
    setImportProgress(0)
    setProgressMessage('')
    setPendingImportData(null)
    setShowImportOptionsModal(false)
  }

  // Check if import is safe to start (no race conditions)
  const canStartImport = (): boolean => {
    return !isImporting && !importOperationId && !showImportOptionsModal
  }

  // Generate unique operation ID for tracking
  const generateOperationId = (): string => {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const validateUrl = (inputUrl: string): { isValid: boolean; error?: string } => {
    try {
      if (!inputUrl?.trim()) {
        return { isValid: false, error: 'URL cannot be empty' }
      }
      
      const urlObj = new URL(inputUrl.trim())
      
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, error: 'Only HTTP and HTTPS URLs are supported' }
      }
      
      // Check for obvious non-media URLs
      const suspiciousPatterns = ['/api/', '/admin/', '/login', '.html', '.php', '.jsp']
      if (suspiciousPatterns.some(pattern => urlObj.pathname.toLowerCase().includes(pattern))) {
        return { isValid: false, error: 'URL does not appear to be a direct media link' }
      }
      
      return { isValid: true }
    } catch {
      return { isValid: false, error: 'Invalid URL format' }
    }
  }

  const getMediaTypeFromUrl = (url: string): 'image' | 'gif' | 'video' | null => {
    try {
      if (!url?.trim()) return null
      
      const urlObj = new URL(url.trim())
      const pathname = urlObj.pathname.toLowerCase()
      
      // More precise extension matching
      if (pathname.endsWith('.gif') || urlObj.search.includes('gif')) return 'gif'
      
      const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.m4v']
      if (videoExts.some(ext => pathname.endsWith(ext))) return 'video'
      
      const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.bmp']
      if (imageExts.some(ext => pathname.endsWith(ext))) return 'image'
      
      // Fallback for URLs without clear extensions
      return 'image'
    } catch {
      return null
    }
  }

  const getMediaTypeFromFile = (file: File): 'image' | 'gif' | 'video' | null => {
    try {
      if (!file?.type && !file?.name) return null
      
      // Primary: MIME type detection
      if (file.type === 'image/gif') return 'gif'
      if (file.type.startsWith('video/')) return 'video'
      if (file.type.startsWith('image/')) return 'image'
      
      // Fallback: filename extension detection
      if (file.name) {
        const extension = file.name.toLowerCase().split('.').pop()
        if (extension === 'gif') return 'gif'
        
        const videoExts = ['mp4', 'webm', 'mov', 'avi', 'm4v']
        if (videoExts.includes(extension || '')) return 'video'
        
        const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'bmp']
        if (imageExts.includes(extension || '')) return 'image'
      }
      
      return null
    } catch {
      return null
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    clearMessages()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Process the actual import after option selection
  const processImport = async (result: any, importOption: 'add' | 'replace', scalingMode: ScalingMode = 'fit') => {
    try {
      const mediaType = result.mediaType
      const frameCount = result.frames.length

      // Handle replace option - reset to single frame first
      if (importOption === 'replace') {
        resetToSingleFrame(activeTabId)
      }

      // Add imported frames to the project with localStorage monitoring
      for (let i = 0; i < result.frames.length; i++) {
        const frameData = result.frames[i]
        try {
          // Monitor localStorage usage for large imports
          const frameSize = frameData.imageData.length * 4 // Approximate size
          const estimatedTotalSize = frameSize * result.frames.length
          
          // If estimated size is large, warn and potentially limit frames
          if (estimatedTotalSize > 5 * 1024 * 1024) { // 5MB threshold
            console.warn(`⚠️ Large GIF import detected: ~${Math.round(estimatedTotalSize / (1024 * 1024))}MB`)
            
            // For very large imports, limit to prevent quota errors
            if (i > 10) { // Maximum 10 frames for large imports
              console.log(`🛑 Limiting large import to ${i} frames to prevent localStorage quota errors`)
              break
            }
          }
          
          await addFrameWithData(activeTabId, frameData.imageData, frameData.frame.delayMs)
          
          // Check localStorage quota after each frame for large imports
          if (frameSize > 100000 && i > 0) { // 100KB+ per frame
            try {
              // Test localStorage write to detect quota issues early
              const testKey = `test_quota_${Date.now()}`
              localStorage.setItem(testKey, 'test')
              localStorage.removeItem(testKey)
            } catch (quotaError) {
              console.error(`💾 localStorage quota reached at frame ${i + 1}/${result.frames.length}`)
              setError(`Import partially successful: ${i} frames imported. Storage limit reached.`)
              break
            }
          }
          
        } catch (frameError) {
          console.error(`Failed to import frame ${i + 1}:`, frameError)
          
          // If it's a quota error, stop importing
          if (frameError instanceof Error && frameError.name === 'QuotaExceededError') {
            setError(`Import stopped at frame ${i}: Storage limit reached. Try reducing canvas size or frame count.`)
            break
          }
          
          // For other errors, continue with next frame
          continue
        }
      }
      
      // Enhanced success message with recovery information
      let successMessage = `Successfully imported ${frameCount} frame${frameCount > 1 ? 's' : ''} from ${mediaType}! `
      successMessage += `Original size: ${result.originalDimensions.width}×${result.originalDimensions.height}px. `
      
      if (frameCount > 1) {
        successMessage += `Average delay: ${result.avgFrameDelay}ms per frame. `
      }
      
      // Add import strategy info
      if (importOption === 'replace') {
        successMessage += `Replaced all existing frames. `
      } else {
        successMessage += `Added after existing frames. `
      }
      
      // Check if this was a fallback result (single frame from multi-frame GIF)
      if (mediaType === 'gif' && frameCount === 1 && progressMessage.includes('fallback')) {
        successMessage += `Note: Used fallback processing (single frame extracted). `
      }
      
      setSuccess(successMessage)
      
      // Auto-select first frame after successful import and close popup for multi-frame imports
      setTimeout(() => {
        if (activeTabId && result.frames && result.frames.length > 0) {
          const firstFrame = result.frames[0]
          if (firstFrame && firstFrame.frame && firstFrame.frame.id) {
            setActiveFrame(activeTabId, firstFrame.frame.id)
            
            // Auto-close import modal after successful GIF/multi-frame import
            if ((mediaType === 'gif' || mediaType === 'video') && frameCount > 1 && onImportSuccess) {
              onImportSuccess()
            }
          }
        }
      }, 500) // Small delay to ensure frames are properly added
      
      // Clear inputs on success
      if (mode === 'url') {
        setUrl('')
      } else {
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Import failed: ${errorMessage}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleImport = async () => {
    // Race condition protection
    if (!canStartImport()) {
      console.warn('Import already in progress or blocked by modal state')
      return
    }

    clearMessages()
    setImportProgress(0)
    setProgressMessage('')

    // Generate unique operation ID and abort controller
    const operationId = generateOperationId()
    setImportOperationId(operationId)
    importAbortController.current = new AbortController()

    const options: MediaImportOptions = {
      width: project.width,
      height: project.height,
      colorCount: useColorLimit ? colorCount : undefined,
      maxFrames: maxFrames, // User-configurable frame limit
      scalingMode: 'fit' // Default scaling mode, can be changed later
    }

    // Enhanced progress callback with operation tracking
    const onProgress: ProgressCallback = (progress: number, message: string) => {
      // Only update if this is still the current operation
      if (importOperationId === operationId) {
        setImportProgress(Math.round(progress))
        setProgressMessage(message)
      }
    }

    setIsImporting(true)

    try {
      let result: any

      if (mode === 'url') {
        const urlValidation = validateUrl(url)
        if (!urlValidation.isValid) {
          throw new Error(urlValidation.error || 'Invalid URL')
        }

        // Check operation hasn't been cancelled
        if (importAbortController.current?.signal.aborted) {
          throw new Error('Import cancelled by user')
        }

        // Validate URL accessibility first
        onProgress(10, 'Validating URL accessibility...')
        const isAccessible = await EnhancedMediaImporter.validateUrl(url)
        if (!isAccessible) {
          throw new Error('URL is not accessible or does not contain valid media')
        }

        // Check for cancellation again before expensive operation
        if (importAbortController.current?.signal.aborted) {
          throw new Error('Import cancelled by user')
        }

        result = await EnhancedMediaImporter.importFromUrl(url, options, onProgress)
      } else {
        if (!selectedFile) {
          throw new Error('Please select a file')
        }

        // Enhanced file validation
        const detectedType = getMediaTypeFromFile(selectedFile)
        if (!detectedType) {
          throw new Error(`Unable to determine file type for: ${selectedFile.name}`)
        }

        // Check file size limits based on type
        const maxSize = detectedType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024
        if (selectedFile.size > maxSize) {
          throw new Error(`File too large: ${formatFileSize(selectedFile.size)}. Maximum: ${formatFileSize(maxSize)}`)
        }

        // Check operation hasn't been cancelled
        if (importAbortController.current?.signal.aborted) {
          throw new Error('Import cancelled by user')
        }

        onProgress(15, 'Processing file...')
        result = await EnhancedMediaImporter.importFromFile(selectedFile, options, onProgress)
      }

      const mediaType = result.mediaType
      const frameCount = result.frames.length
      const existingFrameCount = activeTab?.frames?.length || 0

      // Check if we need to show import options modal
      const isMultiFrame = frameCount > 1
      const hasExistingFrames = existingFrameCount > 0
      const needsOptions = isMultiFrame && hasExistingFrames

      if (needsOptions) {
        // Show options modal
        setPendingImportData({ result, mediaType })
        setShowImportOptionsModal(true)
        setIsImporting(false) // Stop loading state while user decides
      } else {
        // Process directly (single frame or no existing frames)
        await processImport(result, 'add')
      }

    } catch (err) {
      // Only show error if this is still the current operation (not cancelled)
      if (importOperationId === operationId) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        if (!errorMessage.includes('cancelled by user')) {
          setError(`Import failed: ${errorMessage}`)
        }
        setIsImporting(false)
        setImportProgress(0)
        setProgressMessage('')
      }
    } finally {
      // Cleanup for current operation only
      if (importOperationId === operationId) {
        setImportOperationId(null)
        if (importAbortController.current) {
          importAbortController.current = null
        }
      }
    }
  }

  // Handle import option selection from modal
  const handleImportOptionSelected = async (option: 'add' | 'replace', scalingMode: ScalingMode) => {
    if (!pendingImportData) return

    setShowImportOptionsModal(false)
    setIsImporting(true)

    await processImport(pendingImportData.result, option, scalingMode)
    
    setPendingImportData(null)
  }

  const mediaType = mode === 'url' 
    ? (url ? getMediaTypeFromUrl(url) : null)
    : (selectedFile ? getMediaTypeFromFile(selectedFile) : null)
  
  const urlValidation = url ? validateUrl(url) : { isValid: false }
  const isValidUrl = urlValidation.isValid
  const canImport = mode === 'url' ? isValidUrl : (selectedFile && mediaType !== null)
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Mode Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={mode === 'file' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('file')}
            className="text-xs h-7 px-3"
          >
            <HardDrive className="h-3 w-3 mr-1" />
            Local File
          </Button>
          <Button
            variant={mode === 'url' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('url')}
            className="text-xs h-7 px-3"
          >
            <Globe className="h-3 w-3 mr-1" />
            URL
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs"
        >
          {showAdvanced ? 'Simple' : 'Advanced'}
        </Button>
      </div>

      {/* Import Content */}
      {mode === 'url' ? (
        /* URL Input */
        <div className="space-y-2">
          <label htmlFor="media-url" className="text-xs font-medium text-gray-700">
            Media URL (Image, GIF, or Video)
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                id="media-url"
                type="url"
                placeholder="https://example.com/image.png"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  clearMessages()
                }}
                className={cn(
                  "text-sm",
                  error && "border-red-300 focus:border-red-500 focus:ring-red-200",
                  success && "border-green-300 focus:border-green-500 focus:ring-green-200",
                  url && !urlValidation.isValid && "border-orange-300 focus:border-orange-500 focus:ring-orange-200"
                )}
                disabled={isImporting}
              />
              
              {/* Media type indicator */}
              {isValidUrl && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {mediaType === 'gif' && <Film className="h-3 w-3 text-purple-500" />}
                  {mediaType === 'video' && <Film className="h-3 w-3 text-blue-500" />}
                  {mediaType === 'image' && <ImageIcon className="h-3 w-3 text-green-500" />}
                  <span className="text-xs text-gray-500 capitalize">{mediaType}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* URL Validation Error */}
          {url && !urlValidation.isValid && (
            <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              {urlValidation.error}
            </div>
          )}
        </div>
      ) : (
        /* File Upload */
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-700">
            Upload Media File
          </label>
          
          {/* Drag & Drop Area */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-6 text-center transition-all",
              isDragOver
                ? "border-blue-400 bg-blue-50"
                : selectedFile
                ? "border-green-300 bg-green-50"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100",
              error && "border-red-300 bg-red-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isImporting}
            />
            
            {selectedFile ? (
              /* Selected File Display */
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  {mediaType === 'gif' && <Film className="h-8 w-8 text-purple-500" />}
                  {mediaType === 'video' && <Film className="h-8 w-8 text-blue-500" />}
                  {mediaType === 'image' && <ImageIcon className="h-8 w-8 text-green-500" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                    clearMessages()
                  }}
                  className="text-xs"
                  disabled={isImporting}
                >
                  Choose Different File
                </Button>
              </div>
            ) : (
              /* Drop Zone */
              <div className="space-y-2">
                <Upload className={cn(
                  "h-8 w-8 mx-auto",
                  isDragOver ? "text-blue-500" : "text-gray-400"
                )} />
                <div>
                  <p className="text-sm text-gray-600">
                    {isDragOver ? 'Drop file here' : 'Drag & drop a media file here'}
                  </p>
                  <p className="text-xs text-gray-500">
                    or click to browse your files
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  Supports: PNG, JPG, WebP, GIF, MP4, WebM (max 10MB images, 50MB videos)
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Button */}
      <div className="flex gap-2">
        <Button
          onClick={handleImport}
          disabled={!canImport || isImporting}
          className="flex-1"
          size="sm"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {progressMessage || 'Processing...'}
              {importProgress > 0 && ` (${importProgress}%)`}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Import {mode === 'url' ? 'from URL' : 'File'}
            </>
          )}
        </Button>
        
        {isImporting && (
          <Button
            onClick={cancelImport}
            variant="outline"
            size="sm"
            className="px-3"
            title="Cancel import"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {isImporting && importProgress > 0 && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 text-center">{progressMessage}</p>
        </div>
      )}

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
          <h4 className="text-xs font-medium text-gray-700">Import Options</h4>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="use-color-limit"
              checked={useColorLimit}
              onChange={(e) => setUseColorLimit(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="use-color-limit" className="text-xs text-gray-700">
              Limit colors to {colorCount} colors
            </label>
          </div>
          
          {useColorLimit && (
            <div className="ml-6 space-y-1">
              <label htmlFor="color-count" className="text-xs text-gray-600">
                Color Count: {colorCount}
              </label>
              <input
                id="color-count"
                type="range"
                min="4"
                max="64"
                step="4"
                value={colorCount}
                onChange={(e) => setColorCount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg slider"
              />
            </div>
          )}
          
          <div className="space-y-1">
            {/* Dynamic frame limits based on media type */}
            {(() => {
              const currentMediaType = mode === 'url' 
                ? (url ? getMediaTypeFromUrl(url) : null)
                : (selectedFile ? getMediaTypeFromFile(selectedFile) : null)
              
              const isVideo = currentMediaType === 'video'
              const currentLimit = isVideo ? videoFrameLimit : gifFrameLimit
              const limitType = isVideo ? 'Videos' : 'GIFs'
              
              return (
                <>
                  <label htmlFor="max-frames" className="text-xs text-gray-600 flex items-center gap-2">
                    Max Frames for {limitType}: {maxFrames}
                    {isVideo && (
                      <span className="text-orange-600 font-medium">
                        (Video: {videoFrameLimit} max)
                      </span>
                    )}
                  </label>
                  <input
                    id="max-frames"
                    type="range"
                    min="5"
                    max={currentLimit}
                    step="5"
                    value={Math.min(maxFrames, currentLimit)}
                    onChange={(e) => setMaxFrames(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg slider"
                  />
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Higher values = more frames but slower processing</div>
                    <div className="flex items-center gap-2 text-orange-600">
                      <span className="font-medium">Current tier ({userTier}):</span>
                      <span>Videos max {videoFrameLimit}, GIFs max {gifFrameLimit} frames</span>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p className="flex items-center gap-1">
          <FileImage className="h-3 w-3" />
          {mode === 'url' 
            ? 'Supports URLs to images (PNG, JPG, WebP), animated GIFs, and videos (MP4, WebM)'
            : 'Supports local files: images (PNG, JPG, WebP), animated GIFs, and videos (MP4, WebM)'
          }
        </p>
        <p className="flex items-center gap-1">
          <Film className="h-3 w-3" />
          <span className="font-medium text-green-600">Enhanced Multi-Frame Support:</span>
          GIFs up to {gifFrameLimit} frames, Videos up to {videoFrameLimit} frames (first 1 sec)
        </p>
        <p className="flex items-center gap-1 text-orange-600">
          <span className="font-medium">⚡ {userTier.toUpperCase()} tier limits:</span>
          Video imports limited to first {videoFrameLimit} frames for optimal performance
        </p>
        <p className="flex items-center gap-1">
          {mode === 'url' ? (
            <ExternalLink className="h-3 w-3" />
          ) : (
            <HardDrive className="h-3 w-3" />
          )}
          Media will be automatically resized to {project.width}×{project.height}px and converted to pixel art
        </p>
        {mode === 'file' && (
          <p className="flex items-center gap-1">
            <Upload className="h-3 w-3" />
            File size limits: 10MB for images, 50MB for videos
          </p>
        )}
      </div>

      {/* Frame Import Options Modal */}
      <FrameImportOptionsModal
        open={showImportOptionsModal}
        onOpenChange={setShowImportOptionsModal}
        onSelectOption={handleImportOptionSelected}
        mediaType={pendingImportData?.mediaType || 'image'}
        frameCount={pendingImportData?.result?.frames?.length || 0}
        existingFrameCount={activeTab?.frames?.length || 0}
        originalDimensions={pendingImportData?.result?.originalDimensions || { width: 64, height: 64 }}
        targetDimensions={{ width: activeTab?.project.width || 64, height: activeTab?.project.height || 64 }}
      />
    </div>
  )
}