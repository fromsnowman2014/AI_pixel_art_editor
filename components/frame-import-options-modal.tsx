'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X, FileImage, Film } from 'lucide-react'
import { 
  analyzeSizeRelationship, 
  type ScalingMode,
  type ExtendedScalingMode
} from '@/lib/services/enhanced-media-importer'
import { useProjectStore } from '@/lib/stores/project-store'
import { MinimalOption } from './minimal-option'
import { ColorPreview } from './color-preview'

export interface ColorMappingOptions {
  mode: 'auto' | 'project' | 'custom' | 'preserve'
  customPalette?: string[]
  colorLimit?: number
}

interface FrameImportOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectOption: (option: 'add' | 'replace', scalingMode: ScalingMode | ExtendedScalingMode, colorMapping?: ColorMappingOptions) => void
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
  
  // Analyze size relationship and get smart defaults
  const sizeAnalysis = React.useMemo(() => 
    analyzeSizeRelationship(originalDimensions, targetDimensions), 
    [originalDimensions, targetDimensions]
  )
  
  // Get current project info
  const { getActiveTab } = useProjectStore()
  const activeTab = getActiveTab()
  const project = activeTab?.project
  
  // Smart defaults based on project state and size analysis
  const hasProjectPalette = project?.palette && project.palette.length >= 3
  const smartColorDefault = hasProjectPalette ? 'project' : 'auto'
  const smartSizeDefault = sizeAnalysis.recommendation
  
  // State management with smart defaults
  const [selectedColorMode, setSelectedColorMode] = React.useState<'auto' | 'project' | 'custom'>(smartColorDefault)
  const [selectedSizeMode, setSelectedSizeMode] = React.useState<ExtendedScalingMode>(smartSizeDefault)
  const [preserveOriginalSize, setPreserveOriginalSize] = React.useState(false)

  // Auto colors preview (8 diverse colors)
  const autoColors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']
  
  // Update defaults when project changes
  React.useEffect(() => {
    setSelectedColorMode(smartColorDefault)
  }, [smartColorDefault])
  
  React.useEffect(() => {
    setSelectedSizeMode(smartSizeDefault)
  }, [smartSizeDefault])
  
  // Helper function to create smart color mapping options
  const createColorMapping = (mode: 'auto' | 'project' | 'custom'): ColorMappingOptions => {
    switch (mode) {
      case 'auto':
        return { mode: 'auto', colorLimit: 8 }
      case 'project':
        return { mode: 'project' }
      case 'custom':
        return { 
          mode: 'custom', 
          customPalette: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'] 
        }
      default:
        return { mode: 'auto', colorLimit: 8 }
    }
  }
  
  // Smart tooltip messages based on current state
  const getSmartTooltips = () => {
    const projectTooltip = hasProjectPalette 
      ? `현재 프로젝트: ${project.palette.length}색상 - 추천!`
      : '프로젝트 팔레트가 없습니다'
      
    const sizeTooltip = {
      'smart': '품질 유지하며 캔버스에 완벽 맞춤 - 추천!',
      'smart-upscale': `${sizeAnalysis.optimalIntegerScale || 2}× 픽셀 완벽 품질`,
      'fit': '비율 유지하며 캔버스에 맞춤',
      'fit-upscale': '비율 유지하며 확대',
      'original': `원본 크기 유지 (${originalDimensions.width}×${originalDimensions.height}px)`,
      'original-center': '원본 크기로 중앙 배치',
      'fill': '캔버스 전체 채움 (일부 잘릴 수 있음)'
    }
    
    return {
      project: projectTooltip,
      smart: sizeTooltip[smartSizeDefault] || sizeTooltip.smart
    }
  }
  
  const tooltips = getSmartTooltips()
  
  // Handle import action
  const handleImport = () => {
    const colorMapping = createColorMapping(selectedColorMode)
    // If preserve original size is checked, use 'original' mode regardless of selected size mode
    const finalSizeMode = preserveOriginalSize ? 'original' : selectedSizeMode
    onSelectOption('add', finalSizeMode, colorMapping)
  }
  
  if (!open) return null

  const mediaIcon = mediaType === 'gif' || mediaType === 'video' ? Film : FileImage
  const MediaIcon = mediaIcon


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="max-w-sm w-full mx-4 bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* Minimal header - no frame count */}
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <MediaIcon className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          {/* File drop area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center bg-gray-50">
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              📁 Drop files here
            </div>
          </div>

          {/* Color options grid */}
          <div className="grid grid-cols-3 gap-2">
            <MinimalOption
              emoji="🤖"
              label="Auto"
              tooltip="AI가 이미지에서 8가지 색상 자동 추출"
              colorPreview={autoColors}
              selected={selectedColorMode === 'auto'}
              onClick={() => setSelectedColorMode('auto')}
            />
            <MinimalOption
              emoji="🎨"
              label="Project"
              tooltip={tooltips.project}
              colorPreview={project?.palette || []}
              recommended={hasProjectPalette}
              selected={selectedColorMode === 'project'}
              onClick={() => hasProjectPalette && setSelectedColorMode('project')}
              className={!hasProjectPalette ? 'opacity-50 cursor-not-allowed' : ''}
            />
            <MinimalOption
              emoji="✏️"
              label="Custom"
              tooltip="나만의 색상 팔레트 직접 선택"
              colorPreview={['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00']}
              selected={selectedColorMode === 'custom'}
              onClick={() => setSelectedColorMode('custom')}
            />
          </div>

          {/* Size options grid */}
          <div className="grid grid-cols-3 gap-2">
            <MinimalOption
              emoji="⚡"
              label="Smart"
              tooltip={tooltips.smart}
              recommended={true}
              selected={selectedSizeMode === smartSizeDefault && !preserveOriginalSize}
              onClick={() => {
                setSelectedSizeMode(smartSizeDefault)
                setPreserveOriginalSize(false)
              }}
            />
            <MinimalOption
              emoji="📐"
              label="Original"
              tooltip={`원본 크기 유지 (${originalDimensions.width}×${originalDimensions.height}px)`}
              selected={selectedSizeMode === 'original' || preserveOriginalSize}
              onClick={() => {
                setSelectedSizeMode('original')
                setPreserveOriginalSize(true)
              }}
            />
            <MinimalOption
              emoji="🔲"
              label="Fill"
              tooltip="캔버스 전체 채움 (일부 잘릴 수 있음)"
              selected={selectedSizeMode === 'fill' && !preserveOriginalSize}
              onClick={() => {
                setSelectedSizeMode('fill')
                setPreserveOriginalSize(false)
              }}
            />
          </div>

          {/* Preserve Original Size Checkbox */}
          <div className="flex items-center gap-2 px-1 py-2 rounded-lg bg-gray-50 border border-gray-200">
            <input
              type="checkbox"
              id="preserve-original-size"
              checked={preserveOriginalSize}
              onChange={(e) => {
                setPreserveOriginalSize(e.target.checked)
                if (e.target.checked) {
                  setSelectedSizeMode('original')
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
            />
            <label
              htmlFor="preserve-original-size"
              className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
              title={`Import at original size: ${originalDimensions.width}×${originalDimensions.height}px (max 4K supported)`}
            >
              <span className="mr-1">📏</span>
              Preserve Original Dimensions
              <span className="ml-1 text-xs text-gray-500">
                ({originalDimensions.width}×{originalDimensions.height}px)
              </span>
            </label>
          </div>

          {/* Import button */}
          <div className="pt-1">
            <Button
              onClick={handleImport}
              className="w-full"
              size="lg"
            >
              Import
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}