'use client'

import React, { useState, useEffect, useRef } from 'react'
import { PlaybackDebugger, PlaybackDebugInfo } from '@/lib/ui/playback-debugger'
import { useProjectStore } from '@/lib/stores/project-store'
import { cn } from '@/lib/utils'
import { 
  Bug,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface PlaybackDebugPanelProps {
  className?: string
}

export function PlaybackDebugPanel({ className }: PlaybackDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<PlaybackDebugInfo[]>([])
  const [isLive, setIsLive] = useState(true)
  const [expandedSections, setExpandedSections] = useState({
    state: true,
    logs: true,
    diagnostics: false
  })
  
  const logContainerRef = useRef<HTMLDivElement>(null)
  const { getActiveTab } = useProjectStore()
  const activeTab = getActiveTab()

  // 실시간 로그 업데이트
  useEffect(() => {
    if (!isLive || !isOpen) return

    const interval = setInterval(() => {
      const newLogs = PlaybackDebugger.getLogs()
      setLogs([...newLogs])
      
      // 자동 스크롤
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = 0
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isLive, isOpen])

  const clearLogs = () => {
    PlaybackDebugger.clearLogs()
    setLogs([])
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getEventColor = (event: string) => {
    if (event.includes('ERROR')) return 'text-red-600 bg-red-50'
    if (event.includes('PLAY_BUTTON') || event.includes('TOGGLE_PLAYBACK')) return 'text-blue-600 bg-blue-50'
    if (event.includes('FRAME_ADVANCED') || event.includes('CANVAS_UPDATED')) return 'text-green-600 bg-green-50'
    if (event.includes('LOOP')) return 'text-purple-600 bg-purple-50'
    return 'text-gray-600 bg-gray-50'
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { 
      hour12: false, 
      second: '2-digit'
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0')
  }

  const runDiagnostics = () => {
    return PlaybackDebugger.runDiagnostics(activeTab)
  }

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-4 right-4 z-50", className)}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="Open Playback Debugger"
        >
          <Bug className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 w-96 max-h-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          <span className="font-semibold">Playback Debugger</span>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isLive ? "bg-green-400 animate-pulse" : "bg-gray-400"
          )} title={isLive ? "Live monitoring" : "Paused"} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className="text-white hover:bg-blue-700 px-2 py-1 rounded text-sm"
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-700 p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col h-80">
        {/* Current State Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('state')}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-sm">Current State</span>
            {expandedSections.state ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {expandedSections.state && (
            <div className="px-4 py-3 bg-white text-xs space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Playing:</span>
                  <span className={cn("ml-1", activeTab?.isPlaying ? "text-green-600" : "text-red-600")}>
                    {activeTab?.isPlaying ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Frame:</span>
                  <span className="ml-1">{(activeTab?.playbackFrameIndex || 0) + 1}/{activeTab?.frames?.length || 0}</span>
                </div>
                <div>
                  <span className="font-medium">Speed:</span>
                  <span className="ml-1">{activeTab?.playbackSpeed || 1.0}×</span>
                </div>
                <div>
                  <span className="font-medium">Interval ID:</span>
                  <span className="ml-1">{activeTab?.playbackIntervalId ? 'Set' : 'None'}</span>
                </div>
              </div>
              <div className="pt-1">
                <span className="font-medium">Canvas Data:</span>
                <span className="ml-1">
                  {activeTab?.canvasData ? 
                    `${activeTab.canvasData.width}×${activeTab.canvasData.height}` : 
                    'None'
                  }
                </span>
              </div>
              <div>
                <span className="font-medium">Frame Data Count:</span>
                <span className="ml-1">{activeTab?.frameCanvasData?.length || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Diagnostics Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('diagnostics')}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-sm">Quick Diagnostics</span>
            {expandedSections.diagnostics ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {expandedSections.diagnostics && (
            <div className="px-4 py-3 bg-white text-xs">
              {runDiagnostics().map((issue, index) => (
                <div key={index} className="flex items-start gap-2 mb-1">
                  {issue.startsWith('✅') ? 
                    <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" /> : 
                    <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                  }
                  <span className="break-all">{issue}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logs Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <button
              onClick={() => toggleSection('logs')}
              className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
            >
              <span className="font-medium text-sm">Debug Logs ({logs.length})</span>
              {expandedSections.logs ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <button
              onClick={clearLogs}
              className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              Clear
            </button>
          </div>
          
          {expandedSections.logs && (
            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto px-2 py-1 bg-gray-50 text-xs"
            >
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No logs yet</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="border-b border-gray-200 py-1 last:border-b-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400 text-xs">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        getEventColor(log.event)
                      )}>
                        {log.event}
                      </span>
                    </div>
                    {log.data && typeof log.data === 'object' && (
                      <div className="ml-2 text-gray-600 bg-gray-100 p-1 rounded text-xs overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.data, null, 1)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 flex items-center justify-between">
        <span>Monitoring playback system</span>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>{formatTime(performance.now())}</span>
        </div>
      </div>
    </div>
  )
}