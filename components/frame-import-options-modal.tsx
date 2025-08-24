'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X, Plus, AlertCircle, FileImage, Film, Square, MousePointer, Hash, Crop, ArrowUp, Target, Zap, CheckCircle2, Settings2, HelpCircle } from 'lucide-react'
import { 
  analyzeSizeRelationship, 
  getAvailableScalingModes,
  type ScalingMode,
  type ExtendedScalingMode,
  type SizeAnalysis,
  type ScalingModeConfig
} from '@/lib/utils/enhanced-media-importer'

interface FrameImportOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectOption: (option: 'add' | 'replace', scalingMode: ScalingMode | ExtendedScalingMode) => void
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
  
  // Analyze size relationship and get intelligent recommendations
  const sizeAnalysis = React.useMemo(() => 
    analyzeSizeRelationship(originalDimensions, targetDimensions), 
    [originalDimensions, targetDimensions]
  )
  
  const availableScalingModes = React.useMemo(() => 
    getAvailableScalingModes(sizeAnalysis), 
    [sizeAnalysis]
  )
  
  const [selectedScalingMode, setSelectedScalingMode] = React.useState<ExtendedScalingMode>(() => 
    sizeAnalysis.recommendation
  )
  
  const [importAction, setImportAction] = React.useState<'add' | 'replace'>('add')
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [hoveredMode, setHoveredMode] = React.useState<string | null>(null)
  
  // Quick preset options
  const quickPresets = React.useMemo(() => [
    {
      id: 'smart-add',
      label: 'Smart Import (Recommended)',
      description: 'Add frames with intelligent scaling',
      action: 'add' as const,
      scalingMode: sizeAnalysis.recommendation,
      icon: CheckCircle2,
      recommended: true
    },
    {
      id: 'safe-add',
      label: 'Safe Add',
      description: 'Preserve existing work, add new frames',
      action: 'add' as const,
      scalingMode: 'fit' as ExtendedScalingMode,
      icon: Plus,
      recommended: false
    }
  ], [sizeAnalysis.recommendation])
  
  if (!open) return null

  const mediaIcon = mediaType === 'gif' || mediaType === 'video' ? Film : FileImage
  const MediaIcon = mediaIcon
  
  // Tooltip component for compact descriptions
  const Tooltip = ({ children, content, side = 'top' }: { children: React.ReactNode, content: string, side?: 'top' | 'bottom' }) => (
    <div className="group relative">
      {children}
      <div className={cn(
        "absolute z-10 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        "px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap",
        "pointer-events-none",
        side === 'top' ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : "top-full mt-2 left-1/2 -translate-x-1/2"
      )}>
        {content}
        <div className={cn(
          "absolute w-2 h-2 bg-gray-900 rotate-45",
          side === 'top' ? "top-full left-1/2 -translate-x-1/2 -mt-1" : "bottom-full left-1/2 -translate-x-1/2 -mb-1"
        )} />
      </div>
    </div>
  )

  // Enhanced scaling result calculation with extended mode support
  const calculateScalingResult = (mode: ExtendedScalingMode) => {
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
      
      // Extended modes for small-to-large scenarios
      case 'fit-upscale': {
        const scaleX = targetWidth / originalWidth
        const scaleY = targetHeight / originalHeight
        const scale = Math.min(scaleX, scaleY)
        return {
          width: Math.round(originalWidth * scale),
          height: Math.round(originalHeight * scale),
          description: 'Scale up proportionally to fit canvas',
          icon: ArrowUp,
          color: 'teal',
          recommendation: sizeAnalysis.recommendation === 'fit-upscale' ? `${Math.round(scale)}× upscaling` : null
        }
      }
      
      case 'smart-upscale': {
        const optimalScale = sizeAnalysis.optimalIntegerScale || 2
        return {
          width: originalWidth * optimalScale,
          height: originalHeight * optimalScale,
          description: `Perfect ${optimalScale}× integer scaling for crisp pixels`,
          icon: Zap,
          color: 'pink',
          recommendation: sizeAnalysis.recommendation === 'smart-upscale' ? 'Pixel-perfect quality' : null
        }
      }
      
      case 'original-center': {
        return {
          width: originalWidth,
          height: originalHeight,
          description: 'Keep original size, center on canvas',
          icon: Target,
          color: 'green',
          recommendation: originalWidth < targetWidth && originalHeight < targetHeight ? 'Shows exact original size' : null
        }
      }
      
      default: {
        // Fallback for unknown modes
        return {
          width: originalWidth,
          height: originalHeight,
          description: 'Unknown scaling mode',
          icon: Square,
          color: 'blue' as const,
          recommendation: null
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* Compact Header */}
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <MediaIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import {frameCount} Frame{frameCount !== 1 ? 's' : ''}</h2>
              <p className="text-xs text-gray-500">{originalDimensions.width}×{originalDimensions.height} → {targetDimensions.width}×{targetDimensions.height}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Presets - New compact section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Quick Import
              <Tooltip content="One-click import with smart defaults" side="top">
                <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
              </Tooltip>
            </h3>
            
            <div className="grid gap-2">
              {quickPresets.map((preset) => {
                const Icon = preset.icon
                const result = calculateScalingResult(preset.scalingMode)
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelectOption(preset.action, preset.scalingMode)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all hover:shadow-md",
                      preset.recommended 
                        ? "border-green-200 bg-green-50 hover:border-green-300" 
                        : "border-gray-200 bg-white hover:border-blue-300"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg", 
                      preset.recommended ? "bg-green-100" : "bg-blue-100"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4", 
                        preset.recommended ? "text-green-600" : "text-blue-600"
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{preset.label}</span>
                        {preset.recommended && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            ⭐ Best
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {existingFrameCount + (preset.action === 'add' ? frameCount : 0)} total frames • {result.width}×{result.height}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Advanced Options - Collapsible */}
          <div className="space-y-3">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-sm font-semibold text-gray-900 hover:text-gray-700"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Advanced Options
              </span>
              <div className={cn("transition-transform", showAdvanced && "rotate-180")}>
                <ArrowUp className="h-3 w-3" />
              </div>
            </button>
            
            {showAdvanced && (
              <div className="space-y-4 pl-6 border-l-2 border-gray-100">
                {/* Compact scaling options */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Scaling Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableScalingModes.slice(0, 4).map((modeConfig) => {
                      const result = calculateScalingResult(modeConfig.mode)
                      const Icon = result.icon
                      const isSelected = selectedScalingMode === modeConfig.mode
                      
                      return (
                        <Tooltip key={modeConfig.mode} content={result.description} side="top">
                          <button
                            onClick={() => setSelectedScalingMode(modeConfig.mode)}
                            className={cn(
                              "p-2 rounded-lg border text-center transition-all text-xs",
                              isSelected 
                                ? "border-blue-500 bg-blue-50 text-blue-700" 
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <Icon className="h-3 w-3 mx-auto mb-1" />
                            <div className="font-medium">{modeConfig.displayName}</div>
                            <div className="text-xs opacity-75">{result.width}×{result.height}</div>
                          </button>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
                
                {/* Import strategy checkboxes */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Import Strategy</label>
                  <div className="space-y-2">
                    {(['add', 'replace'] as const).map((action) => (
                      <label key={action} className="flex items-start gap-3 cursor-pointer">
                        <input 
                          type="radio" 
                          name="importAction" 
                          value={action}
                          checked={importAction === action}
                          onChange={(e) => setImportAction(e.target.value as 'add' | 'replace')}
                          className="mt-0.5 w-3 h-3 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {action === 'add' ? 'Add to Project' : 'Replace All Frames'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {action === 'add' 
                              ? `Keep ${existingFrameCount} + add ${frameCount} frames` 
                              : `Replace ${existingFrameCount} with ${frameCount} frames`
                            }
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => onSelectOption(importAction, selectedScalingMode)}
                    className="flex-1"
                    size="sm"
                  >
                    Import Frames
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Warning only if replace is selected */}
          {importAction === 'replace' && existingFrameCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <span className="font-medium">Warning:</span> This will permanently delete your {existingFrameCount} existing frame{existingFrameCount !== 1 ? 's' : ''}.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}