'use client'

import { useEffect, useRef, memo } from 'react'
import { getBrushOffsets, type BrushShape } from '@/lib/core/brush-patterns'
import { hexToRgb } from '@/lib/utils'

interface BrushCursorOverlayProps {
  mousePixelX: number
  mousePixelY: number
  brushSize: number
  brushShape: BrushShape
  tool: string
  color: string
  zoom: number
  canvasWidth: number
  canvasHeight: number
  projectWidth: number
  projectHeight: number
}

function BrushCursorOverlayInner({
  mousePixelX,
  mousePixelY,
  brushSize,
  brushShape,
  tool,
  color,
  zoom,
  canvasWidth,
  canvasHeight,
  projectWidth,
  projectHeight,
}: BrushCursorOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasWidth
    canvas.height = canvasHeight

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const offsets = getBrushOffsets(brushSize, brushShape)

    // Determine fill and stroke colors based on tool
    let fillColor: string
    let strokeColor: string

    if (tool === 'eraser') {
      fillColor = 'rgba(255, 0, 0, 0.15)'
      strokeColor = '#ef4444'
    } else {
      const rgb = hexToRgb(color)
      if (rgb) {
        fillColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
      } else {
        fillColor = 'rgba(0, 0, 0, 0.3)'
      }
      strokeColor = '#3b82f6'
    }

    // Draw each pixel in the brush pattern
    for (const { dx, dy } of offsets) {
      const px = mousePixelX + dx
      const py = mousePixelY + dy

      // Bounds check
      if (px < 0 || px >= projectWidth || py < 0 || py >= projectHeight) continue

      const screenX = px * zoom
      const screenY = py * zoom

      // Fill
      ctx.fillStyle = fillColor
      ctx.fillRect(screenX, screenY, zoom, zoom)

      // Dashed stroke border
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.strokeRect(screenX + 0.5, screenY + 0.5, zoom - 1, zoom - 1)
    }

    // Reset line dash
    ctx.setLineDash([])
  }, [mousePixelX, mousePixelY, brushSize, brushShape, tool, color, zoom, canvasWidth, canvasHeight, projectWidth, projectHeight])

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0"
      style={{
        pointerEvents: 'none',
        zIndex: 4,
        imageRendering: 'pixelated',
      }}
      aria-hidden="true"
    />
  )
}

export const BrushCursorOverlay = memo(BrushCursorOverlayInner)
