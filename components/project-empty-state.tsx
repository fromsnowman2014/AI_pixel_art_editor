'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  Palette, 
  Sparkles, 
  Layers, 
  Zap,
  ArrowRight,
  Settings,
  ChevronDown,
  Monitor
} from 'lucide-react'

interface ProjectEmptyStateProps {
  onCreateProject: (options?: { width?: number; height?: number; colorLimit?: number }) => void
  className?: string
}

const QUICK_PRESETS = [
  { name: 'Square Small', width: 32, height: 32, icon: '🎮', desc: 'Game icons, tiny art' },
  { name: 'Square Medium', width: 64, height: 64, icon: '🎨', desc: 'Detailed sprites' },
  { name: 'Landscape', width: 128, height: 64, icon: '🏞️', desc: 'Backgrounds, scenes' },
  { name: 'Portrait', width: 64, height: 128, icon: '👤', desc: 'Characters, tall art' },
]

const CANVAS_SIZES = [
  { label: '16×16', width: 16, height: 16 },
  { label: '32×32', width: 32, height: 32 },
  { label: '64×64', width: 64, height: 64 },
  { label: '128×128', width: 128, height: 128 },
  { label: '256×256', width: 256, height: 256 },
  { label: 'Custom', width: 0, height: 0 },
]

export function ProjectEmptyState({ onCreateProject, className }: ProjectEmptyStateProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customWidth, setCustomWidth] = useState(128)
  const [customHeight, setCustomHeight] = useState(128)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)

  const handlePresetClick = (preset: typeof QUICK_PRESETS[0]) => {
    console.log('🎨 [ProjectEmptyState] Preset clicked:', preset)
    try {
      onCreateProject({ width: preset.width, height: preset.height })
      console.log('✅ [ProjectEmptyState] onCreateProject called successfully')
    } catch (error) {
      console.error('❌ [ProjectEmptyState] Error calling onCreateProject:', error)
    }
  }

  const handleSizeClick = (size: typeof CANVAS_SIZES[0]) => {
    console.log('🖥️ [ProjectEmptyState] Canvas size clicked:', size)
    
    if (size.width === 0) {
      // Custom size - show advanced options
      console.log('🔧 [ProjectEmptyState] Opening custom size options')
      setShowAdvanced(true)
      return
    }
    
    try {
      console.log('🚀 [ProjectEmptyState] Creating project with size:', size.width, 'x', size.height)
      onCreateProject({ width: size.width, height: size.height })
      console.log('✅ [ProjectEmptyState] onCreateProject called successfully')
    } catch (error) {
      console.error('❌ [ProjectEmptyState] Error calling onCreateProject:', error)
    }
  }

  const handleCustomCreate = () => {
    if (customWidth > 0 && customHeight > 0) {
      onCreateProject({ width: customWidth, height: customHeight })
    }
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-gradient-to-br from-blue-50 to-purple-50',
      className
    )}>
      {/* Welcome Header */}
      <div className="max-w-2xl space-y-4 mb-8">
        <div className="relative">
          <Sparkles className="h-16 w-16 mx-auto text-blue-500 animate-pulse" />
          <div className="absolute -top-2 -right-2">
            <Palette className="h-8 w-8 text-purple-500 animate-bounce" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to PixelBuddy! 🎨
        </h1>
        
        <p className="text-gray-600 text-lg leading-relaxed">
          Create amazing pixel art with AI assistance. Choose a canvas size to start your creative journey!
        </p>
      </div>

      {/* Quick Start Options */}
      <div className="w-full max-w-4xl space-y-6">
        {/* Quick Presets */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center justify-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Quick Start
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_PRESETS.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                className={cn(
                  "h-auto p-4 flex-col space-y-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200",
                  selectedPreset === index && "bg-blue-50 border-blue-300"
                )}
                onClick={() => {
                  setSelectedPreset(index)
                  handlePresetClick(preset)
                }}
              >
                <div className="text-2xl">{preset.icon}</div>
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-gray-500">{preset.width}×{preset.height}</div>
                <div className="text-xs text-gray-400 text-center">{preset.desc}</div>
              </Button>
            ))}
          </div>
        </div>

        {/* Canvas Size Options */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center justify-center gap-2">
            <Monitor className="h-5 w-5 text-blue-500" />
            Choose Canvas Size
          </h2>
          
          <div className="flex flex-wrap justify-center gap-2">
            {CANVAS_SIZES.map((size, index) => (
              <Button
                key={index}
                variant={size.width === 0 ? "default" : "outline"}
                size="sm"
                className={cn(
                  "transition-all duration-200",
                  size.width === 0 
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600" 
                    : "hover:bg-blue-50 hover:border-blue-300"
                )}
                onClick={() => handleSizeClick(size)}
              >
                {size.label}
                {size.width === 0 && <Settings className="h-3 w-3 ml-1" />}
              </Button>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="bg-white rounded-lg border p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-600" />
                Custom Canvas Size
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(false)}
              >
                <ChevronDown className="h-4 w-4 rotate-180" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="custom-width" className="text-sm font-medium text-gray-700">
                  Width (pixels)
                </label>
                <input
                  id="custom-width"
                  type="number"
                  min="8"
                  max="512"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 128)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="custom-height" className="text-sm font-medium text-gray-700">
                  Height (pixels)
                </label>
                <input
                  id="custom-height"
                  type="number"
                  min="8"
                  max="512"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 128)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
              <strong>Tip:</strong> Larger canvases require more processing power. 
              Start with smaller sizes (32×32 or 64×64) for faster performance.
            </div>
            
            <Button
              onClick={handleCustomCreate}
              disabled={customWidth < 8 || customHeight < 8 || customWidth > 512 || customHeight > 512}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              Create {customWidth}×{customHeight} Canvas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Footer Tips */}
      <div className="mt-8 max-w-2xl">
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <Layers className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
            <div>
              <strong className="text-gray-800">Pro Tips:</strong> 
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Start small and scale up - it's easier to add detail later</li>
                <li>• Use the AI assistant to generate base images and refine manually</li>
                <li>• Try different canvas ratios for different art styles</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}