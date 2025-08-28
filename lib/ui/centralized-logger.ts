/**
 * Centralized Logger - console.log 교체를 위한 중앙집중식 로깅 시스템
 * 기존 smart-logger를 확장하여 프로젝트 전반에서 사용할 수 있도록 설계
 */

import { createApiLogger, createComponentLogger } from './smart-logger'

export enum LogCategory {
  CANVAS = 'CANVAS',
  FRAME = 'FRAME', 
  PLAYBACK = 'PLAYBACK',
  AI_GENERATION = 'AI_GENERATION',
  PROJECT = 'PROJECT',
  UI = 'UI',
  API = 'API',
  PERFORMANCE = 'PERFORMANCE',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export interface LogMessage {
  category: LogCategory
  action: string
  data?: any
  context?: string
}

/**
 * 중앙집중식 로거 클래스
 * 기존 console.log를 단계적으로 대체
 */
class CentralizedLogger {
  private apiLogger = createApiLogger('centralized', 'system')
  private componentLogger = createComponentLogger('CentralizedLogger')
  private logQueue: LogMessage[] = []
  private isProduction = process.env.NODE_ENV === 'production'

  /**
   * 구조화된 로그 메시지 출력
   * @param category 로그 카테고리 
   * @param action 수행된 액션
   * @param data 추가 데이터
   * @param context 컨텍스트 정보
   */
  log(category: LogCategory, action: string, data?: any, context?: string) {
    const message: LogMessage = { category, action, data, context }

    // 개발 환경에서는 즉시 출력
    if (!this.isProduction) {
      this.outputLog(message)
    }

    // 프로덕션에서는 큐에 저장 (나중에 원격 로깅 서비스 연동 가능)
    if (this.isProduction && this.shouldLogInProduction(category)) {
      this.logQueue.push(message)
    }
  }

  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(action: string, data?: any, context?: string) {
    if (!this.isProduction) {
      this.log(LogCategory.DEBUG, action, data, context)
    }
  }

  /**
   * 에러 로그 (모든 환경에서)
   */
  error(action: string, error: Error | string, context?: string) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: error }

    this.log(LogCategory.ERROR, action, errorData, context)
  }

  /**
   * 성능 측정 로그
   */
  performance(action: string, timeMs: number, context?: string) {
    this.log(LogCategory.PERFORMANCE, action, { 
      duration: timeMs,
      timestamp: Date.now()
    }, context)
  }

  /**
   * API 호출 로그
   */
  api(method: string, endpoint: string, status?: number, duration?: number) {
    this.log(LogCategory.API, `${method} ${endpoint}`, {
      status,
      duration,
      timestamp: Date.now()
    })
  }

  /**
   * UI 상호작용 로그
   */
  ui(component: string, interaction: string, data?: any) {
    this.log(LogCategory.UI, `${component}.${interaction}`, data)
  }

  /**
   * 캔버스 관련 로그
   */
  canvas(action: string, data?: any, context?: string) {
    this.log(LogCategory.CANVAS, action, data, context)
  }

  /**
   * 프레임 관련 로그
   */
  frame(action: string, data?: any, context?: string) {
    this.log(LogCategory.FRAME, action, data, context)
  }

  /**
   * 재생 관련 로그
   */
  playback(action: string, data?: any, context?: string) {
    this.log(LogCategory.PLAYBACK, action, data, context)
  }

  /**
   * 프로젝트 관련 로그
   */
  project(action: string, data?: any, context?: string) {
    this.log(LogCategory.PROJECT, action, data, context)
  }

  /**
   * AI 생성 관련 로그
   */
  aiGeneration(action: string, data?: any, context?: string) {
    this.log(LogCategory.AI_GENERATION, action, data, context)
  }

  /**
   * 로그 출력 (콘솔 또는 원격 서비스)
   */
  private outputLog(message: LogMessage) {
    const timestamp = new Date().toISOString()
    const logText = `[${timestamp}] ${message.category}:${message.action}`
    
    // 카테고리별 색상 구분 (개발 환경)
    const styles = this.getCategoryStyle(message.category)
    
    if (message.data || message.context) {
      console.groupCollapsed(`%c${logText}`, styles)
      if (message.context) {
        console.log('Context:', message.context)
      }
      if (message.data) {
        console.log('Data:', message.data)
      }
      console.groupEnd()
    } else {
      console.log(`%c${logText}`, styles)
    }
  }

  /**
   * 카테고리별 콘솔 스타일
   */
  private getCategoryStyle(category: LogCategory): string {
    const baseStyle = 'padding: 2px 6px; border-radius: 3px; font-weight: bold;'
    
    switch (category) {
      case LogCategory.ERROR:
        return `${baseStyle} background: #ff6b6b; color: white;`
      case LogCategory.AI_GENERATION:
        return `${baseStyle} background: #4ecdc4; color: white;`
      case LogCategory.CANVAS:
        return `${baseStyle} background: #45b7d1; color: white;`
      case LogCategory.FRAME:
        return `${baseStyle} background: #f39c12; color: white;`
      case LogCategory.PLAYBACK:
        return `${baseStyle} background: #e74c3c; color: white;`
      case LogCategory.PROJECT:
        return `${baseStyle} background: #9b59b6; color: white;`
      case LogCategory.UI:
        return `${baseStyle} background: #2ecc71; color: white;`
      case LogCategory.API:
        return `${baseStyle} background: #34495e; color: white;`
      case LogCategory.PERFORMANCE:
        return `${baseStyle} background: #f1c40f; color: black;`
      default:
        return `${baseStyle} background: #95a5a6; color: white;`
    }
  }

  /**
   * 프로덕션에서 로깅할지 결정
   */
  private shouldLogInProduction(category: LogCategory): boolean {
    // 프로덕션에서는 ERROR와 중요한 성능 지표만 로깅
    return [
      LogCategory.ERROR, 
      LogCategory.PERFORMANCE, 
      LogCategory.AI_GENERATION
    ].includes(category)
  }

  /**
   * 큐에 저장된 로그를 원격 서비스로 전송 (향후 구현)
   */
  async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return

    try {
      // TODO: 원격 로깅 서비스 연동
      console.log('Flushing logs:', this.logQueue.length)
      this.logQueue = []
    } catch (error) {
      console.error('Failed to flush logs:', error)
    }
  }

  /**
   * 성능 측정을 위한 타이머 생성
   */
  startTimer(label: string): () => void {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.performance(label, duration)
    }
  }
}

// 싱글톤 인스턴스 생성
export const logger = new CentralizedLogger()

/**
 * 기존 console.log를 점진적으로 교체하기 위한 호환성 함수들
 * 
 * 사용법:
 * // Before: console.log('Canvas updated', data)
 * // After: logCanvas('updated', data)
 */

export const logCanvas = (action: string, data?: any, context?: string) => 
  logger.canvas(action, data, context)

export const logFrame = (action: string, data?: any, context?: string) => 
  logger.frame(action, data, context)

export const logPlayback = (action: string, data?: any, context?: string) => 
  logger.playback(action, data, context)

export const logProject = (action: string, data?: any, context?: string) => 
  logger.project(action, data, context)

export const logAI = (action: string, data?: any, context?: string) => 
  logger.aiGeneration(action, data, context)

export const logUI = (component: string, interaction: string, data?: any) => 
  logger.ui(component, interaction, data)

export const logError = (action: string, error: Error | string, context?: string) => 
  logger.error(action, error, context)

export const logDebug = (action: string, data?: any, context?: string) => 
  logger.debug(action, data, context)

export const logAPI = (method: string, endpoint: string, status?: number, duration?: number) => 
  logger.api(method, endpoint, status, duration)

export const logPerformance = (action: string, timeMs: number, context?: string) => 
  logger.performance(action, timeMs, context)

/**
 * 성능 측정 데코레이터
 */
export const measurePerformance = (label: string) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = function (...args: any[]) {
      const timer = logger.startTimer(`${target.constructor.name}.${propertyKey}`)
      try {
        const result = originalMethod.apply(this, args)
        if (result instanceof Promise) {
          return result.finally(timer)
        }
        timer()
        return result
      } catch (error) {
        timer()
        throw error
      }
    }
    
    return descriptor
  }
}