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
import { useResponsiveLayout } from '@/lib/ui/responsive-layout-manager'
import { useUnifiedInput } from '@/lib/ui/unified-input-handler'
import { createComponentLogger } from '@/lib/ui/smart-logger'

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
    stopPlayback,
    updateCanvasState,
    undo,
    redo
  } = useProjectStore()

  const componentLogger = createComponentLogger('PixelEditor')
  const { layout, capabilities, applyLayout } = useResponsiveLayout('PixelEditor')
  const activeTab = getActiveTab()
  const editorRef = useRef<HTMLDivElement>(null)

  // Unified input handling for all devices
  const { performanceMetrics } = useUnifiedInput(editorRef, {
    onToolSelect: (tool: string) => {
      if (activeTabId) {
        componentLogger.debug(
          'TOOL_SELECTED_VIA_INPUT',
          {
            tool,
            inputMethod: capabilities.hasTouch ? 'gesture' : 'keyboard',
            tabId: activeTabId
          }
        )
        updateCanvasState(activeTabId, { tool: tool as any })
      }
    },
    onError: (error: Error, context: string) => {
      componentLogger.error(
        'INPUT_HANDLER_ERROR',
        {
          context,
          errorMessage: error.message,
          activeTab: !!activeTab
        },
        error
      )
    }
  }, {
    component: 'PixelEditor',
    enableHaptics: capabilities.hasTouch,
    performanceMode: capabilities.screenSize === 'mobile' ? 'battery-saver' : 'high',
    debugMode: process.env.NODE_ENV === 'development'
  })
  
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
    componentLogger.info(
      'PIXEL_EDITOR_INITIALIZING',
      {
        tabCount: tabs.length,
        hasActiveTab: !!activeTabId,
        capabilities: capabilities
      }
    )
    initializeApp()
  }, [initializeApp])

  useEffect(() => {
    if (error) {
      componentLogger.error(
        'GLOBAL_ERROR_OCCURRED',
        {
          error,
          activeTab: !!activeTab,
          tabCount: tabs.length
        }
      )
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  useEffect(() => {
    componentLogger.debug(
      'PERFORMANCE_METRICS_UPDATE',
      {
        metrics: performanceMetrics,
        screenSize: capabilities.screenSize
      }
    )
  }, [performanceMetrics])

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
    <div 
      ref={editorRef}
      className={cn('flex h-screen flex-col bg-gray-50', className)} 
      onClick={handleGlobalClick}
    >
      {/* App Header */}
      <AppHeader />
      
      {/* Project tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <ProjectTabs />
      </div>

      {/* Top Toolbar - Primary Actions */}
      <TopToolbar />

      {/* Main editor area with unified responsive layout */}
      <div className={cn(
        "flex-1 min-h-0",
        layout.config.gridLayout
      )}>
        
        {/* Unified Layout System */}
        {layout.config.toolbarPlacement === 'sidebar' && (
          /* Sidebar Layout (Desktop/Tablet) */
          <>
            {/* Left sidebar - Tools and Colors */}
            <div className={applyLayout('toolbar')}>
              <div className={`space-y-${layout.config.componentSpacing / 4}`}>
                {/* Tools Section */}
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-gray-800 mb-3 truncate">Tools</h3>
                  <div className="min-w-0">
                    <Toolbar touchTargetSize={layout.config.touchTargetSize} />
                  </div>
                </div>
                
                {/* Colors Section */}
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-gray-800 mb-3 truncate">Colors</h3>
                  <div className="min-w-0">
                    <ColorPalette touchTargetSize={layout.config.touchTargetSize} />
                  </div>
                </div>
              </div>
            </div>

            {/* Center - Canvas Area */}
            <div className="flex flex-col min-h-0">
              {activeTab && (
                <>
                  <div className={applyLayout('canvas')}>
                    <PixelCanvas
                      project={activeTab.project}
                      canvasData={activeTab.canvasData}
                      canvasState={activeTab.canvasState}
                    />
                  </div>
                  
                  {/* Frame Manager */}
                  <div className={applyLayout('timeline')} data-frame-manager>
                    <FrameManager 
                      frames={activeTab.frames}
                      activeFrameId={activeTab.project.activeFrameId}
                      layout={layout.config}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Right sidebar - Project Panel (conditional) */}
            {capabilities.screenSize === 'desktop' && (
              <div className="border-l border-gray-200 bg-white overflow-y-auto">
                <ProjectPanel />
              </div>
            )}
          </>
        )}

        {layout.config.toolbarPlacement === 'floating' && (
          /* Mobile Portrait Layout */
          <>
            {/* Canvas Area - Main focus */}
            <div className={applyLayout('canvas')}>
              {activeTab && (
                <PixelCanvas
                  project={activeTab.project}
                  canvasData={activeTab.canvasData}
                  canvasState={activeTab.canvasState}
                />
              )}
            </div>
            
            {/* Frame Manager */}
            <div className={applyLayout('timeline')} data-frame-manager>
              {activeTab && (
                <FrameManager 
                  frames={activeTab.frames}
                  activeFrameId={activeTab.project.activeFrameId}
                  layout={layout.config}
                />
              )}
            </div>
            
            {/* Mobile Floating Toolbar */}
            <div className={applyLayout('toolbar')}>
              <div className={`p-${layout.config.componentSpacing / 4}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex-1 mr-3">
                    <Toolbar 
                      touchTargetSize={layout.config.touchTargetSize}
                      placement="floating"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <ColorPalette 
                      touchTargetSize={layout.config.touchTargetSize}
                      placement="floating"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {layout.config.toolbarPlacement === 'compact-sidebar' && (
          /* Mobile Landscape Layout */
          <>
            {/* Left - Compact Tools */}
            <div className={applyLayout('toolbar')}>
              <div className={`p-${layout.config.componentSpacing / 8}`}>
                <Toolbar 
                  touchTargetSize={layout.config.touchTargetSize}
                  placement="compact"
                />
              </div>
            </div>

            {/* Center - Canvas with timeline */}
            <div className="flex flex-col min-h-0">
              {activeTab && (
                <>
                  <div className={applyLayout('canvas')}>
                    <PixelCanvas
                      project={activeTab.project}
                      canvasData={activeTab.canvasData}
                      canvasState={activeTab.canvasState}
                    />
                  </div>
                  <div className={applyLayout('timeline')} data-frame-manager>
                    <FrameManager 
                      frames={activeTab.frames}
                      activeFrameId={activeTab.project.activeFrameId}
                      layout={layout.config}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Right - Colors */}
            <div className={applyLayout('colorPalette')}>
              <ColorPalette 
                touchTargetSize={layout.config.touchTargetSize}
                placement="sidebar-compact"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}