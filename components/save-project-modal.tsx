'use client'

import React from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { Cloud, Loader2, Save, X } from 'lucide-react'
import LZString from 'lz-string'

interface SaveProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SaveProjectModal({ open, onOpenChange }: SaveProjectModalProps) {
  const { user, isAuthenticated, login } = useAuthStore()
  const { getActiveTab } = useProjectStore()
  const [projectName, setProjectName] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  const activeTab = getActiveTab()

  React.useEffect(() => {
    if (open && activeTab) {
      setProjectName(activeTab.project?.name || 'My Pixel Art')
    }
  }, [open, activeTab])

  const handleSave = async () => {
    if (!isAuthenticated || !user || !activeTab) {
      toast.error('Please sign in to save your project')
      return
    }

    if (!projectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    if (projectName.length > 50) {
      toast.error('Project name must be 50 characters or less')
      return
    }

    setIsSaving(true)

    try {
      // Generate thumbnail
      const thumbnail = await generateThumbnail()
      
      // Prepare project data
      const projectData = {
        frames: activeTab.frames,
        canvasSettings: {
          width: activeTab.project.width,
          height: activeTab.project.height,
          zoom: activeTab.canvasState?.zoom || 200,
          colorLimit: activeTab.project.colorLimit || 16,
          palette: activeTab.project.palette || [],
        },
        activeFrameId: activeTab.currentFrame?.id || '',
      }

      // Call backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/saved-projects/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          name: projectName.trim(),
          projectData,
          thumbnailData: thumbnail,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save project')
      }

      const result = await response.json()
      toast.success(result.message || 'Project saved successfully!')
      onOpenChange(false)
      
    } catch (error) {
      console.error('Save project error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save project')
    } finally {
      setIsSaving(false)
    }
  }

  const generateThumbnail = async (): Promise<string> => {
    if (!activeTab || activeTab.frames.length === 0) {
      return ''
    }

    try {
      // Create a small canvas for thumbnail
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')

      canvas.width = 100
      canvas.height = 100

      // Use the current canvas data for thumbnail
      if (activeTab.canvasData?.data) {
        // Draw pixels to canvas with nearest-neighbor scaling
        const scaleX = 100 / activeTab.project.width
        const scaleY = 100 / activeTab.project.height
        
        ctx.imageSmoothingEnabled = false
        
        for (let y = 0; y < activeTab.project.height; y++) {
          for (let x = 0; x < activeTab.project.width; x++) {
            const pixelIndex = (y * activeTab.project.width + x) * 4
            const r = activeTab.canvasData.data[pixelIndex]
            const g = activeTab.canvasData.data[pixelIndex + 1]
            const b = activeTab.canvasData.data[pixelIndex + 2]
            const a = activeTab.canvasData.data[pixelIndex + 3]
            
            if (a && a > 0) { // If pixel has alpha > 0
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`
              ctx.fillRect(
                Math.floor(x * scaleX),
                Math.floor(y * scaleY),
                Math.ceil(scaleX),
                Math.ceil(scaleY)
              )
            }
          }
        }
      }

      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error generating thumbnail:', error)
      return ''
    }
  }

  const getAuthToken = async (): Promise<string> => {
    // For now, return a mock token - this would be replaced with actual NextAuth session token
    return 'mock-jwt-token'
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false)
    }
  }

  if (!open) return null

  if (!isAuthenticated) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={handleBackdropClick}
      >
        <div className={cn(
          "relative w-full max-w-md",
          "bg-white rounded-xl shadow-2xl border border-gray-200",
          "transform transition-all duration-300 ease-out",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4"
        )}>
          {/* Header */}
          <div className="border-b border-gray-200 p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Cloud className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Sign In Required</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-gray-600">
              Please sign in to save your projects to the cloud.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => login('google')}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className={cn(
        "relative w-full max-w-md",
        "bg-white rounded-xl shadow-2xl border border-gray-200",
        "transform transition-all duration-300 ease-out",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4"
      )}>
        {/* Header */}
        <div className="border-b border-gray-200 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Save className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Save Project to Cloud</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium mb-2">
              Project Name
            </label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              maxLength={50}
              placeholder="Enter project name..."
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500 mt-1">
              {projectName.length}/50 characters
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              💡 You can save up to 3 projects to the cloud. Your projects will be available on any device when you sign in.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !projectName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 mr-2" />
                  Save Project
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}