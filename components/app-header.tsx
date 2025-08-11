'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Heart, Shield, Users, Settings } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'

interface AppHeaderProps {
  onSettingsClick?: () => void
}

export function AppHeader({ onSettingsClick }: AppHeaderProps) {
  const { userMode, user, reset } = useAuthStore()

  const handleChangeMode = () => {
    if (confirm('Changing modes will refresh the app and may lose unsaved work. Continue?')) {
      reset()
      window.location.reload()
    }
  }

  const modeConfig = {
    anonymous: {
      icon: Shield,
      label: 'Local Mode',
      description: 'Safe & Private - No data saved online',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    parent: {
      icon: Users,
      label: 'Cloud Mode',
      description: 'Parent/Teacher - Full features with cloud sync',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  }

  const config = userMode ? modeConfig[userMode] : null
  const IconComponent = config?.icon

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

            {/* Change Mode Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChangeMode}
              className="text-xs"
            >
              Change Mode
            </Button>
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