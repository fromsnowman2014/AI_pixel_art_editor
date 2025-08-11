'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { createPixelCanvas, hexToRgb } from '@/lib/utils'
import type { Project, PixelData, CanvasState } from '@/lib/types/api'

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
  } = useProjectStore()

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
        const currentColor = `#${[
          (newData[index] || 0).toString(16).padStart(2, '0'),
          (newData[index + 1] || 0).toString(16).padStart(2, '0'),
          (newData[index + 2] || 0).toString(16).padStart(2, '0')
        ].join('')}`
        updateCanvasState(activeTabId, { color: currentColor })
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
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - canvasState.panX
    const y = e.clientY - rect.top - canvasState.panY

    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })

    if (canvasState.tool !== 'pan') {
      drawPixel(x, y)
    }
  }, [canvasState.panX, canvasState.panY, canvasState.tool, drawPixel])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !lastMousePos || !containerRef.current) return

    if (canvasState.tool === 'pan') {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y
      
      if (activeTabId) {
        updateCanvasState(activeTabId, {
          panX: canvasState.panX + deltaX,
          panY: canvasState.panY + deltaY
        })
      }
    } else {
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - canvasState.panX
      const y = e.clientY - rect.top - canvasState.panY
      drawPixel(x, y)
    }

    setLastMousePos({ x: e.clientX, y: e.clientY })
  }, [isDragging, lastMousePos, canvasState, activeTabId, updateCanvasState, drawPixel])

  const handleMouseUp = useCallback(() => {
    if (isDragging && canvasData && activeTabId && canvasState.tool !== 'pan') {
      addHistoryEntry(activeTabId, `${canvasState.tool}_draw`, canvasData)
    }
    setIsDragging(false)
    setLastMousePos(null)
  }, [isDragging, canvasData, activeTabId, canvasState.tool, addHistoryEntry])

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    
    if (!activeTabId) return

    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8
    const newZoom = Math.max(1, Math.min(32, canvasState.zoom * zoomFactor))
    
    updateCanvasState(activeTabId, { zoom: newZoom })
  }, [activeTabId, canvasState.zoom, updateCanvasState])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = project.width * canvasState.zoom
    canvas.height = project.height * canvasState.zoom

    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false

    // Clear canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Create ImageData from pixel data
    const imageData = new ImageData(new Uint8ClampedArray(canvasData.data), project.width, project.height)
    
    // Create temporary canvas for scaling
    const tempCanvas = createPixelCanvas(project.width, project.height)
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)

    // Draw scaled image
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)

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
  }, [canvasData, project, canvasState.zoom])

  return (
    <div 
      ref={containerRef}
      className="relative flex h-full items-center justify-center overflow-hidden bg-gray-100"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div 
        className="relative"
        style={{
          transform: `translate(${canvasState.panX}px, ${canvasState.panY}px)`
        }}
      >
        <canvas
          ref={canvasRef}
          className="pixel-canvas border-2 border-gray-300 shadow-lg"
          style={{
            cursor: canvasState.tool === 'pan' ? 'grab' : 'crosshair'
          }}
        />
        
        {/* Tool indicator */}
        <div className="absolute -top-8 left-0 rounded bg-black/75 px-2 py-1 text-xs text-white">
          {canvasState.tool} | {canvasState.zoom}x
        </div>
      </div>
    </div>
  )
}