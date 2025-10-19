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
  zoom: number
  panX: number
  panY: number
  className?: string
}

export function SelectionOverlay({
  bounds,
  zoom,
  panX,
  panY,
  className
}: SelectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bounds) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate selection rectangle in screen coordinates
    const x = (bounds.minX * zoom) + panX
    const y = (bounds.minY * zoom) + panY
    const width = (bounds.maxX - bounds.minX + 1) * zoom
    const height = (bounds.maxY - bounds.minY + 1) * zoom

    // Draw marching ants border
    ctx.save()

    // Create dashed line effect (marching ants)
    const dashLength = 4
    const dashOffset = (Date.now() / 50) % (dashLength * 2)

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.setLineDash([dashLength, dashLength])
    ctx.lineDashOffset = -dashOffset
    ctx.strokeRect(x, y, width, height)

    // Draw black dashed line offset (for contrast)
    ctx.strokeStyle = '#000000'
    ctx.lineDashOffset = -dashOffset + dashLength
    ctx.strokeRect(x, y, width, height)

    ctx.restore()

    // Animate marching ants
    const animationFrame = requestAnimationFrame(() => {
      canvasRef.current?.dispatchEvent(new Event('update'))
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [bounds, zoom, panX, panY])

  if (!bounds) return null

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 pointer-events-none',
        className
      )}
      style={{
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated'
      }}
    />
  )
}
