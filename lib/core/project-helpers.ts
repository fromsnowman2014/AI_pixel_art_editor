/**
 * Project Helper Utilities
 * Functions for project management and validation
 */

import type { PixelData } from '@/lib/types/api'
import type { ProjectTab } from '@/lib/stores/project-store'

/**
 * Check if a frame contains actual artwork (non-transparent pixels)
 */
export function hasFrameContent(pixelData: PixelData | null): boolean {
  if (!pixelData || !pixelData.data || pixelData.data.length === 0) {
    return false
  }

  // Check for any non-transparent pixels (alpha > 0)
  for (let i = 3; i < pixelData.data.length; i += 4) {
    if ((pixelData.data[i] ?? 0) > 0) {
      return true
    }
  }

  return false
}

/**
 * Analyze project frames to count frames with artwork
 */
export function analyzeProjectFrames(tab: ProjectTab): {
  totalFrames: number
  framesWithContent: number
  hasUnsavedWork: boolean
  contentFrameIds: string[]
} {
  if (!tab || !tab.frameCanvasData) {
    return {
      totalFrames: 0,
      framesWithContent: 0,
      hasUnsavedWork: false,
      contentFrameIds: []
    }
  }

  const totalFrames = tab.frameCanvasData.length
  const contentFrameIds: string[] = []
  let framesWithContent = 0

  // Check each frame for content
  tab.frameCanvasData.forEach((frameData: { frameId: string; canvasData: PixelData }) => {
    if (hasFrameContent(frameData.canvasData)) {
      framesWithContent++
      contentFrameIds.push(frameData.frameId)
    }
  })

  // Also check current canvas data if it hasn't been saved yet
  let hasUnsavedCurrentWork = false
  if (tab.currentFrame && tab.canvasData && hasFrameContent(tab.canvasData)) {
    const currentFrameData = tab.frameCanvasData.find(
      (fd: { frameId: string; canvasData: PixelData }) => fd.frameId === tab.currentFrame!.id
    )
    
    // If current frame has content but it's not reflected in frameCanvasData
    if (!currentFrameData || !hasFrameContent(currentFrameData.canvasData)) {
      hasUnsavedCurrentWork = true
      if (!contentFrameIds.includes(tab.currentFrame.id)) {
        contentFrameIds.push(tab.currentFrame.id)
        framesWithContent++
      }
    }
  }

  const hasUnsavedWork = framesWithContent > 0 || tab.isDirty || hasUnsavedCurrentWork

  return {
    totalFrames,
    framesWithContent,
    hasUnsavedWork,
    contentFrameIds
  }
}

/**
 * Generate user-friendly message for project deletion confirmation
 */
export function generateDeletionMessage(analysis: ReturnType<typeof analyzeProjectFrames>): {
  title: string
  message: string
  showConfirmation: boolean
} {
  const { framesWithContent, totalFrames } = analysis

  if (framesWithContent === 0) {
    return {
      title: 'Close Project',
      message: 'This project is empty.',
      showConfirmation: false
    }
  }

  const frameText = framesWithContent === 1 
    ? '1 frame contains' 
    : `${framesWithContent} frames contain`

  return {
    title: 'You have artwork to save!',
    message: `${frameText} your drawings.`,
    showConfirmation: true
  }
}

/**
 * Check if project needs save confirmation before closing
 */
export function needsSaveConfirmation(tab: ProjectTab): boolean {
  const analysis = analyzeProjectFrames(tab)
  return analysis.hasUnsavedWork
}