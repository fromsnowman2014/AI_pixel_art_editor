'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MediaImporter, MediaImportOptions } from '@/lib/utils/media-importer'
import { useProjectStore } from '@/lib/stores/project-store'
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
  HardDrive
} from 'lucide-react'

interface MediaImportProps {
  className?: string
}

type ImportMode = 'url' | 'file'

export function MediaImport({ className }: MediaImportProps) {
  const { activeTabId, getActiveTab, addFrameWithData } = useProjectStore()
  const [mode, setMode] = useState<ImportMode>('file')
  const [url, setUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Advanced options
  const [colorCount, setColorCount] = useState(16)
  const [useColorLimit, setUseColorLimit] = useState(false)

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

  const validateUrl = (inputUrl: string): boolean => {
    try {
      const urlObj = new URL(inputUrl)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }

  const getMediaTypeFromUrl = (url: string): 'image' | 'gif' | 'video' => {
    const lowerUrl = url.toLowerCase()
    if (lowerUrl.includes('.gif')) return 'gif'
    if (['.mp4', '.webm', '.mov', '.avi'].some(ext => lowerUrl.includes(ext))) return 'video'
    return 'image'
  }

  const getMediaTypeFromFile = (file: File): 'image' | 'gif' | 'video' => {
    if (file.type === 'image/gif') return 'gif'
    if (file.type.startsWith('video/')) return 'video'
    return 'image'
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

  const handleImport = async () => {
    clearMessages()

    const options: MediaImportOptions = {
      width: project.width,
      height: project.height,
      colorCount: useColorLimit ? colorCount : undefined,
      maxFrames: 10 // Limit for performance
    }

    setIsImporting(true)

    try {
      let result: any

      if (mode === 'url') {
        if (!url.trim()) {
          throw new Error('Please enter a valid URL')
        }

        if (!validateUrl(url)) {
          throw new Error('Please enter a valid HTTP or HTTPS URL')
        }

        // Validate URL accessibility first
        const isAccessible = await MediaImporter.validateUrl(url)
        if (!isAccessible) {
          throw new Error('URL is not accessible or does not contain valid media')
        }

        result = await MediaImporter.importFromUrl(url, options)
      } else {
        if (!selectedFile) {
          throw new Error('Please select a file')
        }

        result = await MediaImporter.importFromFile(selectedFile, options)
      }
      
      // Add imported frames to the project
      for (const frameData of result.frames) {
        await addFrameWithData(activeTabId, frameData.imageData, frameData.frame.delayMs)
      }

      const mediaType = result.mediaType
      const frameCount = result.frames.length
      
      setSuccess(
        `Successfully imported ${frameCount} frame${frameCount > 1 ? 's' : ''} from ${mediaType}! ` +
        `Original size: ${result.originalDimensions.width}×${result.originalDimensions.height}px`
      )
      
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

  const mediaType = mode === 'url' 
    ? (url ? getMediaTypeFromUrl(url) : null)
    : (selectedFile ? getMediaTypeFromFile(selectedFile) : null)
  
  const isValidUrl = url && validateUrl(url)
  const canImport = mode === 'url' ? isValidUrl : selectedFile
  
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
                  success && "border-green-300 focus:border-green-500 focus:ring-green-200"
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
      <Button
        onClick={handleImport}
        disabled={!canImport || isImporting}
        className="w-full"
        size="sm"
      >
        {isImporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Import {mode === 'url' ? 'from URL' : 'File'}
          </>
        )}
      </Button>

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
            ? 'Supports URLs to images (PNG, JPG, WebP), GIFs, and videos (MP4, WebM)'
            : 'Supports local files: images (PNG, JPG, WebP), GIFs, and videos (MP4, WebM)'
          }
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
    </div>
  )
}