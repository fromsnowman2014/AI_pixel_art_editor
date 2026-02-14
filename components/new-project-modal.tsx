'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  X,
  Zap,
  Settings,
  Monitor,
  ArrowRight,
  Palette
} from 'lucide-react'

interface NewProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (options?: { width?: number; height?: number; colorLimit?: number }) => void
}

const QUICK_SIZES = [
  { label: '32×32', width: 32, height: 32, emoji: '🎮', desc: 'Game icons' },
  { label: '64×64', width: 64, height: 64, emoji: '🎨', desc: 'Detailed art' },
  { label: '128×128', width: 128, height: 128, emoji: '🖼️', desc: 'Large canvas' },
]

export function NewProjectModal({ open, onOpenChange, onCreateProject }: NewProjectModalProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customWidth, setCustomWidth] = useState(64)
  const [customHeight, setCustomHeight] = useState(64)

  const handleQuickCreate = (size: typeof QUICK_SIZES[0]) => {
    // Quick create
    onCreateProject({ width: size.width, height: size.height })
    handleClose()
  }

  const handleCustomCreate = () => {
    // Custom create
    if (customWidth > 0 && customHeight > 0) {
      onCreateProject({ width: customWidth, height: customHeight })
      handleClose()
    }
  }

  const handleClose = () => {
    // Modal closing
    setShowCustom(false)
    setCustomWidth(64)
    setCustomHeight(64)
    onOpenChange(false)
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Background clicked
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  // Don't render modal if not open
  if (!open) {
    // Modal not rendering
    return null
  }

  // Modal rendering

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackgroundClick}
    >
      <div 
        className="max-w-md w-full mx-4 bg-white rounded-lg shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => {
          // Modal content clicked
          e.stopPropagation()
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Palette className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">New Project</h2>
              <p className="text-xs text-gray-500">Choose your canvas size</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              // X button clicked
              e.stopPropagation()
              handleClose()
            }} 
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {!showCustom ? (
            <>
              {/* Quick Sizes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Quick Start</span>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_SIZES.map((size, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        // Quick size selected
                        e.stopPropagation()
                        handleQuickCreate(size)
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                    >
                      <span className="text-xl">{size.emoji}</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{size.label}</div>
                        <div className="text-xs text-gray-500">{size.desc}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Option */}
              <div className="pt-3 border-t">
                <button
                  onClick={() => setShowCustom(true)}
                  className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Settings className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Custom size...</span>
                </button>
              </div>
            </>
          ) : (
            /* Custom Size Form */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Custom Size</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Width</label>
                  <input
                    type="number"
                    min="8"
                    max="3840"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseInt(e.target.value) || 64)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Height</label>
                  <input
                    type="number"
                    min="8"
                    max="2160"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseInt(e.target.value) || 64)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                Size: {customWidth}×{customHeight} pixels
                {(customWidth > 512 || customHeight > 512) && (
                  <span className="text-orange-600 ml-2">⚠️ Large canvases may be slower</span>
                )}
                {(customWidth > 1920 || customHeight > 1080) && (
                  <span className="text-red-600 ml-2">⚠️ Very large canvas - performance may be impacted</span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustom(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCustomCreate}
                  disabled={customWidth < 8 || customHeight < 8 || customWidth > 3840 || customHeight > 2160}
                  size="sm"
                  className="flex-1"
                >
                  Create
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}