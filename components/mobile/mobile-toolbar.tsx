'use client'

import React from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Pencil, 
  Eraser, 
  Move, 
  PaintBucket, 
  Wand2,
  Palette,
  Pipette
} from 'lucide-react'

interface MobileToolbarProps {
  className?: string
}

export function MobileToolbar({ className }: MobileToolbarProps) {
  const {
    activeTabId,
    getActiveTab,
    updateCanvasState,
  } = useProjectStore()

  const activeTab = getActiveTab()
  const canvasState = activeTab?.canvasState

  if (!activeTabId || !canvasState) {
    return null
  }

  const handleToolSelect = (tool: typeof canvasState.tool) => {
    updateCanvasState(activeTabId, { tool })
  }

  const tools = [
    { id: 'pencil', label: 'Draw', icon: Pencil },
    { id: 'eraser', label: 'Erase', icon: Eraser },
    { id: 'fill', label: 'Fill', icon: PaintBucket },
    { id: 'eyedropper', label: 'Pick', icon: Pipette },
    { id: 'magic-wand', label: 'Select', icon: Wand2 },
    { id: 'pan', label: 'Move', icon: Move },
  ] as const

  return (
    <div className={cn('flex flex-wrap gap-2 justify-center', className)}>
      {tools.map((tool) => (
        <Button
          key={tool.id}
          variant={canvasState.tool === tool.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolSelect(tool.id as typeof canvasState.tool)}
          className={cn(
            'min-h-[44px] min-w-[44px] flex-col gap-1 px-2 py-2 transition-all',
            canvasState.tool === tool.id && 'bg-blue-500 text-white border-blue-500',
            'hover:scale-105 active:scale-95'
          )}
        >
          <tool.icon className="h-4 w-4" />
          <span className="text-xs leading-none">{tool.label}</span>
        </Button>
      ))}
    </div>
  )
}