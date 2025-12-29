/**
 * Structured Logger Service
 *
 * Provides consistent, structured logging across the application.
 * Uses JSON format in production and pretty-printed output in development.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *
 *   logger.info('User logged in', { userId: '123', email: 'user@example.com' })
 *   logger.error('Failed to process payment', { error, orderId: '456' })
 *   logger.warn('Rate limit approaching', { remaining: 10 })
 *
 *   // With child loggers for context
 *   const agentLogger = logger.child({ agent: 'delivery-notifier' })
 *   agentLogger.info('Starting notification process')
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface Logger {
  debug: (context: LogContext | string, message?: string) => void
  info: (context: LogContext | string, message?: string) => void
  warn: (context: LogContext | string, message?: string) => void
  error: (context: LogContext | string, message?: string) => void
  child: (context: LogContext) => Logger
}

// Determine log level from environment
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Log level priorities
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Sensitive fields to redact
const REDACT_FIELDS = new Set([
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
])

/**
 * Recursively redact sensitive fields from an object
 */
function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive)
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACT_FIELDS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value)
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Format log entry for output
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context: LogContext,
  baseContext: LogContext
): string {
  const timestamp = new Date().toISOString()
  const mergedContext = { ...baseContext, ...context }
  const redactedContext = redactSensitive(mergedContext) as LogContext

  if (IS_PRODUCTION) {
    // JSON format for production (for log aggregation services)
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...redactedContext,
      service: 'asm-portal',
      env: process.env.NODE_ENV || 'development',
    })
  }

  // Pretty format for development
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  }
  const reset = '\x1b[0m'
  const dim = '\x1b[2m'

  const contextStr = Object.keys(redactedContext).length > 0
    ? `\n${dim}${JSON.stringify(redactedContext, null, 2)}${reset}`
    : ''

  return `${dim}${timestamp}${reset} ${levelColors[level]}[${level.toUpperCase()}]${reset} ${message}${contextStr}`
}

/**
 * Create a logger instance
 */
function createLogger(baseContext: LogContext = {}): Logger {
  const shouldLog = (level: LogLevel): boolean => {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[LOG_LEVEL as LogLevel]
  }

  const log = (level: LogLevel, contextOrMessage: LogContext | string, message?: string) => {
    if (!shouldLog(level)) return

    let context: LogContext
    let msg: string

    if (typeof contextOrMessage === 'string') {
      context = {}
      msg = contextOrMessage
    } else {
      context = contextOrMessage
      msg = message || ''
    }

    const output = formatLogEntry(level, msg, context, baseContext)

    // Use appropriate console method
    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(output)
        break
      case 'info':
        // eslint-disable-next-line no-console
        console.info(output)
        break
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(output)
        break
      case 'error':
        // eslint-disable-next-line no-console
        console.error(output)
        break
    }
  }

  return {
    debug: (ctx, msg) => log('debug', ctx, msg),
    info: (ctx, msg) => log('info', ctx, msg),
    warn: (ctx, msg) => log('warn', ctx, msg),
    error: (ctx, msg) => log('error', ctx, msg),
    child: (context: LogContext) => createLogger({ ...baseContext, ...context }),
  }
}

// Main logger instance
export const logger = createLogger()

// Export a function to create child loggers with context
export function createLoggerWithContext(context: LogContext) {
  return logger.child(context)
}

// Pre-configured loggers for common use cases
export const agentLogger = logger.child({ component: 'agent' })
export const apiLogger = logger.child({ component: 'api' })
export const authLogger = logger.child({ component: 'auth' })
export const dbLogger = logger.child({ component: 'database' })
export const webhookLogger = logger.child({ component: 'webhook' })
export const cronLogger = logger.child({ component: 'cron' })
export const integrationLogger = logger.child({ component: 'integration' })

// Type definitions for structured log data
export interface LogContextData {
  // Request context
  requestId?: string
  method?: string
  path?: string
  statusCode?: number
  duration?: number

  // User context
  userId?: string
  agentId?: string
  staffId?: string

  // Resource context
  listingId?: string
  orderId?: string
  jobId?: string

  // Error context
  error?: Error | unknown
  errorCode?: string

  // Additional data
  [key: string]: unknown
}

// Helper to safely extract error details
export function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }
  return { message: String(error) }
}

// Request logger middleware helper
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: LogContext
) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

  apiLogger[level]({
    method,
    path,
    statusCode,
    duration,
    ...context,
  }, `${method} ${path} ${statusCode} ${duration}ms`)
}

export default logger
