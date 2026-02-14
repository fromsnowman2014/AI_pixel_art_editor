'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Pipette } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedColorPickerProps {
  color: string
  onChange: (color: string) => void
  onClose: () => void
}

interface HSV {
  h: number // 0-360
  s: number // 0-100
  v: number // 0-100
}

interface RGB {
  r: number // 0-255
  g: number // 0-255
  b: number // 0-255
}

/**
 * Advanced Color Picker Component
 * Photoshop-style color picker with HSV/RGB inputs
 */
export function AdvancedColorPicker({ color, onChange, onClose }: AdvancedColorPickerProps) {
  const [currentColor, setCurrentColor] = useState(color)
  const [hsv, setHsv] = useState<HSV>(rgbToHsv(color))
  const [rgb, setRgb] = useState<RGB>(hexToRgb(color))
  const [hexInput, setHexInput] = useState(color)

  const svPickerRef = useRef<HTMLDivElement>(null)
  const hueSliderRef = useRef<HTMLDivElement>(null)
  const [isDraggingSV, setIsDraggingSV] = useState(false)
  const [isDraggingHue, setIsDraggingHue] = useState(false)

  // Sync color changes
  useEffect(() => {
    const newRgb = hsvToRgb(hsv)
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b)
    setRgb(newRgb)
    setCurrentColor(newHex)
    setHexInput(newHex)
  }, [hsv])

  // Handle S/V picker drag
  const handleSVPickerMove = (e: React.MouseEvent | MouseEvent) => {
    if (!svPickerRef.current) return

    const rect = svPickerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))

    const s = (x / rect.width) * 100
    const v = 100 - (y / rect.height) * 100

    setHsv(prev => ({ ...prev, s, v }))
  }

  // Handle hue slider drag
  const handleHueSliderMove = (e: React.MouseEvent | MouseEvent) => {
    if (!hueSliderRef.current) return

    const rect = hueSliderRef.current.getBoundingClientRect()
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    const h = (y / rect.height) * 360

    setHsv(prev => ({ ...prev, h }))
  }

  // Mouse event handlers for S/V picker
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSV) {
        handleSVPickerMove(e)
      }
    }

    const handleMouseUp = () => {
      setIsDraggingSV(false)
    }

    if (isDraggingSV) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingSV])

  // Mouse event handlers for hue slider
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingHue) {
        handleHueSliderMove(e)
      }
    }

    const handleMouseUp = () => {
      setIsDraggingHue(false)
    }

    if (isDraggingHue) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingHue])

  // Handle RGB input changes
  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [channel]: Math.max(0, Math.min(255, value)) }
    setRgb(newRgb)
    const newHsv = rgbToHsv(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
    setHsv(newHsv)
  }

  // Handle HSV input changes
  const handleHsvChange = (channel: 'h' | 's' | 'v', value: number) => {
    let newValue = value
    if (channel === 'h') {
      newValue = Math.max(0, Math.min(360, value))
    } else {
      newValue = Math.max(0, Math.min(100, value))
    }
    setHsv(prev => ({ ...prev, [channel]: newValue }))
  }

  // Handle hex input change
  const handleHexChange = (value: string) => {
    setHexInput(value)

    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const newRgb = hexToRgb(value)
      const newHsv = rgbToHsv(value)
      setRgb(newRgb)
      setHsv(newHsv)
      setCurrentColor(value.toUpperCase())
    }
  }

  // Apply color
  const handleApply = () => {
    onChange(currentColor)
    onClose()
  }

  const hueColor = hsvToRgb({ h: hsv.h, s: 100, v: 100 })
  const hueHex = rgbToHex(hueColor.r, hueColor.g, hueColor.b)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">Color Picker</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Color Preview */}
          <div className="flex items-center gap-3">
            <div className="space-y-1 text-xs text-gray-600">
              <div>New</div>
              <div>Current</div>
            </div>
            <div className="flex-1 h-12 rounded-lg overflow-hidden border-2 border-gray-300">
              <div className="h-1/2" style={{ backgroundColor: currentColor }} />
              <div className="h-1/2" style={{ backgroundColor: color }} />
            </div>
          </div>

          {/* Main Color Picker Area */}
          <div className="flex gap-3">
            {/* S/V Picker */}
            <div
              ref={svPickerRef}
              className="relative w-full h-48 rounded-lg cursor-crosshair overflow-hidden border border-gray-300"
              style={{
                background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})`
              }}
              onMouseDown={(e) => {
                setIsDraggingSV(true)
                handleSVPickerMove(e)
              }}
            >
              {/* Cursor */}
              <div
                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${hsv.s}%`,
                  top: `${100 - hsv.v}%`,
                  backgroundColor: currentColor
                }}
              />
            </div>

            {/* Hue Slider */}
            <div
              ref={hueSliderRef}
              className="relative w-8 h-48 rounded-lg cursor-pointer overflow-hidden border border-gray-300"
              style={{
                background: 'linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
              }}
              onMouseDown={(e) => {
                setIsDraggingHue(true)
                handleHueSliderMove(e)
              }}
            >
              {/* Cursor */}
              <div
                className="absolute w-full h-1 border-2 border-white shadow-lg -translate-y-1/2 pointer-events-none"
                style={{
                  top: `${(hsv.h / 360) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Color Inputs */}
          <div className="space-y-3">
            {/* Hex Input */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-700 w-12">Hex</label>
              <Input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
                className="flex-1 text-sm font-mono"
                placeholder="#000000"
              />
            </div>

            {/* RGB Inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">R</label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">G</label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">B</label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* HSV Inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">H</label>
                <Input
                  type="number"
                  min="0"
                  max="360"
                  value={Math.round(hsv.h)}
                  onChange={(e) => handleHsvChange('h', parseInt(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">S</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(hsv.s)}
                  onChange={(e) => handleHsvChange('s', parseInt(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">V</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(hsv.v)}
                  onChange={(e) => handleHsvChange('v', parseInt(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Color
          </Button>
        </div>
      </div>
    </div>
  )
}

// Color conversion utilities

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function rgbToHsv(hex: string): HSV {
  const { r, g, b } = hexToRgb(hex)
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rNorm) {
      h = 60 * (((gNorm - bNorm) / delta) % 6)
    } else if (max === gNorm) {
      h = 60 * ((bNorm - rNorm) / delta + 2)
    } else {
      h = 60 * ((rNorm - gNorm) / delta + 4)
    }
  }

  if (h < 0) h += 360

  const s = max === 0 ? 0 : (delta / max) * 100
  const v = max * 100

  return { h, s, v }
}

function hsvToRgb(hsv: HSV): RGB {
  const { h, s, v } = hsv
  const sNorm = s / 100
  const vNorm = v / 100

  const c = vNorm * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = vNorm - c

  let r = 0, g = 0, b = 0

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}
