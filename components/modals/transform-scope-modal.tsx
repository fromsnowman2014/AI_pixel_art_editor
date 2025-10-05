'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '@/lib/stores/project-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { RotateCcw, RotateCw, FlipVertical2 } from 'lucide-react'
import type { TransformType, TransformScope } from '@/lib/utils/canvas-transform'
import {
  flipHorizontal,
  flipVertical,
  rotate90Clockwise,
  rotate180,
  rotate270Clockwise,
  rotateFree,
} from '@/lib/utils/canvas-transform'

interface TransformScopeModalProps {
  isOpen: boolean
  onClose: () => void
  transformType: TransformType
}

export function TransformScopeModal({
  isOpen,
  onClose,
  transformType,
}: TransformScopeModalProps) {
  const {
    activeTabId,
    getActiveTab,
    flipHorizontal: storeFlipH,
    flipVertical: storeFlipV,
    rotateCanvas,
    rotateFreeCanvas,
  } = useProjectStore()

  const [scope, setScope] = useState<TransformScope>('current')
  const [rotationAngle, setRotationAngle] = useState(90)
  const [freeRotationAngle, setFreeRotationAngle] = useState(0)
  const previewRef = useRef<HTMLCanvasElement>(null)

  const activeTab = getActiveTab()
  const frames = activeTab?.frames || []
  const currentFrameIndex = frames.findIndex(
    (f) => f.id === activeTab?.project.activeFrameId
  )

  // Preview update effect
  useEffect(() => {
    if (!isOpen || !previewRef.current || !activeTab?.canvasData) return

    const canvas = previewRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Apply transform for preview
    let transformedData = activeTab.canvasData

    try {
      switch (transformType) {
        case 'flip-h':
          transformedData = flipHorizontal(transformedData)
          break
        case 'flip-v':
          transformedData = flipVertical(transformedData)
          break
        case 'rotate-90':
          if (rotationAngle === 90) transformedData = rotate90Clockwise(transformedData)
          else if (rotationAngle === 180) transformedData = rotate180(transformedData)
          else if (rotationAngle === 270) transformedData = rotate270Clockwise(transformedData)
          break
        case 'rotate-free':
          transformedData = rotateFree(transformedData, freeRotationAngle)
          break
      }

      // Render preview with 2x zoom
      const scale = 2
      canvas.width = transformedData.width * scale
      canvas.height = transformedData.height * scale
      ctx.imageSmoothingEnabled = false

      const imageData = new ImageData(
        new Uint8ClampedArray(transformedData.data),
        transformedData.width,
        transformedData.height
      )
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = transformedData.width
      tempCanvas.height = transformedData.height
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(imageData, 0, 0)

      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
    } catch (error) {
      console.error('Preview render error:', error)
    }
  }, [isOpen, transformType, rotationAngle, freeRotationAngle, activeTab?.canvasData])

  const handleApply = () => {
    if (!activeTabId) return

    switch (transformType) {
      case 'flip-h':
        storeFlipH(activeTabId, scope)
        break
      case 'flip-v':
        storeFlipV(activeTabId, scope)
        break
      case 'rotate-90':
        rotateCanvas(activeTabId, rotationAngle as 90 | 180 | 270, scope)
        break
      case 'rotate-free':
        rotateFreeCanvas(activeTabId, freeRotationAngle, scope)
        break
    }

    onClose()
  }

  const getTitle = () => {
    switch (transformType) {
      case 'flip-h': return 'Flip Horizontal'
      case 'flip-v': return 'Flip Vertical'
      case 'rotate-90': return 'Rotate Canvas'
      case 'rotate-free': return 'Free Rotation'
    }
  }

  const getDescription = () => {
    switch (transformType) {
      case 'flip-h': return 'Mirror your canvas horizontally'
      case 'flip-v': return 'Mirror your canvas vertically'
      case 'rotate-90': return 'Rotate your canvas in 90° increments'
      case 'rotate-free': return 'Rotate your canvas by any angle'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="border rounded p-4 bg-gray-50 flex justify-center items-center min-h-[200px]">
          <canvas
            ref={previewRef}
            className="pixel-canvas border border-gray-300"
            style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '300px' }}
          />
        </div>

        {/* Scope Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Apply to:</Label>
          <RadioGroup value={scope} onValueChange={(v: string) => setScope(v as TransformScope)}>
            <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="current" id="current" />
              <Label htmlFor="current" className="flex flex-col flex-1 cursor-pointer">
                <span className="font-semibold">Current Frame Only</span>
                <span className="text-xs text-gray-500">
                  Apply to Frame {currentFrameIndex + 1}
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex flex-col flex-1 cursor-pointer">
                <span className="font-semibold">All Frames</span>
                <span className="text-xs text-gray-500">
                  Apply to all {frames.length} frames
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Rotation Direction Selection */}
        {transformType === 'rotate-90' && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Rotation Direction:</Label>
            <div className="grid grid-cols-3 gap-2">
              {/* Rotate Left 90° */}
              <Button
                type="button"
                variant={rotationAngle === 270 ? 'default' : 'outline'}
                className={`flex flex-col items-center justify-center h-20 ${
                  rotationAngle === 270 ? 'bg-blue-500 text-white' : ''
                }`}
                onClick={() => setRotationAngle(270)}
              >
                <RotateCcw className="h-6 w-6 mb-1" />
                <span className="text-xs font-semibold">Rotate Left</span>
                <span className="text-xs opacity-70">90° CCW</span>
              </Button>

              {/* Rotate 180° */}
              <Button
                type="button"
                variant={rotationAngle === 180 ? 'default' : 'outline'}
                className={`flex flex-col items-center justify-center h-20 ${
                  rotationAngle === 180 ? 'bg-blue-500 text-white' : ''
                }`}
                onClick={() => setRotationAngle(180)}
              >
                <FlipVertical2 className="h-6 w-6 mb-1" />
                <span className="text-xs font-semibold">Flip 180°</span>
                <span className="text-xs opacity-70">Upside Down</span>
              </Button>

              {/* Rotate Right 90° */}
              <Button
                type="button"
                variant={rotationAngle === 90 ? 'default' : 'outline'}
                className={`flex flex-col items-center justify-center h-20 ${
                  rotationAngle === 90 ? 'bg-blue-500 text-white' : ''
                }`}
                onClick={() => setRotationAngle(90)}
              >
                <RotateCw className="h-6 w-6 mb-1" />
                <span className="text-xs font-semibold">Rotate Right</span>
                <span className="text-xs opacity-70">90° CW</span>
              </Button>
            </div>
          </div>
        )}

        {/* Free Rotation Slider */}
        {transformType === 'rotate-free' && (
          <div className="space-y-2">
            <Label className="font-semibold">Rotation Angle: {freeRotationAngle}°</Label>
            <Slider
              min={-180}
              max={180}
              step={1}
              value={[freeRotationAngle]}
              onValueChange={([angle]: number[]) => setFreeRotationAngle(angle ?? 0)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>-180°</span>
              <span>0°</span>
              <span>180°</span>
            </div>
            <p className="text-xs text-amber-600">
              💡 For best pixel art quality, we recommend 90° increments
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
