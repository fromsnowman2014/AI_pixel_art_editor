'use client'

import React, { useState } from 'react'
import { MediaImport } from '@/components/media-import'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X, Upload, Image as ImageIcon, FileVideo } from 'lucide-react'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className={cn(
        "relative w-full max-w-md max-h-[90vh] overflow-y-auto",
        "bg-white rounded-xl shadow-2xl border border-gray-200",
        "transform transition-all duration-300 ease-out",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4"
      )}>
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 pb-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Upload className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Import Media</h2>
                <p className="text-sm text-gray-500">Import images, GIFs, or videos as frames</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-2">
          <MediaImport className="space-y-4" onImportSuccess={onClose} />
        </div>

        {/* Footer Info */}
        <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 to-transparent p-6 pt-2 rounded-b-xl">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              <span>Images & GIFs</span>
            </div>
            <div className="flex items-center gap-1">
              <FileVideo className="h-3 w-3" />
              <span>Videos (1sec max)</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            All media will be automatically converted to pixel art frames
          </p>
        </div>
      </div>
    </div>
  )
}