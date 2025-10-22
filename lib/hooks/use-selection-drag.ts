import { useState, useCallback, useRef } from 'react'
import { rectangleSelect } from '@/lib/core/rectangle-selection'
import { circleSelect } from '@/lib/core/circle-selection'
import type { SelectionToolType } from '@/components/toolbar/selection-tool-group'

interface DragState {
  isActive: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export function useSelectionDrag(selectionToolType: SelectionToolType) {
  const [dragState, setDragState] = useState<DragState | null>(null)
  const modifierKeysRef = useRef({ shift: false, alt: false })

  const startDrag = useCallback((x: number, y: number, shiftKey: boolean, altKey: boolean) => {
    modifierKeysRef.current = { shift: shiftKey, alt: altKey }
    setDragState({
      isActive: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    })
  }, [])

  const updateDrag = useCallback((x: number, y: number) => {
    if (!dragState?.isActive) return
    setDragState(prev => prev ? { ...prev, currentX: x, currentY: y } : null)
  }, [dragState?.isActive])

  const endDrag = useCallback(() => {
    if (!dragState?.isActive) return

    let selectedPixels: Set<string> | null = null

    if (selectionToolType === 'rectangle') {
      selectedPixels = rectangleSelect(
        dragState.startX,
        dragState.startY,
        dragState.currentX,
        dragState.currentY,
        {
          constrainSquare: modifierKeysRef.current.shift,
          fromCenter: modifierKeysRef.current.alt,
        }
      )
    } else if (selectionToolType === 'circle') {
      selectedPixels = circleSelect(
        dragState.startX,
        dragState.startY,
        dragState.currentX,
        dragState.currentY,
        {
          constrainCircle: modifierKeysRef.current.shift,
          fromCenter: true, // Always from center for better UX
          filled: true,
        }
      )
    }

    setDragState(null)
    return selectedPixels
  }, [dragState, selectionToolType])

  const cancelDrag = useCallback(() => {
    setDragState(null)
  }, [])

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  }
}
