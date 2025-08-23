'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { PixelCanvas } from './pixel-canvas'
import { Toolbar } from './toolbar'
import { TopToolbar } from './top-toolbar'
import { ProjectTabs } from './project-tabs'
import { ColorPalette } from './color-palette'
import { FrameManager } from './frame-manager'
import { ProjectPanel } from './project-panel'
import { AppHeader } from './app-header'
import { ProjectEmptyState } from './project-empty-state'
import toast from 'react-hot-toast'

interface PixelEditorProps {
  className?: string
}

export function PixelEditor({ className }: PixelEditorProps) {
  const {
    tabs,
    activeTabId,
    getActiveTab,
    initializeApp,
    createNewProject,
    clearError,
    error,
    stopPlayback
  } = useProjectStore()

  const activeTab = getActiveTab()
  
  // Auto-stop playback when clicking outside frame manager
  const handleGlobalClick = (e: React.MouseEvent) => {
    if (activeTabId && activeTab?.isPlaying) {
      // Check if click is inside frame manager area
      const target = e.target as HTMLElement
      const frameManagerArea = target.closest('[data-frame-manager]')
      
      if (!frameManagerArea) {
        // Click is outside frame manager, stop playback
        stopPlayback(activeTabId)
      }
    }
  }

  useEffect(() => {
    // Initialize the app with default project if no tabs exist
    initializeApp()
  }, [initializeApp])

  useEffect(() => {
    // Show error toasts
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  if (tabs.length === 0) {
    return (
      <div className={cn('flex h-screen flex-col bg-gray-50', className)}>
        {/* App Header */}
        <AppHeader />
        
        {/* Project tabs - show animated + button */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          <ProjectTabs />
        </div>

        {/* Enhanced Empty State */}
        <ProjectEmptyState 
          onCreateProject={(options) => createNewProject(options)}
          className="flex-1"
        />
      </div>
    )
  }

  return (
    <div className={cn('flex h-screen flex-col bg-gray-50', className)} onClick={handleGlobalClick}>
      {/* App Header */}
      <AppHeader />
      
      {/* Project tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <ProjectTabs />
      </div>

      {/* Top Toolbar - Primary Actions */}
      <TopToolbar />

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Tools and Colors with Full Scroll */}
        <div className="w-64 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Tools Section - Top Priority */}
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-3">Tools</h3>
              <Toolbar />
            </div>
            
            {/* Colors Section - Below Tools */}
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-3">Colors</h3>
              <ColorPalette />
            </div>
          </div>
        </div>

        {/* Center - Canvas Area */}
        <div className="flex flex-1 flex-col">
          {activeTab && (
            <>
              <div className="flex-1 overflow-auto">
                <PixelCanvas
                  project={activeTab.project}
                  canvasData={activeTab.canvasData}
                  canvasState={activeTab.canvasState}
                />
              </div>
              
              {/* Bottom - Frame Manager */}
              <div className="border-t border-gray-200 bg-white p-4" data-frame-manager>
                <FrameManager 
                  frames={activeTab.frames}
                  activeFrameId={activeTab.project.activeFrameId}
                />
              </div>
            </>
          )}
        </div>

        {/* Right sidebar - Project Panel */}
        <div className="w-80 border-l border-gray-200 bg-white">
          <ProjectPanel />
        </div>
      </div>
    </div>
  )
}