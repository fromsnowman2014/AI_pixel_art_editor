'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useProjectStore } from '@/lib/stores/project-store'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { Cloud, Loader2, FolderOpen, X, Trash2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SavedProject {
  id: string
  name: string
  thumbnailData?: string
  createdAt: string
  updatedAt: string
}

export function LoadProjectModal({ open, onOpenChange }: LoadProjectModalProps) {
  const { user, isAuthenticated, login } = useAuthStore()
  const { loadProject } = useProjectStore()
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false)
    }
  }

  const fetchProjects = async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/saved-projects/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch projects')
      }

      const result = await response.json()
      setProjects(result.projects || [])
    } catch (error) {
      console.error('Fetch projects error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch projects')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadProject = async (projectId: string, projectName: string) => {
    setLoadingProjectId(projectId)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/saved-projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load project')
      }

      const projectData = await response.json()
      
      // Load project into the store
      loadProject(projectData)
      
      toast.success(`Project "${projectName}" loaded successfully!`)
      onOpenChange(false)
    } catch (error) {
      console.error('Load project error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load project')
    } finally {
      setLoadingProjectId(null)
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingProjectId(projectId)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/saved-projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete project')
      }

      const result = await response.json()
      toast.success(result.message || 'Project deleted successfully')
      
      // Refetch projects after deletion
      fetchProjects()
    } catch (error) {
      console.error('Delete project error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete project')
    } finally {
      setDeletingProjectId(null)
    }
  }

  const getAuthToken = async (): Promise<string> => {
    // For now, return a mock token - this would be replaced with actual NextAuth session token
    return 'mock-jwt-token'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Fetch projects when modal opens
  useEffect(() => {
    if (open && isAuthenticated) {
      fetchProjects()
    }
  }, [open, isAuthenticated])

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
              Please sign in to access your saved projects.
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
        "relative w-full max-w-2xl max-h-[90vh] overflow-hidden",
        "bg-white rounded-xl shadow-2xl border border-gray-200",
        "transform transition-all duration-300 ease-out",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4"
      )}>
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Load Project from Cloud</h2>
                <p className="text-sm text-gray-500">Select a project to load</p>
              </div>
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
        <div className="p-6 min-h-96">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-600">Loading your projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No saved projects found</h3>
              <p className="text-gray-500 text-center">
                Create your first project and save it to see it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    {project.thumbnailData ? (
                      <img
                        src={project.thumbnailData}
                        alt={project.name}
                        className="w-full h-full object-cover"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FolderOpen className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Project Info */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleLoadProject(project.id, project.name)}
                      disabled={loadingProjectId !== null || deletingProjectId !== null}
                      className="flex-1"
                      size="sm"
                    >
                      {loadingProjectId === project.id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <FolderOpen className="w-3 h-3 mr-1" />
                          Load {project.name}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleDeleteProject(project.id, project.name)}
                      disabled={loadingProjectId !== null || deletingProjectId !== null}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label={`Delete ${project.name}`}
                    >
                      {deletingProjectId === project.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              {projects.length}/3 projects saved
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}