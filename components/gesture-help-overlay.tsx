/**
 * Gesture Help Overlay Component
 */

import React from 'react'
import { GestureShortcut } from '@/lib/utils/gesture-shortcuts'

interface GestureHelpOverlayProps {
  shortcuts: GestureShortcut[]
  isVisible: boolean
  onClose: () => void
}

export function GestureHelpOverlay({ 
  shortcuts, 
  isVisible, 
  onClose 
}: GestureHelpOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Touch Gestures</h3>
          <p className="text-sm text-gray-600 mt-1">Available gesture shortcuts</p>
        </div>
        
        <div className="p-4 space-y-3">
          {shortcuts.map(shortcut => (
            <div key={shortcut.id} className="flex items-start space-x-3 p-2 rounded-lg bg-gray-50">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">{shortcut.fingers}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">{shortcut.name}</h4>
                <p className="text-xs text-gray-600 mt-1">{shortcut.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors touch-button"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}