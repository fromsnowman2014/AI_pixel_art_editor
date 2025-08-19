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
    clearError,
    error
  } = useProjectStore()

  const activeTab = getActiveTab()

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

        {/* Empty state in main area */}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-6 text-6xl">🎨</div>
            <h2 className="mb-2 text-2xl font-semibold text-gray-800">Welcome to PixelBuddy!</h2>
            <p className="mb-4 text-gray-600">Create pixel art and animated GIFs with ease.</p>
            <p className="text-gray-500">Click the + button above to create your first project!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-screen flex-col bg-gray-50', className)}>
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
              <div className="border-t border-gray-200 bg-white p-4">
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