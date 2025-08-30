/**
 * Centralized Error Handler
 * 
 * Implements unified error handling patterns following the refactoring strategy.
 * Provides user-friendly error messages and automatic recovery strategies.
 */

import * as React from 'react'
import { createComponentLogger, LogLevel } from '@/lib/ui/smart-logger'
import { triggerHaptic } from '@/lib/utils/haptic-feedback'
import toast from 'react-hot-toast'

export interface ErrorContext {
  component: string
  operation: string
  userId?: string
  sessionId?: string
  timestamp: number
  userAgent: string
  url: string
  additionalData?: Record<string, any>
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'graceful-degradation' | 'user-action-required'
  description: string
  action?: () => Promise<void> | void
  maxRetries?: number
}

export interface UserFriendlyError {
  title: string
  message: string
  actionable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoveryOptions?: string[]
}

/**
 * Central Error Handler Class
 */
export class CentralErrorHandler {
  private static instance: CentralErrorHandler | null = null
  private componentLogger = createComponentLogger('ErrorHandler')
  private errorCounts: Map<string, number> = new Map()
  private recentErrors: Array<{ error: Error, context: ErrorContext, timestamp: number }> = []
  private maxRecentErrors = 50

  static getInstance(): CentralErrorHandler {
    if (!this.instance) {
      this.instance = new CentralErrorHandler()
    }
    return this.instance
  }

  /**
   * Main error handling method
   */
  handle(
    error: Error, 
    context: Partial<ErrorContext>, 
    recoveryStrategy?: ErrorRecoveryStrategy
  ): UserFriendlyError {
    const fullContext: ErrorContext = {
      component: 'Unknown',
      operation: 'Unknown',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    }

    // Track error frequency
    const errorKey = `${fullContext.component}:${error.name}`
    const currentCount = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, currentCount + 1)

    // Store recent error
    this.recentErrors.push({ error, context: fullContext, timestamp: Date.now() })
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.shift()
    }

    // Log the error with structured data
    this.componentLogger.error(
      'ERROR_HANDLED',
      {
        errorType: error.name,
        errorMessage: error.message,
        component: fullContext.component,
        operation: fullContext.operation,
        errorCount: currentCount + 1,
        stackTrace: error.stack,
        recoveryAvailable: !!recoveryStrategy
      },
      error
    )

    // Create user-friendly error
    const userError = this.createUserFriendlyError(error, fullContext)

    // Attempt recovery if strategy provided
    if (recoveryStrategy) {
      this.attemptRecovery(error, fullContext, recoveryStrategy, userError)
    } else {
      // Show error to user if no recovery strategy
      this.showErrorToUser(userError)
    }

    return userError
  }

  /**
   * Create user-friendly error message
   */
  private createUserFriendlyError(error: Error, context: ErrorContext): UserFriendlyError {
    // Touch/gesture related errors
    if (error.message.includes('touch') || error.message.includes('gesture')) {
      return {
        title: 'Touch Input Issue',
        message: 'There was a problem with touch input. You can still use the toolbar buttons.',
        actionable: true,
        severity: 'medium',
        recoveryOptions: ['Use toolbar buttons', 'Refresh page', 'Switch to desktop mode']
      }
    }

    // Canvas/drawing errors
    if (error.message.includes('canvas') || context.component === 'PixelCanvas') {
      return {
        title: 'Drawing Issue',
        message: 'There was a problem with the drawing canvas. Your work is saved.',
        actionable: true,
        severity: 'medium',
        recoveryOptions: ['Try a different tool', 'Refresh page', 'Check project history']
      }
    }

    // Performance errors
    if (error.message.includes('performance') || error.message.includes('timeout')) {
      return {
        title: 'Performance Issue',
        message: 'The app is running slowly. Try using simpler operations.',
        actionable: true,
        severity: 'low',
        recoveryOptions: ['Use smaller brush size', 'Reduce zoom level', 'Close other browser tabs']
      }
    }

    // Network/API errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        title: 'Connection Issue',
        message: 'Unable to connect to the server. Working in offline mode.',
        actionable: true,
        severity: 'medium',
        recoveryOptions: ['Check internet connection', 'Try again later', 'Work offline']
      }
    }

    // File/storage errors
    if (error.message.includes('storage') || error.message.includes('file')) {
      return {
        title: 'Storage Issue',
        message: 'Unable to save your work. Please export your project.',
        actionable: true,
        severity: 'high',
        recoveryOptions: ['Export project', 'Try saving again', 'Use different browser']
      }
    }

    // Generic fallback
    return {
      title: 'Unexpected Error',
      message: 'Something unexpected happened. Your work should be safe.',
      actionable: false,
      severity: 'medium',
      recoveryOptions: ['Refresh page', 'Contact support']
    }
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptRecovery(
    error: Error,
    context: ErrorContext,
    strategy: ErrorRecoveryStrategy,
    userError: UserFriendlyError
  ): Promise<void> {
    this.componentLogger.info(
      'RECOVERY_ATTEMPT_STARTED',
      {
        errorType: error.name,
        recoveryType: strategy.type,
        component: context.component
      }
    )

    try {
      switch (strategy.type) {
        case 'retry':
          await this.handleRetryRecovery(strategy, context)
          break
        case 'fallback':
          await this.handleFallbackRecovery(strategy, context)
          break
        case 'graceful-degradation':
          await this.handleGracefulDegradation(strategy, context)
          break
        case 'user-action-required':
          this.showErrorToUser(userError)
          break
      }

      this.componentLogger.info(
        'RECOVERY_SUCCESSFUL',
        {
          errorType: error.name,
          recoveryType: strategy.type,
          component: context.component
        }
      )

      // Show success feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]) // Success pattern
      }

    } catch (recoveryError) {
      this.componentLogger.error(
        'RECOVERY_FAILED',
        {
          originalError: error.message,
          recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown',
          component: context.component
        }
      )

      // Fallback to showing error to user
      this.showErrorToUser(userError)
    }
  }

  private async handleRetryRecovery(strategy: ErrorRecoveryStrategy, context: ErrorContext): Promise<void> {
    if (strategy.action) {
      const maxRetries = strategy.maxRetries || 3
      let attempt = 0
      
      while (attempt < maxRetries) {
        try {
          await strategy.action()
          return // Success
        } catch (retryError) {
          attempt++
          if (attempt >= maxRetries) {
            throw retryError
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }
  }

  private async handleFallbackRecovery(strategy: ErrorRecoveryStrategy, context: ErrorContext): Promise<void> {
    if (strategy.action) {
      await strategy.action()
    }
    
    toast.success('Switched to alternative mode', {
      duration: 3000,
      position: 'bottom-center'
    })
  }

  private async handleGracefulDegradation(strategy: ErrorRecoveryStrategy, context: ErrorContext): Promise<void> {
    if (strategy.action) {
      await strategy.action()
    }
    
    toast('Some features may be limited', {
      icon: '⚠️',
      duration: 4000,
      position: 'bottom-center'
    })
  }

  /**
   * Show error to user with appropriate UI feedback
   */
  private showErrorToUser(userError: UserFriendlyError): void {
    const toastOptions = {
      duration: userError.severity === 'critical' ? 8000 : 
                userError.severity === 'high' ? 6000 : 4000,
      position: 'bottom-center' as const
    }

    switch (userError.severity) {
      case 'critical':
        toast.error(`${userError.title}: ${userError.message}`, toastOptions)
        break
      case 'high':
        toast.error(`${userError.title}: ${userError.message}`, toastOptions)
        break
      case 'medium':
        toast(`${userError.title}: ${userError.message}`, {
          icon: '⚠️',
          ...toastOptions
        })
        break
      case 'low':
        toast(userError.message, {
          icon: 'ℹ️',
          ...toastOptions
        })
        break
    }

    // Haptic feedback for errors
    if ('vibrate' in navigator) {
      const pattern = userError.severity === 'critical' ? [200, 100, 200] :
                     userError.severity === 'high' ? [150, 100, 150] :
                     [100]
      navigator.vibrate(pattern)
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    errorsByComponent: Record<string, number>
    recentErrorsCount: number
    criticalErrorsCount: number
  } {
    const errorsByComponent: Record<string, number> = {}
    let criticalErrorsCount = 0

    this.errorCounts.forEach((count, key) => {
      const component = key.split(':')[0]
      if (component) {
        errorsByComponent[component] = (errorsByComponent[component] || 0) + count
      }
    })

    // Count critical errors from recent errors
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    criticalErrorsCount = this.recentErrors.filter(e => 
      e.timestamp > fiveMinutesAgo && 
      (e.error.name === 'TypeError' || e.error.name === 'ReferenceError')
    ).length

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByComponent,
      recentErrorsCount: this.recentErrors.length,
      criticalErrorsCount
    }
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorCounts.clear()
    this.recentErrors.length = 0
    
    this.componentLogger.info(
      'ERROR_HISTORY_CLEARED',
      {
        timestamp: new Date().toISOString()
      }
    )
  }
}

/**
 * Convenience function for handling errors
 */
export function handleError(
  error: Error,
  context: Partial<ErrorContext>,
  recoveryStrategy?: ErrorRecoveryStrategy
): UserFriendlyError {
  return CentralErrorHandler.getInstance().handle(error, context, recoveryStrategy)
}

/**
 * React hook for error handling in components
 */
export function useErrorHandler(component: string) {
  const handleComponentError = React.useCallback((
    error: Error,
    operation: string,
    additionalData?: Record<string, any>
  ) => {
    return handleError(error, {
      component,
      operation,
      additionalData
    })
  }, [component])

  const handleErrorWithRecovery = React.useCallback((
    error: Error,
    operation: string,
    recoveryStrategy: ErrorRecoveryStrategy,
    additionalData?: Record<string, any>
  ) => {
    return handleError(error, {
      component,
      operation,
      additionalData
    }, recoveryStrategy)
  }, [component])

  const getErrorStats = React.useCallback(() => {
    return CentralErrorHandler.getInstance().getErrorStats()
  }, [])

  return {
    handleError: handleComponentError,
    handleErrorWithRecovery,
    getErrorStats
  }
}