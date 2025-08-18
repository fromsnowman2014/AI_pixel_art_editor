'use client'

import React, { useState } from 'react'
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
  FileImage
} from 'lucide-react'

interface MediaImportProps {
  className?: string
}

export function MediaImport({ className }: MediaImportProps) {
  const { activeTabId, getActiveTab, addFrameWithData } = useProjectStore()
  const [url, setUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Advanced options
  const [colorCount, setColorCount] = useState(16)
  const [useColorLimit, setUseColorLimit] = useState(false)

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

  const handleImport = async () => {
    clearMessages()

    if (!url.trim()) {
      setError('Please enter a valid URL')
      return
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid HTTP or HTTPS URL')
      return
    }

    setIsImporting(true)

    try {
      // Validate URL accessibility first
      const isAccessible = await MediaImporter.validateUrl(url)
      if (!isAccessible) {
        throw new Error('URL is not accessible or does not contain valid media')
      }

      const options: MediaImportOptions = {
        width: project.width,
        height: project.height,
        colorCount: useColorLimit ? colorCount : undefined,
        maxFrames: 10 // Limit for performance
      }

      const result = await MediaImporter.importFromUrl(url, options)
      
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
      setUrl('') // Clear URL on success

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Import failed: ${errorMessage}`)
    } finally {
      setIsImporting(false)
    }
  }

  const mediaType = url ? getMediaTypeFromUrl(url) : null
  const isValidUrl = url && validateUrl(url)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Import External Media</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs"
        >
          {showAdvanced ? 'Simple' : 'Advanced'}
        </Button>
      </div>

      {/* URL Input */}
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
          
          <Button
            onClick={handleImport}
            disabled={!isValidUrl || isImporting}
            size="sm"
            className="px-3"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

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
          Supports images (PNG, JPG, WebP), GIFs, and videos (MP4, WebM)
        </p>
        <p className="flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Media will be automatically resized to {project.width}×{project.height}px
        </p>
      </div>
    </div>
  )
}