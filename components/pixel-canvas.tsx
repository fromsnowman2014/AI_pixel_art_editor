'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { createPixelCanvas, hexToRgb } from '@/lib/utils'
import type { Project, PixelData, CanvasState } from '@/lib/types/api'

// Debug logging utility
const DEBUG_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.localStorage?.getItem('pixelbuddy-debug') === 'true')
const debugLog = (category: string, message: string, data?: any) => {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown'
    console.log(`[${timestamp}] 🎨 PixelCanvas [${category}]:`, message, data || '')
  }
}

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

  // Debug component mount and props
  useEffect(() => {
    debugLog('COMPONENT_MOUNT', 'PixelCanvas component mounted', {
      projectId: project.id,
      projectName: project.name,
      projectSize: `${project.width}x${project.height}`,
      hasCanvasData: !!canvasData,
      canvasDataLength: canvasData?.data.length,
      activeTabId,
      currentTool: canvasState.tool,
      currentColor: canvasState.color,
      zoom: canvasState.zoom
    })
  }, [])

  // Debug props changes
  useEffect(() => {
    debugLog('PROPS_UPDATE', 'PixelCanvas props updated', {
      hasCanvasData: !!canvasData,
      canvasDataLength: canvasData?.data.length,
      canvasDataChanged: true, // We can't easily compare without previous value
      tool: canvasState.tool,
      color: canvasState.color,
      zoom: canvasState.zoom,
      activeTabId,
      updateTimestamp: Date.now(),
      propsChangeReason: 'React props/state change detected'
    })
    
    // Log the actual canvas data to verify it contains the drawing
    if (canvasData) {
      const firstNonZeroPixel = Array.from(canvasData.data).findIndex((value, index) => {
        // Check for non-transparent pixels
        return index % 4 === 3 && value > 0
      })
      debugLog('PROPS_CANVAS_DATA_CHECK', 'Canvas data content analysis', {
        totalPixels: canvasData.data.length / 4,
        firstNonZeroPixelIndex: firstNonZeroPixel,
        hasDrawnContent: firstNonZeroPixel >= 0,
        dataPreview: Array.from(canvasData.data.slice(0, 32)).join(',')
      })
    }
  }, [canvasData, canvasState, activeTabId])

  // Handle drawing on canvas
  const drawPixel = useCallback((x: number, y: number) => {
    debugLog('DRAW_START', `Drawing at (${x}, ${y})`, { 
      canvasData: !!canvasData, 
      activeTabId, 
      tool: canvasState.tool, 
      color: canvasState.color,
      zoom: canvasState.zoom 
    })

    if (!canvasData || !activeTabId) {
      debugLog('DRAW_EARLY_EXIT', 'Missing canvasData or activeTabId', { canvasData: !!canvasData, activeTabId })
      return
    }

    const pixelX = Math.floor(x / canvasState.zoom)
    const pixelY = Math.floor(y / canvasState.zoom)
    
    debugLog('DRAW_COORDS', `Pixel coordinates: (${pixelX}, ${pixelY})`, { 
      screenX: x, screenY: y, zoom: canvasState.zoom,
      projectSize: `${project.width}x${project.height}`,
      conversionCalc: `${x}/${canvasState.zoom} = ${x / canvasState.zoom}, ${y}/${canvasState.zoom} = ${y / canvasState.zoom}`,
      flooredResults: `floor(${x / canvasState.zoom}) = ${pixelX}, floor(${y / canvasState.zoom}) = ${pixelY}`,
      validRange: `x: 0-${project.width-1}, y: 0-${project.height-1}`
    })
    
    if (pixelX < 0 || pixelX >= project.width || pixelY < 0 || pixelY >= project.height) {
      debugLog('DRAW_OUT_OF_BOUNDS', `Coordinates out of bounds: (${pixelX}, ${pixelY})`)
      return
    }

    const color = hexToRgb(canvasState.color)
    if (!color) {
      debugLog('DRAW_INVALID_COLOR', `Invalid color: ${canvasState.color}`)
      return
    }

    const newData = new Uint8ClampedArray(canvasData.data)
    const index = (pixelY * project.width + pixelX) * 4

    debugLog('DRAW_BEFORE', `Pixel data before change at index ${index}`, {
      r: newData[index], g: newData[index + 1], b: newData[index + 2], a: newData[index + 3]
    })

    // Apply tool-specific drawing logic
    switch (canvasState.tool) {
      case 'pencil':
        newData[index] = color.r
        newData[index + 1] = color.g
        newData[index + 2] = color.b
        newData[index + 3] = 255
        debugLog('DRAW_PENCIL', `Applied pencil with color`, { r: color.r, g: color.g, b: color.b })
        break
      case 'eraser':
        newData[index + 3] = 0 // Make transparent
        debugLog('DRAW_ERASER', `Applied eraser (made transparent)`)
        break
      case 'eyedropper':
        const currentColor = `#${[
          (newData[index] || 0).toString(16).padStart(2, '0'),
          (newData[index + 1] || 0).toString(16).padStart(2, '0'),
          (newData[index + 2] || 0).toString(16).padStart(2, '0')
        ].join('')}`
        debugLog('DRAW_EYEDROPPER', `Picked color: ${currentColor}`)
        updateCanvasState(activeTabId, { color: currentColor })
        return
      case 'fill':
        debugLog('DRAW_FILL', `Starting flood fill`)
        // Simple flood fill implementation
        floodFill(newData, project.width, project.height, pixelX, pixelY, color)
        break
    }

    debugLog('DRAW_AFTER', `Pixel data after change at index ${index}`, {
      r: newData[index], g: newData[index + 1], b: newData[index + 2], a: newData[index + 3]
    })

    const updatedCanvasData = {
      ...canvasData,
      data: newData
    }

    debugLog('DRAW_UPDATE_START', `Calling updateCanvasData`, { 
      dataLength: updatedCanvasData.data.length,
      hasChange: JSON.stringify(Array.from(newData.slice(index, index + 4))) !== JSON.stringify(Array.from(canvasData.data.slice(index, index + 4)))
    })

    updateCanvasData(activeTabId, updatedCanvasData)
    
    debugLog('DRAW_UPDATE_COMPLETE', `updateCanvasData called successfully`)
    
    // Critical debug: Force a manual re-render check
    // Fix: Capture values to avoid closure issues
    const followupData = {
      activeTabId,
      currentCanvasDataLength: canvasData?.data.length
    }
    setTimeout(() => {
      debugLog('DRAW_FOLLOWUP_CHECK', 'Checking if component re-rendered after draw', {
        ...followupData,
        timestamp: Date.now()
      })
    }, 50)
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
    debugLog('MOUSE_DOWN', 'Mouse down event triggered', {
      clientX: e.clientX,
      clientY: e.clientY,
      tool: canvasState.tool,
      hasContainer: !!containerRef.current,
      hasCanvas: !!canvasRef.current
    })

    if (!containerRef.current || !canvasRef.current) {
      debugLog('MOUSE_DOWN_NO_ELEMENTS', 'Missing container or canvas ref', {
        hasContainer: !!containerRef.current,
        hasCanvas: !!canvasRef.current
      })
      return
    }

    // Use canvas element directly for accurate coordinates
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    
    // Calculate coordinates relative to canvas element, accounting for pan offset
    const rawX = e.clientX - canvasRect.left
    const rawY = e.clientY - canvasRect.top
    
    // Adjust for pan offset to get true canvas coordinates
    const x = rawX - canvasState.panX
    const y = rawY - canvasState.panY

    debugLog('MOUSE_DOWN_COORDS', 'Calculated drawing coordinates', {
      rawX: rawX,
      rawY: rawY,
      adjustedX: x,
      adjustedY: y,
      canvasRect: { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height },
      containerRect: { left: containerRect.left, top: containerRect.top, width: containerRect.width, height: containerRect.height },
      pan: { x: canvasState.panX, y: canvasState.panY },
      coordinateMethod: 'canvas-direct-with-pan-adjustment'
    })

    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })

    if (canvasState.tool !== 'pan') {
      debugLog('MOUSE_DOWN_DRAW', 'Calling drawPixel from mouse down')
      drawPixel(x, y)
    } else {
      debugLog('MOUSE_DOWN_PAN', 'Pan tool selected, skipping draw')
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
    } else {
      // Use canvas element directly for accurate coordinates
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const rawX = e.clientX - canvasRect.left
      const rawY = e.clientY - canvasRect.top
      
      // Adjust for pan offset to get true canvas coordinates
      const x = rawX - canvasState.panX
      const y = rawY - canvasState.panY
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
    debugLog('RENDER_START', 'Canvas render effect triggered', {
      hasCanvas: !!canvasRef.current,
      hasCanvasData: !!canvasData,
      canvasDataLength: canvasData?.data.length,
      zoom: canvasState.zoom,
      projectSize: `${project.width}x${project.height}`,
      canvasDataId: canvasDataId,
      triggerReason: 'useEffect dependency change'
    })
    
    // Enhanced debugging: Log what triggered this render
    debugLog('RENDER_TRIGGER_ANALYSIS', 'Analyzing render trigger', {
      canvasDataPointer: canvasData ? `${canvasData.width}x${canvasData.height}@${canvasData.data.length}` : 'null',
      projectPointer: `${project.id}-${project.width}x${project.height}`,
      zoomLevel: canvasState.zoom,
      effectDependencies: ['canvasData', 'project', 'canvasState.zoom']
    })

    const canvas = canvasRef.current
    if (!canvas || !canvasData) {
      debugLog('RENDER_EARLY_EXIT', 'Missing canvas or canvasData', {
        hasCanvas: !!canvas,
        hasCanvasData: !!canvasData
      })
      return
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      debugLog('RENDER_NO_CONTEXT', 'Failed to get 2d context')
      return
    }

    debugLog('RENDER_SETUP', 'Setting up canvas for rendering', {
      canvasSize: `${project.width * canvasState.zoom}x${project.height * canvasState.zoom}`,
      zoom: canvasState.zoom
    })

    // Set canvas size
    canvas.width = project.width * canvasState.zoom
    canvas.height = project.height * canvasState.zoom

    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false

    // Clear canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Sample a few pixels for debugging
    const samplePixels = []
    for (let i = 0; i < Math.min(20, canvasData.data.length / 4); i++) {
      const idx = i * 4
      if (canvasData.data[idx + 3] && (canvasData.data[idx + 3] ?? 0) > 0) { // Only non-transparent pixels
        samplePixels.push({
          pixel: i,
          r: canvasData.data[idx] || 0,
          g: canvasData.data[idx + 1] || 0,
          b: canvasData.data[idx + 2] || 0,
          a: canvasData.data[idx + 3] || 0
        })
      }
    }

    debugLog('RENDER_PIXEL_DATA', 'Canvas data sample', {
      totalPixels: canvasData.data.length / 4,
      nonTransparentSample: samplePixels.slice(0, 5)
    })

    // Create ImageData from pixel data
    const imageData = new ImageData(new Uint8ClampedArray(canvasData.data), project.width, project.height)
    
    // Create temporary canvas for scaling
    const tempCanvas = createPixelCanvas(project.width, project.height)
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)

    // Draw scaled image
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)

    debugLog('RENDER_COMPLETE', 'Canvas rendered successfully', {
      finalCanvasSize: `${canvas.width}x${canvas.height}`,
      imageDataDrawn: true,
      gridEnabled: canvasState.zoom >= 4,
      canvasElementId: canvas.id || 'no-id',
      canvasInDOM: document.contains(canvas),
      canvasVisible: canvas.offsetParent !== null,
      canvasComputedStyle: typeof window !== 'undefined' ? {
        display: window.getComputedStyle(canvas).display,
        visibility: window.getComputedStyle(canvas).visibility,
        opacity: window.getComputedStyle(canvas).opacity
      } : 'server-side'
    })
    
    // Additional check: Verify the canvas actually shows the drawn pixels
    if (typeof window !== 'undefined') {
      // Fix: Capture canvas data before setTimeout
      const capturedCanvasData = {
        dataChecksum: Array.from(canvasData.data.slice(0, 32)).join(','),
        nonZeroPixels: Array.from(canvasData.data).filter((_, i) => i % 4 === 3 && (canvasData.data[i] ?? 0) > 0).length
      }
      
      setTimeout(() => {
        try {
          const verifyCtx = canvas.getContext('2d', { willReadFrequently: true })
          if (verifyCtx) {
            const testData = verifyCtx.getImageData(0, 0, Math.min(32, canvas.width), Math.min(32, canvas.height))
            const hasNonWhitePixels = Array.from(testData.data).some((value, index) => {
              if (index % 4 === 3) return false // Skip alpha channel
              return value !== 255 // Not white
            })
            
            // Check actual rendered vs expected data
            const renderedNonZeroPixels = Array.from(testData.data).filter((_, i) => i % 4 === 3 && (testData.data[i] ?? 0) > 0).length
            
            debugLog('RENDER_VERIFICATION', 'Canvas content verification', {
              hasNonWhitePixels,
              expectedNonZeroPixels: capturedCanvasData.nonZeroPixels,
              actualRenderedPixels: renderedNonZeroPixels,
              renderingWorking: renderedNonZeroPixels > 0,
              sampleRenderedData: Array.from(testData.data.slice(0, 16)),
              expectedDataChecksum: capturedCanvasData.dataChecksum
            })
          }
        } catch (e) {
          debugLog('RENDER_VERIFICATION_ERROR', 'Could not verify canvas content', { error: e instanceof Error ? e.message : String(e) })
        }
      }, 100)
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