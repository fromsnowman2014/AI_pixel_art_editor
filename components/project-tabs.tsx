'use client'

import React from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X, Plus, Copy, Save } from 'lucide-react'

export function ProjectTabs() {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    closeTab,
    createNewProject,
    duplicateTab,
    saveProject,
  } = useProjectStore()

  return (
    <div className="flex h-12 items-center bg-white">
      {/* Tab List */}
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              'group flex min-w-0 flex-shrink-0 items-center border-r border-gray-200 px-4 py-2 transition-colors',
              activeTabId === tab.id
                ? 'bg-blue-50 border-b-2 border-b-blue-500'
                : 'hover:bg-gray-50 cursor-pointer'
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {/* Project Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="truncate text-sm font-medium text-gray-800">
                  {tab.project.name}
                </span>
                {tab.isDirty && (
                  <div className="h-2 w-2 rounded-full bg-orange-400" title="Unsaved changes" />
                )}
              </div>
              <div className="text-xs text-gray-500">
                {tab.project.width}×{tab.project.height} • {tab.frames.length} frame{tab.frames.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Tab Actions */}
            <div className="ml-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Save Button */}
              {tab.isDirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-green-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    saveProject(tab.id)
                  }}
                  title="Save project"
                >
                  <Save className="h-3 w-3 text-green-600" />
                </Button>
              )}

              {/* Duplicate Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation()
                  duplicateTab(tab.id)
                }}
                title="Duplicate project"
              >
                <Copy className="h-3 w-3 text-blue-600" />
              </Button>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-red-100"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                title="Close project"
              >
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          </div>
        ))}

        {/* New Project Button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex-shrink-0 h-full px-4 rounded-none border-r border-gray-200 hover:bg-gray-50 transition-all duration-300",
            tabs.length === 0 && "bg-blue-50 hover:bg-blue-100 animate-pulse"
          )}
          onClick={() => createNewProject()}
          title="Create new project"
        >
          <Plus className={cn(
            "h-4 w-4 transition-all duration-300",
            tabs.length === 0 ? "text-blue-600 animate-bounce" : "text-gray-600"
          )} />
        </Button>
      </div>

      {/* Global Actions */}
      <div className="flex items-center space-x-2 px-4">
        <div className={cn(
          "text-xs transition-all duration-300",
          tabs.length === 0 ? "text-blue-600 font-medium" : "text-gray-500"
        )}>
          {tabs.length === 0 
            ? "← Click + to start creating!" 
            : `${tabs.length} project${tabs.length !== 1 ? 's' : ''}`
          }
        </div>
      </div>
    </div>
  )
}