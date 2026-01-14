/**
 * Simple logging utility that respects environment
 * In production, logs are suppressed or sent to monitoring service
 */

const isDevelopment = process.env.NODE_ENV === 'development'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: unknown
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

export const logger = {
  info(message: string, context?: LogContext) {
    if (isDevelopment) {
      console.log(formatMessage('info', message, context))
    }
    // In production, send to monitoring service
  },

  warn(message: string, context?: LogContext) {
    if (isDevelopment) {
      console.warn(formatMessage('warn', message, context))
    }
    // In production, send to monitoring service
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const errorContext = error instanceof Error
      ? { ...context, error: error.message, stack: error.stack }
      : { ...context, error }

    if (isDevelopment) {
      console.error(formatMessage('error', message, errorContext))
    }
    // In production, send to error tracking service (e.g., Sentry)
  },

  debug(message: string, context?: LogContext) {
    if (isDevelopment) {
      console.debug(formatMessage('debug', message, context))
    }
  }
}
