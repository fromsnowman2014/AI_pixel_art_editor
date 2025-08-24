'use client'

/**
 * Frame Playback 디버깅 유틸리티
 * Play 버튼 문제를 추적하고 해결하기 위한 디버깅 도구
 */

export interface PlaybackDebugInfo {
  timestamp: number
  event: string
  data: any
  tabId?: string
  frameId?: string
  frameIndex?: number
}

export class PlaybackDebugger {
  private static logs: PlaybackDebugInfo[] = []
  private static maxLogs = 100
  private static isEnabled = true

  /**
   * 디버그 로그 기록
   */
  static log(event: string, data: any, tabId?: string) {
    if (!this.isEnabled) return

    const debugInfo: PlaybackDebugInfo = {
      timestamp: performance.now(),
      event,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      tabId
    }

    this.logs.unshift(debugInfo)
    
    // 로그 제한
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // 콘솔에도 출력 (중요한 이벤트만)
    if (this.isImportantEvent(event)) {
      console.log(`🎬 [PlaybackDebug] ${event}:`, data)
    }
  }

  /**
   * 중요한 이벤트 판별
   */
  private static isImportantEvent(event: string): boolean {
    const importantEvents = [
      'PLAY_BUTTON_CLICKED',
      'PLAYBACK_STARTED',
      'PLAYBACK_STOPPED',
      'FRAME_ADVANCED',
      'CANVAS_UPDATED',
      'ERROR_OCCURRED'
    ]
    return importantEvents.includes(event)
  }

  /**
   * 모든 로그 가져오기
   */
  static getLogs(): PlaybackDebugInfo[] {
    return [...this.logs]
  }

  /**
   * 로그 클리어
   */
  static clearLogs() {
    this.logs = []
    console.log('🧹 Playback debug logs cleared')
  }

  /**
   * 특정 이벤트 타입으로 필터링
   */
  static getLogsByEvent(event: string): PlaybackDebugInfo[] {
    return this.logs.filter(log => log.event === event)
  }

  /**
   * 최근 N개 로그 가져오기
   */
  static getRecentLogs(count: number = 10): PlaybackDebugInfo[] {
    return this.logs.slice(0, count)
  }

  /**
   * 디버그 활성화/비활성화
   */
  static setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    console.log(`🎬 Playback debugging ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * 현재 상태 스냅샷 생성
   */
  static createStateSnapshot(tabState: any): void {
    this.log('STATE_SNAPSHOT', {
      isPlaying: tabState?.isPlaying,
      playbackFrameIndex: tabState?.playbackFrameIndex,
      playbackFrameId: tabState?.playbackFrameId,
      playbackIntervalId: tabState?.playbackIntervalId,
      playbackSpeed: tabState?.playbackSpeed,
      playbackStartTime: tabState?.playbackStartTime,
      playbackAccumulatedTime: tabState?.playbackAccumulatedTime,
      framesCount: tabState?.frames?.length,
      hasCanvasData: !!tabState?.canvasData,
      frameCanvasDataCount: tabState?.frameCanvasData?.length
    }, tabState?.id)
  }

  /**
   * 함수 호출 추적 데코레이터
   */
  static trackFunctionCall<T extends (...args: any[]) => any>(
    functionName: string,
    originalFunction: T,
    tabId?: string
  ): T {
    return ((...args: any[]) => {
      this.log(`FUNCTION_CALLED: ${functionName}`, {
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg),
        timestamp: Date.now()
      }, tabId)

      try {
        const result = originalFunction(...args)
        
        this.log(`FUNCTION_COMPLETED: ${functionName}`, {
          success: true,
          hasReturn: result !== undefined
        }, tabId)

        return result
      } catch (error) {
        this.log(`FUNCTION_ERROR: ${functionName}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }, tabId)
        throw error
      }
    }) as T
  }

  /**
   * 디버그 정보를 콘솔에 예쁘게 출력
   */
  static printDebugSummary() {
    console.group('🎬 Playback Debug Summary')
    
    const recentLogs = this.getRecentLogs(20)
    const eventCounts: Record<string, number> = {}
    
    recentLogs.forEach(log => {
      eventCounts[log.event] = (eventCounts[log.event] || 0) + 1
    })

    console.log('📊 Recent Event Counts:', eventCounts)
    console.log('📝 Recent Logs:', recentLogs)
    
    const errors = this.logs.filter(log => log.event.includes('ERROR'))
    if (errors.length > 0) {
      console.log('❌ Errors Found:', errors)
    }

    console.groupEnd()
  }

  /**
   * 성능 메트릭 추적
   */
  static trackPerformance(operation: string, duration: number, tabId?: string) {
    this.log('PERFORMANCE_METRIC', {
      operation,
      duration: Math.round(duration * 100) / 100, // 소수점 2자리
      unit: 'ms'
    }, tabId)

    // 느린 작업 경고
    if (duration > 16) { // 60fps 기준
      console.warn(`⚠️ Slow operation detected: ${operation} took ${duration}ms`)
    }
  }

  /**
   * 자동 진단 실행
   */
  static runDiagnostics(tabState: any): string[] {
    const issues: string[] = []

    if (!tabState) {
      issues.push('❌ No tab state available')
      return issues
    }

    if (!tabState.frames || tabState.frames.length <= 1) {
      issues.push('❌ Not enough frames for playback (need at least 2)')
    }

    if (!tabState.frameCanvasData || tabState.frameCanvasData.length === 0) {
      issues.push('❌ No frame canvas data available')
    }

    if (tabState.isPlaying && !tabState.playbackIntervalId) {
      issues.push('❌ Playing state but no interval ID')
    }

    if (tabState.playbackFrameIndex >= tabState.frames?.length) {
      issues.push('❌ Playback frame index out of bounds')
    }

    if (tabState.frameCanvasData?.length !== tabState.frames?.length) {
      issues.push('⚠️ Frame canvas data count mismatch')
    }

    // 성능 관련
    const recentPerformance = this.getLogsByEvent('PERFORMANCE_METRIC').slice(0, 5)
    const slowOperations = recentPerformance.filter(log => log.data.duration > 16)
    if (slowOperations.length > 0) {
      issues.push(`⚠️ ${slowOperations.length} slow operations detected`)
    }

    if (issues.length === 0) {
      issues.push('✅ No obvious issues detected')
    }

    console.log('🔍 Playback Diagnostics:', issues)
    return issues
  }
}