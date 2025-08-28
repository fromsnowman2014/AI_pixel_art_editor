'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import { createPixelCanvas, hexToRgb } from '@/lib/utils'
import type { Project, PixelData, CanvasState } from '@/lib/types/api'
import { performMagicWandSelection, clearSelection } from '@/lib/core/magic-wand'

// Simplified debug logging
import { canvasDebug } from '@/lib/ui/debug'

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
    getActiveTab,
  } = useProjectStore()

  // Get playback state for optimized rendering
  const activeTab = getActiveTab()
  const isPlaying = activeTab?.isPlaying || false

  // Handle keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeTabId || !canvasState.selection) return

      switch (e.key) {
        case 'Escape':
          // Clear selection
          if (canvasState.selection.isActive) {
            e.preventDefault()
            updateCanvasState(activeTabId, {
              selection: {
                isActive: false,
                selectedPixels: new Set(),
                bounds: null,
                tolerance: canvasState.selection.tolerance
              }
            })
            canvasDebug('SELECTION', 'Selection cleared via Escape key')
          }
          break
        case 'Delete':
        case 'Backspace':
          // Delete selected pixels
          if (canvasState.selection.isActive && canvasState.selection.selectedPixels.size > 0 && canvasData) {
            e.preventDefault()
            const newData = new Uint8ClampedArray(canvasData.data)
            
            // Make selected pixels transparent
            for (const pixelKey of Array.from(canvasState.selection.selectedPixels)) {
              const coords = pixelKey.split(',').map(Number)
              if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
                const x = coords[0]
                const y = coords[1]
                const index = (y * project.width + x) * 4
                newData[index + 3] = 0 // Set alpha to 0 (transparent)
              }
            }

            const updatedCanvasData = {
              ...canvasData,
              data: newData
            }

            updateCanvasData(activeTabId, updatedCanvasData)
            
            // Clear selection after deletion
            updateCanvasState(activeTabId, {
              selection: {
                isActive: false,
                selectedPixels: new Set(),
                bounds: null,
                tolerance: canvasState.selection.tolerance
              }
            })
            
            canvasDebug('SELECTION', `Deleted ${canvasState.selection.selectedPixels.size} selected pixels`)
          }
          break
        case 'a':
        case 'A':
          // Select all (Ctrl+A)
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (canvasData) {
              const allPixels = new Set<string>()
              for (let y = 0; y < project.height; y++) {
                for (let x = 0; x < project.width; x++) {
                  allPixels.add(`${x},${y}`)
                }
              }
              
              updateCanvasState(activeTabId, {
                selection: {
                  isActive: true,
                  selectedPixels: allPixels,
                  bounds: {
                    minX: 0,
                    maxX: project.width - 1,
                    minY: 0,
                    maxY: project.height - 1
                  },
                  tolerance: canvasState.selection.tolerance
                }
              })
              
              canvasDebug('SELECTION', `Selected all ${allPixels.size} pixels`)
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, canvasState.selection, canvasData, project.width, project.height, updateCanvasState, updateCanvasData])

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
        // If there's an active selection, only draw within selection
        if (canvasState.selection?.isActive && canvasState.selection.selectedPixels.size > 0) {
          if (canvasState.selection.selectedPixels.has(`${pixelX},${pixelY}`)) {
            newData[index] = color.r
            newData[index + 1] = color.g
            newData[index + 2] = color.b
            newData[index + 3] = 255
          } else {
            return // Don't draw outside selection
          }
        } else {
          newData[index] = color.r
          newData[index + 1] = color.g
          newData[index + 2] = color.b
          newData[index + 3] = 255
        }
        break
      case 'eraser':
        // If there's an active selection, only erase within selection
        if (canvasState.selection?.isActive && canvasState.selection.selectedPixels.size > 0) {
          if (canvasState.selection.selectedPixels.has(`${pixelX},${pixelY}`)) {
            newData[index + 3] = 0 // Make transparent
          } else {
            return // Don't erase outside selection
          }
        } else {
          newData[index + 3] = 0 // Make transparent
        }
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
      case 'magic-wand':
        // Perform magic wand selection
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
        
        // Update canvas state with selection
        updateCanvasState(activeTabId, {
          selection: {
            isActive: selectionResult.pixelCount > 0,
            selectedPixels: selectionResult.selectedPixels,
            bounds: selectionResult.bounds,
            tolerance: canvasState.selection?.tolerance || 0
          }
        })
        
        canvasDebug('MAGIC_WAND', `Selected ${selectionResult.pixelCount} pixels`, {
          targetColor: selectionResult.targetColor,
          bounds: selectionResult.bounds
        })
        return
      case 'fill':
        // If there's an active selection, fill entire selection
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
          // Normal flood fill implementation
          floodFill(newData, project.width, project.height, pixelX, pixelY, color)
        }
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
    
    // Disable drawing during playback
    if (isPlaying) return

    // Simple approach: use canvas coordinates directly (no pan adjustment needed)
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - canvasRect.left
    const y = e.clientY - canvasRect.top

    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })

    if (canvasState.tool !== 'pan') {
      drawPixel(x, y)
    }
  }, [canvasState.panX, canvasState.panY, canvasState.tool, drawPixel, isPlaying])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !lastMousePos || !containerRef.current || !canvasRef.current) return
    
    // Disable drawing during playback (but allow panning)
    if (isPlaying && canvasState.tool !== 'pan') return

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
  }, [isDragging, lastMousePos, canvasState, activeTabId, updateCanvasState, drawPixel, isPlaying])

  const handleMouseUp = useCallback(() => {
    if (isDragging && canvasData && activeTabId && canvasState.tool !== 'pan' && !isPlaying) {
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
  }, [isDragging, canvasData, activeTabId, canvasState.tool, addHistoryEntry, project.activeFrameId, regenerateFrameThumbnail, isPlaying])

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    
    if (!activeTabId) return

    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8
    const newZoom = Math.max(1, Math.min(32, canvasState.zoom * zoomFactor))
    
    updateCanvasState(activeTabId, { zoom: newZoom })
  }, [activeTabId, canvasState.zoom, updateCanvasState])

  // Create a stable dependency that changes when canvas data actually changes
  // Optimized for playback performance
  const canvasDataId = useMemo(() => {
    if (!canvasData) return 'null'
    
    // For playback optimization: use a lighter hash for frequent updates
    const width = canvasData.width
    const height = canvasData.height
    const dataLength = canvasData.data.length
    
    // Sample fewer pixels for better performance during playback
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

    // Clear canvas with proper transparency handling
    // During playback, ensure background transparency is preserved
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // PLAYBACK FIX: Ensure canvas context maintains transparency
    if (isPlaying) {
      ctx.globalCompositeOperation = 'source-over'
      ctx.save()
    }


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

    // PLAYBACK FIX: Restore canvas context after frame rendering
    if (isPlaying) {
      ctx.restore()
    }

    // Draw grid if zoomed in enough and not playing (for performance)
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

    // Draw selection overlay
    if (canvasState.selection?.isActive && canvasState.selection.selectedPixels.size > 0) {
      // Create animated marching ants effect
      const time = Date.now() / 100
      const dashOffset = (time % 20)
      
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.lineDashOffset = -dashOffset
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      
      // Draw selection for each selected pixel
      for (const pixelKey of Array.from(canvasState.selection.selectedPixels)) {
        const coords = pixelKey.split(',').map(Number)
        if (coords.length === 2 && coords[0] !== undefined && coords[1] !== undefined) {
          const x = coords[0]
          const y = coords[1]
          const screenX = x * canvasState.zoom
          const screenY = y * canvasState.zoom
          const size = canvasState.zoom
          
          // Draw marching ants border
          ctx.strokeRect(screenX, screenY, size, size)
        }
      }
      
      // Draw white dashes for contrast
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
      
      // Draw selection bounds indicator
      if (canvasState.selection.bounds) {
        const bounds = canvasState.selection.bounds
        const boundsX = bounds.minX * canvasState.zoom
        const boundsY = bounds.minY * canvasState.zoom
        const boundsWidth = (bounds.maxX - bounds.minX + 1) * canvasState.zoom
        const boundsHeight = (bounds.maxY - bounds.minY + 1) * canvasState.zoom
        
        ctx.save()
        ctx.strokeStyle = '#007AFF'
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.globalAlpha = 0.7
        
        // Draw selection bounds rectangle
        ctx.strokeRect(boundsX - 1, boundsY - 1, boundsWidth + 2, boundsHeight + 2)
        
        ctx.restore()
      }
    }
  }, [canvasData, project, canvasState.zoom, canvasDataId, isPlaying, canvasState.selection])

  // Animation loop for marching ants selection
  useEffect(() => {
    if (!canvasState.selection?.isActive || canvasState.selection.selectedPixels.size === 0) {
      return
    }

    let animationId: number
    const animate = () => {
      // Force re-render for marching ants animation
      const canvas = canvasRef.current
      if (canvas) {
        // Trigger re-render by updating canvas data dependency
        // The main render effect will handle the actual drawing
        setIsDragging(prev => prev) // No-op state update to trigger re-render
      }
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [canvasState.selection?.isActive, canvasState.selection?.selectedPixels.size])

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
        {/* Transparent checkerboard background - enhanced for playback stability */}
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
            // PLAYBACK FIX: Ensure background remains stable during animation
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
          style={{
            cursor: isPlaying ? 'not-allowed' : 
                   canvasState.tool === 'pan' ? 'grab' : 
                   canvasState.tool === 'eyedropper' ? 'crosshair' : 'crosshair',
            backgroundColor: 'transparent',
            imageRendering: 'pixelated',
            zIndex: 2 // Ensure canvas is above checkerboard background
            // PLAYBACK FIX: Remove opacity change that causes "bright transparent background"
            // opacity: isPlaying ? 0.9 : 1 // Removed - was causing visual issues
          }}
        />
        
        {/* Tool indicator */}
        <div className="absolute -top-8 left-0 rounded bg-black/75 px-2 py-1 text-xs text-white">
          {isPlaying ? '🎬 Playing Animation - editing disabled' :
           canvasState.tool === 'eyedropper' ? 'Color Picker - click to pick color' :
           canvasState.tool === 'magic-wand' ? (
             canvasState.selection?.isActive 
               ? `🪄 ${canvasState.selection.selectedPixels.size} pixels selected | ${canvasState.zoom}x`
               : `🪄 Magic Wand - click to select pixels | ${canvasState.zoom}x`
           ) :
           `${canvasState.tool} | ${canvasState.zoom}x`}
        </div>
      </div>
    </div>
  )
}