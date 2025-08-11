'use client'

import React, { useState } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Settings,
  Download,
  Upload,
  Sparkles,
  Image,
  Layers,
  Palette,
  Grid,
  FileImage,
  Film
} from 'lucide-react'

export function ProjectPanel({ className }: { className?: string }) {
  const {
    activeTabId,
    getActiveTab,
    updateProject,
    exportProject,
    saveProject,
  } = useProjectStore()

  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  const activeTab = getActiveTab()
  const project = activeTab?.project

  if (!activeTabId || !project) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-gray-500">
        <div className="text-center">
          <Settings className="mx-auto mb-2 h-8 w-8" />
          <p>Select a project to view settings</p>
        </div>
      </div>
    )
  }

  const handleNameChange = (name: string) => {
    updateProject(activeTabId, { name })
  }

  const handleDimensionChange = (width: number, height: number) => {
    updateProject(activeTabId, { width, height })
  }

  const handleColorLimitChange = (colorLimit: number) => {
    updateProject(activeTabId, { colorLimit })
  }

  const handleModeChange = (mode: 'beginner' | 'advanced') => {
    updateProject(activeTabId, { mode })
  }

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return

    setIsGenerating(true)
    try {
      // TODO: Integrate with AI API
      console.log('Generating AI image:', aiPrompt)
      // This would call the backend AI generation endpoint
      // const result = await api.generateImage(aiPrompt, project)
      
      setTimeout(() => {
        setIsGenerating(false)
        setAiPrompt('')
      }, 3000)
    } catch (error) {
      console.error('AI generation failed:', error)
      setIsGenerating(false)
    }
  }

  const handleExport = (format: 'png' | 'gif' | 'jpg') => {
    exportProject(activeTabId, format)
  }

  const handleSave = () => {
    saveProject(activeTabId)
  }

  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800">Project Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Project Info */}
        <div className="space-y-4 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              type="text"
              value={project.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="My Pixel Art"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Width
              </label>
              <input
                type="number"
                value={project.width}
                onChange={(e) => handleDimensionChange(parseInt(e.target.value) || 32, project.height)}
                min="8"
                max="128"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Height
              </label>
              <input
                type="number"
                value={project.height}
                onChange={(e) => handleDimensionChange(project.width, parseInt(e.target.value) || 32)}
                min="8"
                max="128"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Color Limit: {project.colorLimit} colors
            </label>
            <input
              type="range"
              min="4"
              max="64"
              value={project.colorLimit}
              onChange={(e) => handleColorLimitChange(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>4</span>
              <span>64</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Mode
            </label>
            <div className="flex space-x-2">
              <Button
                variant={project.mode === 'beginner' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('beginner')}
                className="flex-1"
              >
                Beginner
              </Button>
              <Button
                variant={project.mode === 'advanced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('advanced')}
                className="flex-1"
              >
                Advanced
              </Button>
            </div>
          </div>
        </div>

        {/* AI Generation */}
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-800">AI Assistant</h3>
          </div>
          
          <div className="space-y-3">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe what you want to create... e.g., 'a cute cat pixel art', 'medieval castle', 'space ship'"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              rows={3}
              disabled={isGenerating}
            />
            
            <Button
              onClick={handleAiGenerate}
              disabled={!aiPrompt.trim() || isGenerating}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>

          <div className="mt-3 rounded-lg bg-purple-50 p-3 text-xs text-purple-700">
            🎨 <strong>AI Tips:</strong>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Be specific about style and colors</li>
              <li>Mention if you want simple or detailed</li>
              <li>Add mood keywords like "happy", "dark", "cute"</li>
            </ul>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="border-t border-gray-200 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="mb-3 w-full justify-between"
          >
            Advanced Settings
            <Settings className="h-4 w-4" />
          </Button>

          {showAdvancedSettings && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <Grid className="h-4 w-4 text-gray-500" />
                <span>Grid visible</span>
                <input type="checkbox" className="ml-auto" defaultChecked />
              </div>
              
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-gray-500" />
                <span>Layer mode</span>
                <input type="checkbox" className="ml-auto" />
              </div>
              
              <div className="flex items-center space-x-2">
                <Image className="h-4 w-4 text-gray-500" />
                <span>Auto-save</span>
                <input type="checkbox" className="ml-auto" defaultChecked />
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="border-t border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">Statistics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Canvas Size:</span>
              <span>{project.width}×{project.height}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Pixels:</span>
              <span>{project.width * project.height}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Colors Used:</span>
              <span>{project.palette.length}/{project.colorLimit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Frames:</span>
              <span>{activeTab?.frames.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <Button
          onClick={handleSave}
          disabled={!activeTab?.isDirty}
          className="w-full"
          variant={activeTab?.isDirty ? 'default' : 'outline'}
        >
          <Upload className="mr-2 h-4 w-4" />
          {activeTab?.isDirty ? 'Save Project' : 'Saved'}
        </Button>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('png')}
            className="text-xs"
          >
            <FileImage className="mr-1 h-3 w-3" />
            PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('gif')}
            className="text-xs"
          >
            <Film className="mr-1 h-3 w-3" />
            GIF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('jpg')}
            className="text-xs"
          >
            <Image className="mr-1 h-3 w-3" />
            JPG
          </Button>
        </div>
      </div>
    </div>
  )
}