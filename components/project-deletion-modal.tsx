'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Save, Trash2, X, AlertTriangle } from 'lucide-react'

interface ProjectDeletionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  framesWithContent: number
  totalFrames: number
  onSaveAndClose: () => void
  onDiscardAndClose: () => void
  isLoading?: boolean
}

export function ProjectDeletionModal({
  open,
  onOpenChange,
  projectName,
  framesWithContent,
  totalFrames,
  onSaveAndClose,
  onDiscardAndClose,
  isLoading = false
}: ProjectDeletionModalProps) {
  if (!open) return null

  const frameText = framesWithContent === 1 
    ? '1 frame contains' 
    : `${framesWithContent} frames contain`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-orange-50 border-b border-orange-100 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                You have artwork to save!
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Project Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Project:</div>
              <div className="font-medium text-gray-900 truncate">{projectName}</div>
              <div className="text-sm text-gray-500 mt-2">
                {frameText} your drawings ({totalFrames} total frames)
              </div>
            </div>

            {/* Warning Message */}
            <div className="text-gray-700 text-center">
              What would you like to do with your artwork?
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 space-y-3">
          {/* Primary Action: Save & Close */}
          <Button
            onClick={onSaveAndClose}
            disabled={isLoading}
            className={cn(
              "w-full h-12 text-base font-medium",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "transition-all duration-200",
              "shadow-sm hover:shadow-md",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <Save className="h-5 w-5 mr-3" />
            {isLoading ? 'Saving...' : 'Save & Close Project'}
          </Button>

          {/* Secondary Actions Row */}
          <div className="flex space-x-3">
            {/* Discard Button */}
            <Button
              onClick={onDiscardAndClose}
              disabled={isLoading}
              variant="outline"
              className={cn(
                "flex-1 h-10 text-sm font-medium",
                "border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300",
                "transition-all duration-200",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>

            {/* Cancel Button */}
            <Button
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              variant="ghost"
              className={cn(
                "flex-1 h-10 text-sm font-medium",
                "text-gray-600 hover:bg-gray-100",
                "transition-all duration-200",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Simple confirmation modal for projects without content
 */
interface SimpleConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  onConfirm: () => void
  isLoading?: boolean
}

export function SimpleConfirmationModal({
  open,
  onOpenChange,
  projectName,
  onConfirm,
  isLoading = false
}: SimpleConfirmationModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl mx-4 overflow-hidden">
        {/* Content */}
        <div className="px-6 py-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <X className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Close Project
              </h3>
              <p className="text-sm text-gray-600">
                Close "{projectName}"? This project is empty.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 flex space-x-3">
          <Button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            variant="outline"
            className="flex-1 h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 h-10 bg-gray-900 hover:bg-gray-800"
          >
            {isLoading ? 'Closing...' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  )
}