'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X, Plus, RotateCcw, AlertCircle, Layers, FileImage, Film, Square, MousePointer, Hash, Crop } from 'lucide-react'
import type { ScalingMode } from '@/lib/utils/enhanced-media-importer'

interface FrameImportOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectOption: (option: 'add' | 'replace', scalingMode: ScalingMode) => void
  mediaType: 'image' | 'gif' | 'video'
  frameCount: number
  existingFrameCount: number
  originalDimensions: { width: number; height: number }
  targetDimensions: { width: number; height: number }
}

export function FrameImportOptionsModal({ 
  open, 
  onOpenChange, 
  onSelectOption,
  mediaType,
  frameCount,
  existingFrameCount,
  originalDimensions,
  targetDimensions
}: FrameImportOptionsModalProps) {
  
  const [selectedScalingMode, setSelectedScalingMode] = React.useState<ScalingMode>('fit')
  
  if (!open) return null

  const mediaIcon = mediaType === 'gif' || mediaType === 'video' ? Film : FileImage
  const MediaIcon = mediaIcon

  // Calculate scaling results for preview
  const calculateScalingResult = (mode: ScalingMode) => {
    const { width: originalWidth, height: originalHeight } = originalDimensions
    const { width: targetWidth, height: targetHeight } = targetDimensions

    switch (mode) {
      case 'fit': {
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const scale = Math.min(scaleX, scaleY)
        return {
          width: Math.round(originalWidth * scale),
          height: Math.round(originalHeight * scale),
          description: 'Preserve aspect ratio with transparent borders',
          icon: Square,
          color: 'blue',
          recommendation: originalWidth !== targetWidth || originalHeight !== targetHeight ? 'Recommended for most cases' : null
        }
      }
      case 'fill': {
        return {
          width: targetWidth,
          height: targetHeight,
          description: 'Fill entire canvas, may crop image edges',
          icon: Crop,
          color: 'orange',
          recommendation: Math.abs((originalWidth/originalHeight) - (targetWidth/targetHeight)) > 0.1 ? 'May crop significant content' : null
        }
      }
      case 'original': {
        if (originalWidth <= targetWidth && originalHeight <= targetHeight) {
          return {
            width: originalWidth,
            height: originalHeight,
            description: 'Keep original size, center on canvas',
            icon: MousePointer,
            color: 'green',
            recommendation: 'Perfect for preserving exact pixel detail'
          }
        } else {
          const scaleX = targetWidth / originalWidth
          const scaleY = targetHeight / originalHeight
          const scale = Math.min(scaleX, scaleY)
          return {
            width: Math.round(originalWidth * scale),
            height: Math.round(originalHeight * scale),
            description: 'Original size (auto-scaled if too large)',
            icon: MousePointer,
            color: 'green',
            recommendation: null
          }
        }
      }
      case 'smart': {
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const minScale = Math.min(scaleX, scaleY)
        const integerScale = Math.floor(minScale)
        
        if (integerScale >= 1) {
          return {
            width: originalWidth * integerScale,
            height: originalHeight * integerScale,
            description: `Integer scaling (${integerScale}×) for crisp pixel art`,
            icon: Hash,
            color: 'purple',
            recommendation: 'Best for pixel art and low-res graphics'
          }
        } else {
          return {
            width: Math.round(originalWidth * minScale),
            height: Math.round(originalHeight * minScale),
            description: 'Smart scaling (no integer scale possible)',
            icon: Hash,
            color: 'purple',
            recommendation: null
          }
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MediaIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Import Settings</h2>
              <p className="text-sm text-gray-500">Configure how your {mediaType} should be imported</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {/* Media Info Card - Redesigned */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MediaIcon className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Import Summary</h3>
                  <p className="text-xs text-gray-600">{originalDimensions.width}×{originalDimensions.height} → {targetDimensions.width}×{targetDimensions.height}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-700">{frameCount}</div>
                <div className="text-xs text-blue-600 uppercase tracking-wide">{frameCount === 1 ? 'Frame' : 'Frames'}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-900 capitalize">{mediaType}</div>
                <div className="text-xs text-gray-600">Media Type</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-sm font-semibold text-blue-600">{frameCount}</div>
                <div className="text-xs text-gray-600">New Frames</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-sm font-semibold text-orange-600">{existingFrameCount}</div>
                <div className="text-xs text-gray-600">Current Frames</div>
              </div>
            </div>
          </div>

          {/* Scaling Options - Professional Redesign */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Scaling Mode</h3>
              <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {originalDimensions.width}×{originalDimensions.height} → {targetDimensions.width}×{targetDimensions.height}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {(['fit', 'fill', 'original', 'smart'] as ScalingMode[]).map((mode) => {
                const result = calculateScalingResult(mode)
                const Icon = result.icon
                const isSelected = selectedScalingMode === mode
                const colorClassesMap = {
                  blue: {
                    border: isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300',
                    icon: 'text-blue-600',
                    result: 'text-blue-600',
                    badge: 'bg-blue-100 text-blue-700'
                  },
                  orange: {
                    border: isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-300',
                    icon: 'text-orange-600',
                    result: 'text-orange-600',
                    badge: 'bg-orange-100 text-orange-700'
                  },
                  green: {
                    border: isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300',
                    icon: 'text-green-600',
                    result: 'text-green-600',
                    badge: 'bg-green-100 text-green-700'
                  },
                  purple: {
                    border: isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-300',
                    icon: 'text-purple-600',
                    result: 'text-purple-600',
                    badge: 'bg-purple-100 text-purple-700'
                  }
                } as const
                
                const colorClasses = colorClassesMap[result.color as keyof typeof colorClassesMap] || colorClassesMap.blue
                
                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedScalingMode(mode)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-[1.02]",
                      colorClasses.border,
                      isSelected && "ring-2 ring-offset-2 ring-current ring-opacity-20"
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-5 w-5", colorClasses.icon)} />
                        <span className="font-semibold text-gray-900 text-sm capitalize">
                          {mode === 'fit' ? 'Fit' : mode === 'fill' ? 'Fill' : mode === 'original' ? 'Original' : 'Smart'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {result.description}
                        </p>
                        
                        <div className={cn("text-xs font-medium", colorClasses.result)}>
                          {result.width}×{result.height}
                        </div>
                        
                        {result.recommendation && (
                          <div className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            colorClasses.badge
                          )}>
                            {result.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-current text-white rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Frame Import Options - Enhanced UX */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Import Strategy</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Add to existing option - Enhanced */}
              <button
                onClick={() => onSelectOption('add', selectedScalingMode)}
                className={cn(
                  "group relative w-full p-5 rounded-xl border-2 text-left transition-all duration-200",
                  "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 hover:shadow-md transform hover:scale-[1.01]"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <Plus className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-2 text-base">Add to Project</div>
                    <div className="text-sm text-gray-600 mb-3 leading-relaxed">
                      Keep your current {existingFrameCount} frame{existingFrameCount !== 1 ? 's' : ''} and append {frameCount} new frame{frameCount !== 1 ? 's' : ''} to the timeline.
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-green-700 bg-green-100 px-3 py-1 rounded-full font-semibold">
                        {existingFrameCount + frameCount} total frames
                      </div>
                      <div className="text-xs text-gray-500">
                        • Safe • Preserves work
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Replace all option - Enhanced with warning styling */}
              <button
                onClick={() => onSelectOption('replace', selectedScalingMode)}
                className={cn(
                  "group relative w-full p-5 rounded-xl border-2 text-left transition-all duration-200",
                  "border-red-200 bg-red-50/30 hover:border-red-400 hover:bg-red-50 hover:shadow-md transform hover:scale-[1.01]"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <RotateCcw className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-2 text-base flex items-center gap-2">
                      Replace All Frames
                      {existingFrameCount > 0 && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-3 leading-relaxed">
                      Remove all {existingFrameCount} current frame{existingFrameCount !== 1 ? 's' : ''} and replace with {frameCount} new frame{frameCount !== 1 ? 's' : ''}.
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-red-700 bg-red-100 px-3 py-1 rounded-full font-semibold">
                        {frameCount} total frames
                      </div>
                      <div className="text-xs text-red-600">
                        • Destructive • Work will be lost
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Enhanced Warning for replace option */}
          {existingFrameCount > 0 && (
            <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-amber-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-amber-900 mb-2">Important Notice</div>
                  <div className="text-sm text-amber-800 leading-relaxed">
                    Choosing "Replace All Frames" will permanently delete your current {existingFrameCount} frame{existingFrameCount !== 1 ? 's' : ''}. 
                    <span className="font-medium">This action cannot be undone.</span>
                  </div>
                  <div className="mt-3 text-xs text-amber-700 bg-amber-100 px-3 py-2 rounded-lg">
                    💡 <strong>Tip:</strong> Use "Add to Project" to safely preserve your existing work
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Project Status - Redesigned */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-gray-200 rounded">
                <Layers className="h-4 w-4 text-gray-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Project Status</span>
            </div>
            <div className="text-sm text-gray-600">
              {existingFrameCount === 0 ? (
                "This is a new project with no existing frames."
              ) : existingFrameCount === 1 ? (
                "Your project has 1 frame. Adding frames will create an animation."
              ) : (
                `Your project contains ${existingFrameCount} frames in the animation timeline.`
              )}
            </div>
          </div>
        </div>

        {/* Footer - Enhanced */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-xl flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Using <span className="font-medium text-gray-700 capitalize">{selectedScalingMode}</span> scaling mode
          </div>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-white hover:bg-gray-50 border-gray-300"
          >
            Cancel Import
          </Button>
        </div>
      </div>
    </div>
  )
}