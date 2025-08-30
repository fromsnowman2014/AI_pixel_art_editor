'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { createPixelCanvas, hexToRgb } from '@/lib/utils'
import type { Project, PixelData, CanvasState } from '@/lib/types/api'
import { performMagicWandSelection } from '@/lib/core/magic-wand'
import { canvasDebug } from '@/lib/ui/debug'

interface TouchState {
  touches: Map<number, TouchPoint>
  gestureType: 'single-tap' | 'single-drag' | 'two-finger-pan' | 'pinch-zoom' | null
  initialDistance?: number
  initialZoom?: number
  lastPanDelta?: { x: number, y: number }
}

interface TouchPoint {
  id: number
  x: number
  y: number
  startTime: number
  moved: boolean
}

interface MobilePixelCanvasProps {
  project: Project
  canvasData: PixelData | null
  canvasState: CanvasState
}

export function MobilePixelCanvas({ project, canvasData, canvasState }: MobilePixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [touchState, setTouchState] = useState<TouchState>({
    touches: new Map(),
    gestureType: null
  })
  
  const {
    activeTabId,
    updateCanvasData,
    updateCanvasState,
    addHistoryEntry,
    regenerateFrameThumbnail,
    getActiveTab,
  } = useProjectStore()

  const activeTab = getActiveTab()
  const isPlaying = activeTab?.isPlaying || false

  // Touch gesture recognition
  const recognizeGesture = useCallback((touches: React.TouchList): TouchState['gestureType'] => {
    if (touches.length === 1) {
      return 'single-tap'
    } else if (touches.length === 2) {
      // Determine if it's pan or zoom based on movement
      const touch1 = touches[0]
      const touch2 = touches[1]
      
      if (!touch1 || !touch2) return null
      
      const distance = Math.sqrt(
        Math.pow(touch1.clientX - touch2.clientX, 2) + 
        Math.pow(touch1.clientY - touch2.clientY, 2)
      )
      
      // If we have an initial distance, compare to detect zoom
      if (touchState.initialDistance !== undefined) {
        const distanceChange = Math.abs(distance - touchState.initialDistance)
        return distanceChange > 10 ? 'pinch-zoom' : 'two-finger-pan'
      }
      
      return 'two-finger-pan'
    }
    return null
  }, [touchState.initialDistance])

  // Calculate distance between two touches
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Calculate center point between two touches
  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch): { x: number, y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }

  // Convert touch coordinates to canvas coordinates
  const getTouchCanvasCoords = useCallback((touch: React.Touch) => {
    if (!canvasRef.current) return null
    
    const canvasRect = canvasRef.current.getBoundingClientRect()
    return {
      x: touch.clientX - canvasRect.left,
      y: touch.clientY - canvasRect.top
    }
  }, [])

  // Draw pixel function (reused from original)
  const drawPixel = useCallback((x: number, y: number) => {
    if (!canvasData || !activeTabId) return

    const pixelX = Math.floor(x / canvasState.zoom)
    const pixelY = Math.floor(y / canvasState.zoom)
    
    if (pixelX < 0 || pixelX >= project.width || pixelY < 0 || pixelY >= project.height) {
      return
    }

    const color = hexToRgb(canvasState.color)
    if (!color) return

    const newData = new Uint8ClampedArray(canvasData.data)
    const index = (pixelY * project.width + pixelX) * 4

    // Apply tool-specific drawing logic
    switch (canvasState.tool) {
      case 'pencil':
        if (canvasState.selection?.isActive && canvasState.selection.selectedPixels.size > 0) {
          if (canvasState.selection.selectedPixels.has(`${pixelX},${pixelY}`)) {
            newData[index] = color.r
            newData[index + 1] = color.g
            newData[index + 2] = color.b
            newData[index + 3] = 255
          } else {
            return
          }
        } else {
          newData[index] = color.r
          newData[index + 1] = color.g
          newData[index + 2] = color.b
          newData[index + 3] = 255
        }
        break
      case 'eraser':
        if (canvasState.selection?.isActive && canvasState.selection.selectedPixels.size > 0) {
          if (canvasState.selection.selectedPixels.has(`${pixelX},${pixelY}`)) {
            newData[index + 3] = 0
          } else {
            return
          }
        } else {
          newData[index + 3] = 0
        }
        break
      case 'eyedropper':
        const r = newData[index] || 0
        const g = newData[index + 1] || 0
        const b = newData[index + 2] || 0
        const alpha = newData[index + 3] || 0
        
        let pickedColor: string
        if (alpha === 0) {
          pickedColor = canvasState.color
        } else {
          pickedColor = `#${[
            Math.max(0, Math.min(255, r)).toString(16).padStart(2, '0'),
            Math.max(0, Math.min(255, g)).toString(16).padStart(2, '0'),
            Math.max(0, Math.min(255, b)).toString(16).padStart(2, '0')
          ].join('')}`
        }
        
        updateCanvasState(activeTabId, { color: pickedColor })
        canvasDebug('EYEDROPPER', `Picked color: ${pickedColor}`)
        return
      case 'magic-wand':
        const selectionResult = performMagicWandSelection(
          canvasData.data,
          pixelX,
          pixelY,
          project.width,
          project.height,
          {
            tolerance: canvasState.selection?.tolerance || 0,
            contiguous: true,
            sampleAllLayers: false
          }
        )
        
        updateCanvasState(activeTabId, {
          selection: {
            isActive: selectionResult.pixelCount > 0,
            selectedPixels: selectionResult.selectedPixels,
            bounds: selectionResult.bounds,
            tolerance: canvasState.selection?.tolerance || 0
          }
        })
        
        canvasDebug('MAGIC_WAND', `Selected ${selectionResult.pixelCount} pixels`)
        return
      case 'fill':
        if (canvasState.selection?.isActive && canvasState.selection.selectedPixels.size > 0) {
          for (const pixelKey of Array.from(canvasState.selection.selectedPixels)) {
            const coords = pixelKey.split(',').map(Number)
            if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
              const x = coords[0]
              const y = coords[1]
              const fillIndex = (y * project.width + x) * 4
              newData[fillIndex] = color.r
              newData[fillIndex + 1] = color.g
              newData[fillIndex + 2] = color.b
              newData[fillIndex + 3] = 255
            }
          }
        } else {
          floodFill(newData, project.width, project.height, pixelX, pixelY, color)
        }
        break
    }

    const updatedCanvasData = {
      ...canvasData,
      data: newData
    }

    updateCanvasData(activeTabId, updatedCanvasData)
    
    if (activeTabId && project.activeFrameId) {
      setTimeout(() => {
        regenerateFrameThumbnail(activeTabId, project.activeFrameId!)
      }, 100)
    }
  }, [canvasData, canvasState, project, activeTabId, updateCanvasData, updateCanvasState])

  // Simple flood fill algorithm (reused from original)
  const floodFill = useCallback((
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    fillColor: { r: number; g: number; b: number }
  ) => {
    const startIndex = (startY * width + startX) * 4
    const targetR = data[startIndex]
    const targetG = data[startIndex + 1]
    const targetB = data[startIndex + 2]
    const targetA = data[startIndex + 3]

    if (targetR === fillColor.r && targetG === fillColor.g && targetB === fillColor.b) {
      return
    }

    const stack = [{ x: startX, y: startY }]

    while (stack.length > 0) {
      const { x, y } = stack.pop()!
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue
      
      const index = (y * width + x) * 4
      
      if (
        data[index] === targetR &&
        data[index + 1] === targetG &&
        data[index + 2] === targetB &&
        data[index + 3] === targetA
      ) {
        data[index] = fillColor.r
        data[index + 1] = fillColor.g
        data[index + 2] = fillColor.b
        data[index + 3] = 255

        stack.push(
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 }
        )
      }
    }
  }, [])

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || !canvasRef.current) return
    
    // Disable drawing during playback
    if (isPlaying) return

    e.preventDefault() // Prevent scrolling and zooming

    const touches = Array.from(e.touches)
    const gestureType = recognizeGesture(e.touches)
    
    const newTouchState: TouchState = {
      touches: new Map(),
      gestureType
    }

    // Store touch points
    touches.forEach(touch => {
      newTouchState.touches.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startTime: Date.now(),
        moved: false
      })
    })

    if (gestureType === 'single-tap' && canvasState.tool !== 'pan') {
      const firstTouch = touches[0]
      if (firstTouch) {
        const coords = getTouchCanvasCoords(firstTouch)
        if (coords) {
          drawPixel(coords.x, coords.y)
          setIsDragging(true)
        }
      }
    } else if (gestureType === 'pinch-zoom' && touches.length === 2) {
      const touch1 = touches[0]
      const touch2 = touches[1]
      if (touch1 && touch2) {
        const distance = getTouchDistance(touch1, touch2)
        newTouchState.initialDistance = distance
        newTouchState.initialZoom = canvasState.zoom
      }
    }

    setTouchState(newTouchState)
  }, [recognizeGesture, getTouchCanvasCoords, drawPixel, canvasState.tool, canvasState.zoom, isPlaying])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging && touchState.gestureType !== 'pinch-zoom' && touchState.gestureType !== 'two-finger-pan') return
    if (isPlaying && canvasState.tool !== 'pan') return

    e.preventDefault()

    const touches = Array.from(e.touches)

    if (touchState.gestureType === 'single-tap' && touches.length === 1 && canvasState.tool !== 'pan' && canvasState.tool !== 'eyedropper') {
      const firstTouch = touches[0]
      if (firstTouch) {
        const coords = getTouchCanvasCoords(firstTouch)
        if (coords) {
          drawPixel(coords.x, coords.y)
        }
      }
    } else if (touchState.gestureType === 'pinch-zoom' && touches.length === 2 && touchState.initialDistance && touchState.initialZoom) {
      const touch1 = touches[0]
      const touch2 = touches[1]
      if (touch1 && touch2) {
        const currentDistance = getTouchDistance(touch1, touch2)
        const scale = currentDistance / touchState.initialDistance
        const newZoom = Math.max(1, Math.min(32, touchState.initialZoom * scale))
        
        const center = getTouchCenter(touch1, touch2)
        const canvasRect = canvasRef.current?.getBoundingClientRect()
        
        if (canvasRect && activeTabId) {
          const centerX = center.x - canvasRect.left
          const centerY = center.y - canvasRect.top
          
          // Calculate pan adjustment to zoom towards touch center
          const zoomRatio = newZoom / canvasState.zoom
          const centerOffsetX = centerX - canvasRect.width / 2
          const centerOffsetY = centerY - canvasRect.height / 2
          
          updateCanvasState(activeTabId, {
            zoom: newZoom,
            panX: canvasState.panX - centerOffsetX * (zoomRatio - 1),
            panY: canvasState.panY - centerOffsetY * (zoomRatio - 1)
          })
        }
      }
    } else if (touchState.gestureType === 'two-finger-pan' && touches.length === 2) {
      // Calculate pan delta from touch movement
      const touch1 = touches[0]
      const touch2 = touches[1]
      if (touch1 && touch2) {
        const currentCenter = getTouchCenter(touch1, touch2)
        
        if (touchState.lastPanDelta && activeTabId) {
          const deltaX = currentCenter.x - touchState.lastPanDelta.x
          const deltaY = currentCenter.y - touchState.lastPanDelta.y
          
          updateCanvasState(activeTabId, {
            panX: canvasState.panX + deltaX,
            panY: canvasState.panY + deltaY
          })
        }
        
        setTouchState(prev => ({
          ...prev,
          lastPanDelta: currentCenter
        }))
      }
    }
  }, [isDragging, touchState, getTouchCanvasCoords, drawPixel, canvasState, activeTabId, updateCanvasState, isPlaying])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isDragging && canvasData && activeTabId && canvasState.tool !== 'pan' && !isPlaying) {
      addHistoryEntry(activeTabId, `${canvasState.tool}_draw`, canvasData)
      
      if (project.activeFrameId) {
        setTimeout(() => {
          regenerateFrameThumbnail(activeTabId, project.activeFrameId!)
        }, 150)
      }
    }

    setIsDragging(false)
    setTouchState({
      touches: new Map(),
      gestureType: null
    })
  }, [isDragging, canvasData, activeTabId, canvasState.tool, addHistoryEntry, project.activeFrameId, regenerateFrameThumbnail, isPlaying])

  // Mouse events (keep for desktop compatibility when device detection might be wrong)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !canvasRef.current) return
    if (isPlaying) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - canvasRect.left
    const y = e.clientY - canvasRect.top

    setIsDragging(true)

    if (canvasState.tool !== 'pan') {
      drawPixel(x, y)
    }
  }, [canvasState.tool, drawPixel, isPlaying])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !canvasRef.current) return
    if (isPlaying && canvasState.tool !== 'pan') return

    if (canvasState.tool !== 'pan' && canvasState.tool !== 'eyedropper') {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - canvasRect.left
      const y = e.clientY - canvasRect.top
      drawPixel(x, y)
    }
  }, [isDragging, canvasState.tool, drawPixel, isPlaying])

  const handleMouseUp = useCallback(() => {
    if (isDragging && canvasData && activeTabId && canvasState.tool !== 'pan' && !isPlaying) {
      addHistoryEntry(activeTabId, `${canvasState.tool}_draw`, canvasData)
      
      if (project.activeFrameId) {
        setTimeout(() => {
          regenerateFrameThumbnail(activeTabId, project.activeFrameId!)
        }, 150)
      }
    }
    setIsDragging(false)
  }, [isDragging, canvasData, activeTabId, canvasState.tool, addHistoryEntry, project.activeFrameId, regenerateFrameThumbnail, isPlaying])

  // Rendering logic (reused from original with touch event handlers)
  const canvasDataId = React.useMemo(() => {
    if (!canvasData) return 'null'
    
    const width = canvasData.width
    const height = canvasData.height
    const dataLength = canvasData.data.length
    
    const sampleSize = Math.min(16, dataLength / 4)
    let hash = 0
    for (let i = 0; i < sampleSize * 4; i += 4) {
      const r = canvasData.data[i] || 0
      const g = canvasData.data[i + 1] || 0
      const b = canvasData.data[i + 2] || 0
      const a = canvasData.data[i + 3] || 0
      hash = ((hash << 5) - hash + r + g + b + a) & 0xffffffff
    }
    
    return `${width}x${height}-${dataLength}-${hash}`
  }, [canvasData])
  
  // Canvas rendering effect (reused from original)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasData) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    canvas.width = project.width * canvasState.zoom
    canvas.height = project.height * canvasState.zoom

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (isPlaying) {
      ctx.globalCompositeOperation = 'source-over'
      ctx.save()
    }

    if (canvasData.data.length === 0) {
      const emptyData = new Uint8ClampedArray(project.width * project.height * 4)
      const imageData = new ImageData(emptyData, project.width, project.height)
      
      const tempCanvas = createPixelCanvas(project.width, project.height)
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(imageData, 0, 0)
      
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
    } else {
      const imageData = new ImageData(new Uint8ClampedArray(canvasData.data), project.width, project.height)
      
      const tempCanvas = createPixelCanvas(project.width, project.height)
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(imageData, 0, 0)
      
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
    }

    if (isPlaying) {
      ctx.restore()
    }

    // Draw grid if zoomed in enough and not playing
    if (canvasState.zoom >= 4 && !isPlaying) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.lineWidth = 1
      
      for (let x = 0; x <= project.width; x++) {
        ctx.beginPath()
        ctx.moveTo(x * canvasState.zoom, 0)
        ctx.lineTo(x * canvasState.zoom, canvas.height)
        ctx.stroke()
      }
      
      for (let y = 0; y <= project.height; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * canvasState.zoom)
        ctx.lineTo(canvas.width, y * canvasState.zoom)
        ctx.stroke()
      }
    }

    // Draw selection overlay (reused from original)
    if (canvasState.selection?.isActive && canvasState.selection.selectedPixels.size > 0) {
      const time = Date.now() / 100
      const dashOffset = (time % 20)
      
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.lineDashOffset = -dashOffset
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      
      for (const pixelKey of Array.from(canvasState.selection.selectedPixels)) {
        const coords = pixelKey.split(',').map(Number)
        if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
          const x = coords[0]
          const y = coords[1]
          const screenX = x * canvasState.zoom
          const screenY = y * canvasState.zoom
          const size = canvasState.zoom
          
          ctx.strokeRect(screenX, screenY, size, size)
        }
      }
      
      ctx.setLineDash([4, 4])
      ctx.lineDashOffset = -dashOffset + 4
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      
      for (const pixelKey of Array.from(canvasState.selection.selectedPixels)) {
        const coords = pixelKey.split(',').map(Number)
        if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
          const x = coords[0]
          const y = coords[1]
          const screenX = x * canvasState.zoom
          const screenY = y * canvasState.zoom
          const size = canvasState.zoom
          
          ctx.strokeRect(screenX, screenY, size, size)
        }
      }
      
      ctx.restore()
    }
  }, [canvasData, project, canvasState.zoom, canvasDataId, isPlaying, canvasState.selection])

  return (
    <div 
      ref={containerRef}
      className="relative flex h-full items-center justify-center overflow-hidden bg-gray-100"
    >
      <div 
        className="relative"
        style={{
          transform: `translate(${canvasState.panX}px, ${canvasState.panY}px)`
        }}
      >
        {/* Transparent checkerboard background */}
        <div 
          className="absolute border-2 border-gray-300"
          style={{
            width: project.width * canvasState.zoom,
            height: project.height * canvasState.zoom,
            backgroundColor: '#ffffff',
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
              <svg width="${8 * canvasState.zoom}" height="${8 * canvasState.zoom}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${4 * canvasState.zoom}" height="${4 * canvasState.zoom}" fill="#e0e0e0"/>
                <rect x="${4 * canvasState.zoom}" y="${4 * canvasState.zoom}" width="${4 * canvasState.zoom}" height="${4 * canvasState.zoom}" fill="#e0e0e0"/>
              </svg>
            `)}")`,
            backgroundRepeat: 'repeat',
            imageRendering: 'pixelated',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />
        
        <canvas
          ref={canvasRef}
          className="pixel-canvas border-2 border-gray-300 shadow-lg relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            cursor: isPlaying ? 'not-allowed' : 
                   canvasState.tool === 'pan' ? 'grab' : 
                   canvasState.tool === 'eyedropper' ? 'crosshair' : 'crosshair',
            backgroundColor: 'transparent',
            imageRendering: 'pixelated',
            zIndex: 2,
            touchAction: 'none', // Prevent default touch behaviors
          }}
        />
        
        {/* Tool indicator */}
        <div className="absolute -top-8 left-0 rounded bg-black/75 px-2 py-1 text-xs text-white">
          {isPlaying ? '🎬 Playing Animation' :
           canvasState.tool === 'eyedropper' ? '🎨 Color Picker' :
           canvasState.tool === 'magic-wand' ? (
             canvasState.selection?.isActive 
               ? `🪄 ${canvasState.selection.selectedPixels.size} selected`
               : `🪄 Magic Wand`
           ) :
           `${canvasState.tool} | ${canvasState.zoom}x`}
        </div>
      </div>
    </div>
  )
}