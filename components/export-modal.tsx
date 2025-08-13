'use client'

import React, { useState, useEffect } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AlertCircle, Download, FileImage, Film, Image, Play, X } from 'lucide-react'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportType = 'image' | 'gif'
type ImageFormat = 'png' | 'jpg' | 'webp'

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const { activeTabId, getActiveTab, exportProject, getFrameThumbnail, saveAllFrameCanvasData } = useProjectStore()
  const [exportType, setExportType] = useState<ExportType>('image')
  const [imageFormat, setImageFormat] = useState<ImageFormat>('png')
  const [fileName, setFileName] = useState('')
  const [quality, setQuality] = useState(90)
  const [gifDuration, setGifDuration] = useState(500) // ms per frame
  const [gifLoop, setGifLoop] = useState(true) // Loop GIF
  const [isExporting, setIsExporting] = useState(false)
  const [gifPreviewUrl, setGifPreviewUrl] = useState<string | null>(null)
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0)

  const activeTab = getActiveTab()
  const project = activeTab?.project
  const frames = activeTab?.frames || []

  // Debug logging utility
  const DEBUG_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')
  const debugLog = (category: string, message: string, data?: any) => {
    if (DEBUG_MODE) {
      const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
      console.log(`[${timestamp}] 💾 ExportModal [${category}]:`, message, data || '')
    }
  }

  // Initialize filename when modal opens
  useEffect(() => {
    if (open && project) {
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_')
      setFileName(`${project.name}_${timestamp}`)
    }
  }, [open, project])

  // Animate GIF preview
  useEffect(() => {
    if (exportType === 'gif' && frames.length > 1) {
      const interval = setInterval(() => {
        setPreviewFrameIndex((prev) => (prev + 1) % frames.length)
      }, gifDuration)
      
      return () => clearInterval(interval)
    }
    
    // Return empty cleanup function for all other cases
    return () => {}
  }, [exportType, frames.length, gifDuration])

  // Reset preview frame when switching modes
  useEffect(() => {
    setPreviewFrameIndex(0)
  }, [exportType])


  const handleExport = async () => {
    if (!activeTabId || !project) return

    setIsExporting(true)
    debugLog('EXPORT_START', 'Starting export process', {
      exportType,
      imageFormat: exportType === 'image' ? imageFormat : undefined,
      fileName,
      quality: exportType === 'image' ? quality : undefined,
      gifDuration: exportType === 'gif' ? gifDuration : undefined
    })

    // CRITICAL: Save all frame canvas data before export
    debugLog('EXPORT_SAVE_FRAMES', 'Saving all frame data before export')
    saveAllFrameCanvasData(activeTabId)

    try {
      if (exportType === 'image') {
        await exportProject(activeTabId, imageFormat, {
          fileName,
          quality: imageFormat === 'jpg' ? quality : 100
        })
      } else {
        if (frames.length <= 1) {
          debugLog('EXPORT_GIF_ERROR', 'Insufficient frames for GIF creation', {
            totalFrames: frames.length,
            availableFrames: frames.map(f => f.id)
          })
          return
        }
        
        const includedFrames = frames.filter(f => f.included)
        debugLog('EXPORT_GIF_PREPARATION', 'Preparing GIF export', {
          totalFrames: frames.length,
          includedFrames: includedFrames.length,
          frameDetails: frames.map(f => ({
            id: f.id,
            included: f.included,
            delayMs: f.delayMs
          })),
          gifDuration,
          gifLoop,
          fileName
        })
        
        if (includedFrames.length === 0) {
          debugLog('EXPORT_GIF_ERROR', 'No frames included in animation', {
            totalFrames: frames.length,
            includedCount: 0
          })
          throw new Error('No frames are included in the animation')
        }
        
        await exportProject(activeTabId, 'gif', {
          fileName,
          duration: gifDuration,
          loop: gifLoop,
          frames: frames,
          includedFrames: includedFrames.length
        })
      }

      debugLog('EXPORT_SUCCESS', 'Export completed successfully')
      onOpenChange(false)
    } catch (error) {
      debugLog('EXPORT_ERROR', 'Export failed', { error })
    } finally {
      setIsExporting(false)
    }
  }

  if (!project) return null

  const canExportGif = frames.length > 1
  const fileExtension = exportType === 'image' ? imageFormat : 'gif'
  const finalFileName = `${fileName}.${fileExtension}`

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-2xl w-full mx-4 bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Export Project</h2>
            <p className="text-gray-600 text-sm">Save your pixel art as an image or animated GIF</p>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Type Selection */}
          <div className="space-y-3">
            <label className="text-base font-medium">Export Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setExportType('image')}
                className={cn(
                  "h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors",
                  exportType === 'image' 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <FileImage className="h-6 w-6" />
                <span>Static Image</span>
              </button>
              <button
                onClick={() => setExportType('gif')}
                disabled={!canExportGif}
                className={cn(
                  "h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors",
                  exportType === 'gif' 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-gray-200 hover:border-gray-300",
                  !canExportGif && "opacity-50 cursor-not-allowed"
                )}
              >
                <Film className="h-6 w-6" />
                <span>Animated GIF</span>
              </button>
            </div>
          </div>

          {/* GIF Warning */}
          {exportType === 'gif' && !canExportGif && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">
                You need at least 2 frames to create an animated GIF. Add more frames to enable GIF export.
              </p>
            </div>
          )}

          {/* Format Selection for Images */}
          {exportType === 'image' && (
            <div className="space-y-3">
              <label htmlFor="image-format" className="text-sm font-medium">Image Format</label>
              <select 
                id="image-format"
                value={imageFormat} 
                onChange={(e) => setImageFormat(e.target.value as ImageFormat)}
                className="w-full p-2 border rounded-md"
              >
                <option value="png">PNG - Lossless, supports transparency</option>
                <option value="jpg">JPG - Smaller file size</option>
                <option value="webp">WebP - Modern format, best compression</option>
              </select>
            </div>
          )}

          {/* Quality Setting for JPG */}
          {exportType === 'image' && imageFormat === 'jpg' && (
            <div className="space-y-3">
              <label htmlFor="quality" className="text-sm font-medium">Quality: {quality}%</label>
              <input
                id="quality"
                type="range"
                min="10"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* GIF Settings */}
          {exportType === 'gif' && canExportGif && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label htmlFor="gif-duration" className="text-sm font-medium">Frame Duration: {gifDuration}ms</label>
                <input
                  id="gif-duration"
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={gifDuration}
                  onChange={(e) => setGifDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">
                  Shorter duration = faster animation ({Math.round(1000 / gifDuration)} FPS)
                </div>
              </div>

              {/* GIF Loop Setting */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="gif-loop" className="text-sm font-medium">Loop Animation</label>
                  <input
                    id="gif-loop"
                    type="checkbox"
                    checked={gifLoop}
                    onChange={(e) => setGifLoop(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  {gifLoop ? 'GIF will loop continuously' : 'GIF will play once and stop'}
                </div>
              </div>

              {/* GIF Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Preview</label>
                <div className="flex items-center justify-center rounded-lg border bg-gray-50 p-4 h-32 relative overflow-hidden">
                  {(() => {
                    if (!activeTabId || frames.length <= 1) {
                      return (
                        <div className="text-center text-gray-500">
                          <Film className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Add more frames to see preview</p>
                        </div>
                      )
                    }

                    const currentFrame = frames[previewFrameIndex]
                    const thumbnail = currentFrame ? getFrameThumbnail(activeTabId, currentFrame.id) : null
                    
                    if (thumbnail) {
                      return (
                        <div className="text-center">
                          <img
                            src={thumbnail}
                            alt={`Frame ${previewFrameIndex + 1}`}
                            className="h-16 w-16 mx-auto mb-2 border border-gray-200 rounded"
                            style={{ imageRendering: 'pixelated' }}
                          />
                          <div className="text-xs text-gray-500">
                            Frame {previewFrameIndex + 1} of {frames.length} @ {Math.round(1000 / gifDuration)} FPS
                            {gifLoop && <span className="ml-2">🔄 Loop</span>}
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div className="text-center text-gray-500">
                          <div className="h-16 w-16 mx-auto mb-2 border border-gray-200 rounded bg-white flex items-center justify-center">
                            <span className="text-xs">{previewFrameIndex + 1}</span>
                          </div>
                          <div className="text-xs">
                            Frame {previewFrameIndex + 1} of {frames.length} @ {Math.round(1000 / gifDuration)} FPS
                            {gifLoop && <span className="ml-2">🔄 Loop</span>}
                          </div>
                        </div>
                      )
                    }
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* File Name */}
          <div className="space-y-3">
            <label htmlFor="filename" className="text-sm font-medium">File Name</label>
            <div className="flex gap-2">
              <input
                id="filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter filename"
                className="flex-1 p-2 border rounded-md"
              />
              <div className="flex items-center rounded-md border bg-gray-50 px-3 text-sm text-gray-600">
                .{fileExtension}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              File will be saved to your default Downloads folder
            </div>
          </div>

          {/* Export Summary */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="space-y-2 text-sm">
              <div className="font-medium">Export Summary</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-600">Type:</span>{' '}
                  {exportType === 'image' ? `${imageFormat.toUpperCase()} Image` : 'Animated GIF'}
                </div>
                <div>
                  <span className="text-gray-600">Size:</span> {project.width}×{project.height}px
                </div>
                {exportType === 'gif' && (
                  <>
                    <div>
                      <span className="text-gray-600">Frames:</span> {frames.length}
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span> {(frames.length * gifDuration / 1000).toFixed(1)}s
                    </div>
                    <div>
                      <span className="text-gray-600">Loop:</span> {gifLoop ? 'Yes' : 'No'}
                    </div>
                  </>
                )}
              </div>
              <div className="pt-2 font-medium">
                📁 {finalFileName}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={
              isExporting || 
              !fileName.trim() || 
              (exportType === 'gif' && !canExportGif)
            }
          >
            {isExporting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Exporting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export {exportType === 'image' ? 'Image' : 'GIF'}
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}