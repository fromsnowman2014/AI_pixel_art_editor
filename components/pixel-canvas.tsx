'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { createPixelCanvas, hexToRgb } from '@/lib/utils'
import type { Project, PixelData, CanvasState } from '@/lib/types/api'

// Simplified debug logging
import { canvasDebug } from '@/lib/utils/debug'

interface PixelCanvasProps {
  project: Project
  canvasData: PixelData | null
  canvasState: CanvasState
}

export function PixelCanvas({ project, canvasData, canvasState }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null)
  
  const {
    activeTabId,
    updateCanvasData,
    updateCanvasState,
    addHistoryEntry,
    regenerateFrameThumbnail,
  } = useProjectStore()

  // Component mounted

  // Props updated (removed debug logs)

  // Handle drawing on canvas
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
        newData[index] = color.r
        newData[index + 1] = color.g
        newData[index + 2] = color.b
        newData[index + 3] = 255
        break
      case 'eraser':
        newData[index + 3] = 0 // Make transparent
        break
      case 'eyedropper':
        // Get the color values from the pixel data
        const r = newData[index] || 0
        const g = newData[index + 1] || 0
        const b = newData[index + 2] || 0
        const alpha = newData[index + 3] || 0
        
        // If the pixel is completely transparent, keep current color (don't change)
        let pickedColor: string
        if (alpha === 0) {
          pickedColor = canvasState.color // Keep current color for transparent pixels
        } else {
          // Convert RGB values to hex string with proper padding
          pickedColor = `#${[
            Math.max(0, Math.min(255, r)).toString(16).padStart(2, '0'),
            Math.max(0, Math.min(255, g)).toString(16).padStart(2, '0'),
            Math.max(0, Math.min(255, b)).toString(16).padStart(2, '0')
          ].join('')}`
        }
        
        // Update the canvas state with the picked color
        updateCanvasState(activeTabId, { color: pickedColor })
        canvasDebug('EYEDROPPER', `Picked color: ${pickedColor}`)
        return
      case 'fill':
        // Simple flood fill implementation
        floodFill(newData, project.width, project.height, pixelX, pixelY, color)
        break
    }

    const updatedCanvasData = {
      ...canvasData,
      data: newData
    }

    updateCanvasData(activeTabId, updatedCanvasData)
    
    // REAL-TIME THUMBNAIL UPDATE: Regenerate thumbnail immediately after drawing
    if (activeTabId && project.activeFrameId) {
      setTimeout(() => {
        regenerateFrameThumbnail(activeTabId, project.activeFrameId!)
      }, 100) // Small delay to ensure canvas data is saved
    }
  }, [canvasData, canvasState, project, activeTabId, updateCanvasData, updateCanvasState])

  // Simple flood fill algorithm
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
      return // Same color, no need to fill
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

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !canvasRef.current) return

    // Simple approach: use canvas coordinates directly (no pan adjustment needed)
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - canvasRect.left
    const y = e.clientY - canvasRect.top

    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })

    if (canvasState.tool !== 'pan') {
      drawPixel(x, y)
    }
  }, [canvasState.panX, canvasState.panY, canvasState.tool, drawPixel])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !lastMousePos || !containerRef.current || !canvasRef.current) return

    if (canvasState.tool === 'pan') {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y
      
      if (activeTabId) {
        updateCanvasState(activeTabId, {
          panX: canvasState.panX + deltaX,
          panY: canvasState.panY + deltaY
        })
      }
    } else if (canvasState.tool !== 'eyedropper') {
      // Use same simple coordinate calculation as mouse down
      // Skip drawing for color picker tool - it should only work on click, not drag
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - canvasRect.left
      const y = e.clientY - canvasRect.top
      drawPixel(x, y)
    }

    setLastMousePos({ x: e.clientX, y: e.clientY })
  }, [isDragging, lastMousePos, canvasState, activeTabId, updateCanvasState, drawPixel])

  const handleMouseUp = useCallback(() => {
    if (isDragging && canvasData && activeTabId && canvasState.tool !== 'pan') {
      addHistoryEntry(activeTabId, `${canvasState.tool}_draw`, canvasData)
      
      // FINAL THUMBNAIL UPDATE: Ensure thumbnail is updated when drawing is complete
      if (project.activeFrameId) {
        setTimeout(() => {
          regenerateFrameThumbnail(activeTabId, project.activeFrameId!)
        }, 150) // Slightly longer delay for final update
      }
    }
    setIsDragging(false)
    setLastMousePos(null)
  }, [isDragging, canvasData, activeTabId, canvasState.tool, addHistoryEntry, project.activeFrameId, regenerateFrameThumbnail])

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    
    if (!activeTabId) return

    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8
    const newZoom = Math.max(1, Math.min(32, canvasState.zoom * zoomFactor))
    
    updateCanvasState(activeTabId, { zoom: newZoom })
  }, [activeTabId, canvasState.zoom, updateCanvasState])

  // Create a stable dependency that changes when canvas data actually changes
  const canvasDataId = useMemo(() => {
    if (!canvasData) return 'null'
    // Create a stable ID based on content, not reference
    const sampleData = Array.from(canvasData.data.slice(0, 32))
    const nonZeroPixels = Array.from(canvasData.data).filter((_, i) => i % 4 === 3 && (canvasData.data[i] ?? 0) > 0).length
    return `${canvasData.width}x${canvasData.height}-${sampleData.join(',')}-pixels:${nonZeroPixels}`
  }, [canvasData])
  
  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasData) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Set canvas size
    canvas.width = project.width * canvasState.zoom
    canvas.height = project.height * canvasState.zoom

    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false

    // Clear canvas with transparency (no white fill)
    ctx.clearRect(0, 0, canvas.width, canvas.height)


    // Create ImageData from pixel data
    if (canvasData.data.length === 0) {
      // Create empty data with proper size
      const emptyData = new Uint8ClampedArray(project.width * project.height * 4)
      const imageData = new ImageData(emptyData, project.width, project.height)
      
      // Create temporary canvas for scaling
      const tempCanvas = createPixelCanvas(project.width, project.height)
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(imageData, 0, 0)
      
      // Draw scaled image
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
    } else {
      const imageData = new ImageData(new Uint8ClampedArray(canvasData.data), project.width, project.height)
      
      // Create temporary canvas for scaling
      const tempCanvas = createPixelCanvas(project.width, project.height)
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(imageData, 0, 0)
      
      // Draw scaled image
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
    }

    // Draw grid if zoomed in enough
    if (canvasState.zoom >= 4) {
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
  }, [canvasData, project, canvasState.zoom, canvasDataId])

  return (
    <div 
      ref={containerRef}
      className="relative flex h-full items-center justify-center overflow-hidden bg-gray-100"
      onWheel={handleWheel}
    >
      <div 
        className="relative"
        style={{
          transform: `translate(${canvasState.panX}px, ${canvasState.panY}px)`
        }}
      >
        {/* Transparent checkerboard background - classic checkerboard pattern */}
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
            imageRendering: 'pixelated'
          }}
        />
        
        <canvas
          ref={canvasRef}
          className="pixel-canvas border-2 border-gray-300 shadow-lg relative z-10"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: canvasState.tool === 'pan' ? 'grab' : 
                   canvasState.tool === 'eyedropper' ? 'crosshair' : 'crosshair',
            backgroundColor: 'transparent',
            imageRendering: 'pixelated'
          }}
        />
        
        {/* Tool indicator */}
        <div className="absolute -top-8 left-0 rounded bg-black/75 px-2 py-1 text-xs text-white">
          {canvasState.tool === 'eyedropper' ? 'Color Picker - click to pick color' :
           `${canvasState.tool} | ${canvasState.zoom}x`}
        </div>
      </div>
    </div>
  )
}