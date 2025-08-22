'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X, Plus, RotateCcw, AlertCircle, Layers, FileImage, Film } from 'lucide-react'

interface FrameImportOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectOption: (option: 'add' | 'replace') => void
  mediaType: 'image' | 'gif' | 'video'
  frameCount: number
  existingFrameCount: number
}

export function FrameImportOptionsModal({ 
  open, 
  onOpenChange, 
  onSelectOption,
  mediaType,
  frameCount,
  existingFrameCount
}: FrameImportOptionsModalProps) {
  
  if (!open) return null

  const mediaIcon = mediaType === 'gif' || mediaType === 'video' ? Film : FileImage
  const MediaIcon = mediaIcon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-md w-full mx-4 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MediaIcon className="h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold">Import Options</h2>
              <p className="text-sm text-gray-600">How should we handle existing frames?</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Media Info */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <MediaIcon className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Import Preview</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Media type: <span className="font-medium capitalize">{mediaType}</span></div>
              <div>• New frames to import: <span className="font-medium text-blue-600">{frameCount}</span></div>
              <div>• Current project frames: <span className="font-medium text-orange-600">{existingFrameCount}</span></div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Choose import strategy:</div>
            
            {/* Add to existing option */}
            <button
              onClick={() => onSelectOption('add')}
              className={cn(
                "w-full p-4 rounded-lg border-2 text-left transition-all hover:border-blue-300 hover:bg-blue-50",
                "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Plus className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">Add to Existing Frames</div>
                  <div className="text-sm text-gray-600 mb-2">
                    Keep all {existingFrameCount} current frames and add {frameCount} new frames after them.
                  </div>
                  <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                    Result: {existingFrameCount + frameCount} total frames
                  </div>
                </div>
              </div>
            </button>

            {/* Replace all option */}
            <button
              onClick={() => onSelectOption('replace')}
              className={cn(
                "w-full p-4 rounded-lg border-2 text-left transition-all hover:border-red-300 hover:bg-red-50",
                "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <RotateCcw className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">Replace All Frames</div>
                  <div className="text-sm text-gray-600 mb-2">
                    Remove all {existingFrameCount} current frames and replace with {frameCount} new frames.
                  </div>
                  <div className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                    Result: {frameCount} total frames (current work will be lost)
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Warning for replace option */}
          {existingFrameCount > 1 && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium mb-1">Data Loss Warning</div>
                <div>
                  If you choose "Replace All Frames", your current {existingFrameCount} frames will be permanently deleted. 
                  This action cannot be undone.
                </div>
              </div>
            </div>
          )}

          {/* Current Project Info */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
            <div className="flex items-center gap-1 mb-1">
              <Layers className="h-3 w-3" />
              <span className="font-medium">Current Project Status</span>
            </div>
            <div>
              Your project currently has {existingFrameCount} frame{existingFrameCount !== 1 ? 's' : ''}.
              {existingFrameCount > 1 && ' This appears to be a multi-frame animation project.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel Import
          </Button>
        </div>
      </div>
    </div>
  )
}