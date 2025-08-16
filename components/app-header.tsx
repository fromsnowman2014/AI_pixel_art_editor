'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Heart, Shield, Users, Settings } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'

interface AppHeaderProps {
  onSettingsClick?: () => void
}

export function AppHeader({ onSettingsClick }: AppHeaderProps) {
  const { user } = useAuthStore()

  // Simplified local mode configuration
  const config = {
    icon: Shield,
    label: 'Local Mode',
    description: 'Safe & Private - All data stays on your device',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }

  const IconComponent = config.icon

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">PixelBuddy</h1>
            <p className="text-xs text-gray-500">AI Pixel Art Studio for Kids</p>
          </div>
        </div>

        {/* Mode Indicator */}
        {config && IconComponent && (
          <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
            <div className="flex items-center space-x-2">
              <IconComponent className={`h-4 w-4 ${config.color}`} />
              <div>
                <p className={`font-medium text-sm ${config.color}`}>{config.label}</p>
                <p className="text-xs text-gray-600">{config.description}</p>
              </div>
            </div>
            
            {/* AI Calls Remaining */}
            {user && (
              <div className="text-xs text-gray-500 pl-2 border-l border-gray-300">
                AI calls: {user.rateLimits.ai}/hour
              </div>
            )}

          </div>
        )}

        {/* Settings */}
        <div className="flex items-center space-x-2">
          {onSettingsClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettingsClick}
              className="p-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}