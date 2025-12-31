/**
 * Structured Logging Module
 *
 * JSON-formatted logging that works with Vercel's log aggregation.
 * Provides context-aware logging for skills, agents, and API routes.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Context for structured logging
 */
export interface LogContext {
  // Execution identifiers
  executionId?: string
  skillId?: string
  agentId?: string
  jobId?: string

  // User/request context
  userId?: string
  requestId?: string

  // Performance
  duration?: number

  // Additional metadata
  [key: string]: unknown
}

/**
 * Structured log entry
 */
interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * Check if we're in production
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  // In production, output JSON for log aggregation
  if (isProduction()) {
    return JSON.stringify(entry)
  }

  // In development, use more readable format
  const { timestamp, level, message, context, error } = entry
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  const errorStr = error ? ` | Error: ${error.message}` : ''

  return `[${timestamp}] ${level.toUpperCase()}: ${message}${errorStr}${contextStr}`
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = context
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: isProduction() ? undefined : error.stack,
    }
  }

  return entry
}

/**
 * Core logging functions
 */

export function debug(message: string, context?: LogContext): void {
  // Skip debug logs in production
  if (isProduction()) return

  const entry = createLogEntry('debug', message, context)
  console.debug(formatLogEntry(entry))
}

export function info(message: string, context?: LogContext): void {
  const entry = createLogEntry('info', message, context)
  console.info(formatLogEntry(entry))
}

export function warn(message: string, context?: LogContext): void {
  const entry = createLogEntry('warn', message, context)
  console.warn(formatLogEntry(entry))
}

export function error(message: string, err?: Error, context?: LogContext): void {
  const entry = createLogEntry('error', message, context, err)
  console.error(formatLogEntry(entry))
}

/**
 * Create a logger with bound context
 * Useful for passing through execution chains
 */
export function createLogger(baseContext: LogContext) {
  return {
    debug: (message: string, additionalContext?: LogContext) =>
      debug(message, { ...baseContext, ...additionalContext }),

    info: (message: string, additionalContext?: LogContext) =>
      info(message, { ...baseContext, ...additionalContext }),

    warn: (message: string, additionalContext?: LogContext) =>
      warn(message, { ...baseContext, ...additionalContext }),

    error: (message: string, err?: Error, additionalContext?: LogContext) =>
      error(message, err, { ...baseContext, ...additionalContext }),

    // Create a child logger with additional context
    child: (additionalContext: LogContext) =>
      createLogger({ ...baseContext, ...additionalContext }),
  }
}

/**
 * Log skill execution start
 */
export function logSkillStart(skillId: string, executionId: string, context?: LogContext): void {
  info(`Skill ${skillId} started`, {
    skillId,
    executionId,
    event: 'skill_start',
    ...context,
  })
}

/**
 * Log skill execution completion
 */
export function logSkillComplete(
  skillId: string,
  executionId: string,
  duration: number,
  success: boolean,
  context?: LogContext
): void {
  const level = success ? info : warn
  level(`Skill ${skillId} ${success ? 'completed' : 'failed'}`, {
    skillId,
    executionId,
    duration,
    success,
    event: 'skill_complete',
    ...context,
  })
}

/**
 * Log API request
 */
export function logApiRequest(
  method: string,
  path: string,
  requestId?: string,
  context?: LogContext
): void {
  info(`${method} ${path}`, {
    method,
    path,
    requestId,
    event: 'api_request',
    ...context,
  })
}

/**
 * Log API response
 */
export function logApiResponse(
  method: string,
  path: string,
  status: number,
  duration: number,
  requestId?: string,
  context?: LogContext
): void {
  const logContext = {
    method,
    path,
    status,
    duration,
    requestId,
    event: 'api_response',
    ...context,
  }

  if (status >= 500) {
    error(`${method} ${path} ${status}`, undefined, logContext)
  } else if (status >= 400) {
    warn(`${method} ${path} ${status}`, logContext)
  } else {
    info(`${method} ${path} ${status}`, logContext)
  }
}

/**
 * Log render operation
 */
export function logRender(
  templateId: string,
  jobId: string,
  success: boolean,
  duration: number,
  context?: LogContext
): void {
  const logContext = {
    templateId,
    jobId,
    success,
    duration,
    event: 'render',
    ...context,
  }

  if (success) {
    info(`Render completed`, logContext)
  } else {
    warn(`Render failed`, logContext)
  }
}

/**
 * Log rate limit event
 */
export function logRateLimit(
  identifier: string,
  type: string,
  allowed: boolean,
  remaining: number,
  context?: LogContext
): void {
  const level = allowed ? debug : warn
  level(`Rate limit ${allowed ? 'allowed' : 'exceeded'}`, {
    identifier,
    type,
    allowed,
    remaining,
    event: 'rate_limit',
    ...context,
  })
}

// Export default logger instance
export const logger = {
  debug,
  info,
  warn,
  error,
  createLogger,
  logSkillStart,
  logSkillComplete,
  logApiRequest,
  logApiResponse,
  logRender,
  logRateLimit,
}

export default logger
