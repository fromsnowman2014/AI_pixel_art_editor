'use client'

import React from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { MobilePixelCanvas } from './mobile-pixel-canvas'
import { MobileToolbar } from './mobile-toolbar'
import { MobileTopToolbar } from './mobile-top-toolbar'
import { ProjectTabs } from '../project-tabs'
import { MobileColorPalette } from './mobile-color-palette'
import { MobileFrameManager } from './mobile-frame-manager'
import { AppHeader } from '../app-header'
import { ProjectEmptyState } from '../project-empty-state'
import { useDeviceDetection } from '@/lib/utils/device-detection'
import toast from 'react-hot-toast'

interface MobilePixelEditorProps {
  className?: string
}

export function MobilePixelEditor({ className }: MobilePixelEditorProps) {
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

  const deviceInfo = useDeviceDetection()
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

  React.useEffect(() => {
    // Initialize the app with default project if no tabs exist
    initializeApp()
  }, [initializeApp])

  React.useEffect(() => {
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

  // Portrait mobile layout
  if (deviceInfo.orientation === 'portrait') {
    return (
      <div className={cn('flex h-screen flex-col bg-gray-50', className)} onClick={handleGlobalClick}>
        {/* App Header */}
        <AppHeader />
        
        {/* Project tabs */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          <ProjectTabs />
        </div>

        {/* Mobile Top Toolbar - Compact */}
        <MobileTopToolbar />

        {/* Main content area - portrait stack */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab && (
            <>
              {/* Canvas Area - takes most space */}
              <div className="flex-1 min-h-[240px] overflow-hidden">
                <MobilePixelCanvas
                  project={activeTab.project}
                  canvasData={activeTab.canvasData}
                  canvasState={activeTab.canvasState}
                />
              </div>
              
              {/* Frame Manager - compact bottom */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-white" data-frame-manager>
                <div className="p-2 max-h-[120px] min-h-[80px] overflow-y-auto">
                  <MobileFrameManager 
                    frames={activeTab.frames}
                    activeFrameId={activeTab.project.activeFrameId}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom floating toolbar */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
          <div className="p-2">
            <MobileToolbar />
          </div>
        </div>

        {/* Color palette modal overlay when needed */}
        <MobileColorPalette />
      </div>
    )
  }

  // Landscape mobile layout
  return (
    <div className={cn('flex h-screen flex-col bg-gray-50', className)} onClick={handleGlobalClick}>
      {/* App Header */}
      <AppHeader />
      
      {/* Project tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <ProjectTabs />
      </div>

      {/* Mobile Top Toolbar - Compact */}
      <MobileTopToolbar />

      {/* Main content area - landscape layout */}
      <div className="flex-1 grid grid-cols-[80px_1fr_180px] min-h-0">
        {/* Left sidebar - Tools only */}
        <div className="border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-2">
            <MobileToolbar />
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex flex-col min-h-0">
          {activeTab && (
            <div className="flex-1 overflow-hidden">
              <MobilePixelCanvas
                project={activeTab.project}
                canvasData={activeTab.canvasData}
                canvasState={activeTab.canvasState}
              />
            </div>
          )}
        </div>

        {/* Right sidebar - Frame Manager */}
        <div className="border-l border-gray-200 bg-white overflow-y-auto" data-frame-manager>
          {activeTab && (
            <div className="p-2">
              <MobileFrameManager 
                frames={activeTab.frames}
                activeFrameId={activeTab.project.activeFrameId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Color palette modal overlay when needed */}
      <MobileColorPalette />
    </div>
  )
}