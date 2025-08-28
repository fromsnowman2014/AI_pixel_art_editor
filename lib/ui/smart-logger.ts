/**
 * Smart Logging Utility for PixelBuddy
 * Environment-aware logging with performance optimization for production
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  data?: any;
  timestamp: string;
  environment: string;
}

class SmartLogger {
  private readonly isDevelopment: boolean;
  private readonly isDebugMode: boolean;
  private readonly currentLogLevel: LogLevel;
  private readonly enableStructuredLogs: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isDebugMode = this.isDevelopment || 
                      process.env.DEBUG_MODE === 'true' || 
                      process.env.LOG_LEVEL === 'debug';
    
    // Determine log level from environment
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLogLevel) {
      case 'error':
        this.currentLogLevel = LogLevel.ERROR;
        break;
      case 'warn':
        this.currentLogLevel = LogLevel.WARN;
        break;
      case 'info':
        this.currentLogLevel = LogLevel.INFO;
        break;
      case 'debug':
        this.currentLogLevel = LogLevel.DEBUG;
        break;
      case 'verbose':
        this.currentLogLevel = LogLevel.VERBOSE;
        break;
      default:
        // Default: INFO for production, DEBUG for development
        this.currentLogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }

    // Enable structured logs for production or when explicitly requested
    this.enableStructuredLogs = !this.isDevelopment || process.env.STRUCTURED_LOGS === 'true';
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLogLevel;
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext, data?: any): LogEntry {
    return {
      level,
      message,
      context,
      data,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    };
  }

  /**
   * Format log message for console output
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext, data?: any): string {
    const levelEmoji = {
      [LogLevel.ERROR]: '❌',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.VERBOSE]: '📝'
    };

    const levelName = LogLevel[level];
    const emoji = levelEmoji[level];
    const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || 'unknown';
    
    let formatted = `[${timestamp}] ${emoji} ${levelName}`;
    
    if (context?.requestId) {
      formatted += ` [${context.requestId.slice(0, 8)}]`;
    }
    
    if (context?.endpoint) {
      formatted += ` ${context.endpoint}`;
    }
    
    formatted += `: ${message}`;
    
    return formatted;
  }

  /**
   * Low-level logging method with lazy evaluation
   */
  private log(level: LogLevel, messageOrFn: string | (() => string), context?: LogContext, dataOrFn?: any | (() => any)): void {
    if (!this.shouldLog(level)) {
      return; // Early return for performance
    }

    // Lazy evaluation - only compute message/data if we're actually logging
    const message = typeof messageOrFn === 'function' ? messageOrFn() : messageOrFn;
    const data = typeof dataOrFn === 'function' ? dataOrFn() : dataOrFn;

    if (this.enableStructuredLogs) {
      // Structured logging for production monitoring
      const entry = this.createLogEntry(level, message, context, data);
      console.log(JSON.stringify(entry));
    } else {
      // Human-readable logging for development
      const formatted = this.formatMessage(level, message, context, data);
      
      const logFn = {
        [LogLevel.ERROR]: console.error,
        [LogLevel.WARN]: console.warn,
        [LogLevel.INFO]: console.info,
        [LogLevel.DEBUG]: console.log,
        [LogLevel.VERBOSE]: console.log
      }[level];

      logFn(formatted);
      
      // Show data separately in development for readability
      if (data !== undefined) {
        logFn('Data:', data);
      }
    }
  }

  /**
   * Error logging - always enabled
   */
  error(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  /**
   * Warning logging
   */
  warn(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Info logging - important events
   */
  info(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Debug logging - development and debugging
   */
  debug(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  /**
   * Verbose logging - highly detailed information
   */
  verbose(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.log(LogLevel.VERBOSE, message, context, data);
  }

  /**
   * Performance timing utility
   */
  time(label: string, context?: LogContext): () => void {
    const startTime = Date.now();
    
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug(`Timer started: ${label}`, context);
    }
    
    return () => {
      const duration = Date.now() - startTime;
      this.info(`Timer ${label}: ${duration}ms`, { ...context, duration });
    };
  }

  /**
   * Create a scoped logger for a specific context
   */
  scope(scopeContext: LogContext): ScopedLogger {
    return new ScopedLogger(this, scopeContext);
  }

  /**
   * Get current configuration info
   */
  getConfig(): object {
    return {
      isDevelopment: this.isDevelopment,
      isDebugMode: this.isDebugMode,
      currentLogLevel: LogLevel[this.currentLogLevel],
      enableStructuredLogs: this.enableStructuredLogs,
      environment: process.env.NODE_ENV
    };
  }
}

/**
 * Scoped logger that automatically includes context
 */
class ScopedLogger {
  constructor(
    private readonly logger: SmartLogger,
    private readonly scopeContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.scopeContext, ...context };
  }

  error(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.logger.error(message, this.mergeContext(context), data);
  }

  warn(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.logger.warn(message, this.mergeContext(context), data);
  }

  info(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.logger.info(message, this.mergeContext(context), data);
  }

  debug(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.logger.debug(message, this.mergeContext(context), data);
  }

  verbose(message: string | (() => string), context?: LogContext, data?: any | (() => any)): void {
    this.logger.verbose(message, this.mergeContext(context), data);
  }

  time(label: string, context?: LogContext): () => void {
    return this.logger.time(label, this.mergeContext(context));
  }
}

// Export singleton instance
export const logger = new SmartLogger();

// Export type for scoped loggers
export type { ScopedLogger };

// Convenience exports
export const createApiLogger = (endpoint: string, requestId: string) => 
  logger.scope({ endpoint, requestId });

export const createComponentLogger = (component: string) => 
  logger.scope({ component });