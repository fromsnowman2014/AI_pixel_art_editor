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
import { MobilePixelEditor } from './mobile/mobile-pixel-editor'
import { useDeviceDetection } from '@/lib/utils/device-detection'
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
  
  // Device-specific UI rendering with proper hydration
  const deviceInfo = useDeviceDetection()
  const useMobileUI = deviceInfo.isMobile || (deviceInfo.isTablet && deviceInfo.isTouchDevice)
  
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
  
  // If mobile device detected, use mobile UI
  if (useMobileUI) {
    return <MobilePixelEditor className={className} />
  }

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

      {/* Main editor area with responsive grid layout - optimized for viewport fit */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,300px)_1fr] lg:grid-cols-[minmax(260px,300px)_1fr_minmax(320px,380px)] xl:grid-cols-[minmax(280px,320px)_1fr_minmax(350px,400px)] flex-1 min-h-0">
        {/* Left sidebar - Tools and Colors with responsive collapsing */}
        <div className="border-r border-gray-200 bg-white overflow-y-auto order-2 md:order-1">
          <div className="p-4 space-y-6">
            {/* Tools Section - Top Priority */}
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-800 mb-3 truncate">Tools</h3>
              <div className="min-w-0">
                <Toolbar />
              </div>
            </div>
            
            {/* Colors Section - Below Tools */}
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-800 mb-3 truncate">Colors</h3>
              <div className="min-w-0">
                <ColorPalette />
              </div>
            </div>
          </div>
        </div>

        {/* Center - Canvas Area with improved height distribution */}
        <div className="flex flex-col min-h-0 order-1 md:order-2">
          {activeTab && (
            <>
              {/* Canvas Area - responsive height with timeline guaranteed visibility */}
              <div className="flex-1 min-h-[200px] md:min-h-[300px] overflow-auto">
                <PixelCanvas
                  project={activeTab.project}
                  canvasData={activeTab.canvasData}
                  canvasState={activeTab.canvasState}
                />
              </div>
              
              {/* Frame Manager - fixed height ensuring always visible */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-white" data-frame-manager>
                <div className="p-2 md:p-3 max-h-[280px] min-h-[160px] md:min-h-[180px] overflow-y-auto">
                  <FrameManager 
                    frames={activeTab.frames}
                    activeFrameId={activeTab.project.activeFrameId}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right sidebar - Project Panel with responsive behavior */}
        <div className="border-l border-gray-200 bg-white overflow-y-auto order-3 lg:block hidden">
          <ProjectPanel />
        </div>
      </div>
    </div>
  )
}