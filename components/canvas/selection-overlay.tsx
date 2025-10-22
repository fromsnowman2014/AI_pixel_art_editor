'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectionOverlayProps {
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null
  dragPreview?: {
    startX: number
    startY: number
    currentX: number
    currentY: number
    type: 'rectangle' | 'circle'
  } | null
  zoom: number
  panX: number
  panY: number
  canvasWidth?: number
  canvasHeight?: number
  className?: string
}

export function SelectionOverlay({
  bounds,
  dragPreview,
  zoom,
  panX,
  panY,
  canvasWidth = 800,
  canvasHeight = 600,
  className
}: SelectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw completed selection (marching ants)
      if (bounds) {
        const x = (bounds.minX * zoom) + panX
        const y = (bounds.minY * zoom) + panY
        const width = (bounds.maxX - bounds.minX + 1) * zoom
        const height = (bounds.maxY - bounds.minY + 1) * zoom

        ctx.save()
        const dashLength = 4
        const dashOffset = (Date.now() / 50) % (dashLength * 2)

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.setLineDash([dashLength, dashLength])
        ctx.lineDashOffset = -dashOffset
        ctx.strokeRect(x, y, width, height)

        ctx.strokeStyle = '#000000'
        ctx.lineDashOffset = -dashOffset + dashLength
        ctx.strokeRect(x, y, width, height)
        ctx.restore()
      }

      // Draw drag preview
      if (dragPreview) {
        const x1 = (dragPreview.startX * zoom) + panX
        const y1 = (dragPreview.startY * zoom) + panY
        const x2 = (dragPreview.currentX * zoom) + panX
        const y2 = (dragPreview.currentY * zoom) + panY

        ctx.save()
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)' // Blue
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])

        if (dragPreview.type === 'rectangle') {
          const width = x2 - x1
          const height = y2 - y1
          ctx.strokeRect(x1, y1, width, height)
          ctx.fillRect(x1, y1, width, height)
        } else if (dragPreview.type === 'circle') {
          const centerX = x1
          const centerY = y1
          const radiusX = Math.abs(x2 - x1)
          const radiusY = Math.abs(y2 - y1)

          ctx.beginPath()
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fill()
        }
        ctx.restore()
      }

      // Continue animation if we have bounds or drag preview
      if (bounds || dragPreview) {
        animationFrameRef.current = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [bounds, dragPreview, zoom, panX, panY, canvasWidth, canvasHeight])

  if (!bounds && !dragPreview) return null

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 pointer-events-none',
        className
      )}
      style={{
        imageRendering: 'pixelated'
      }}
    />
  )
}
