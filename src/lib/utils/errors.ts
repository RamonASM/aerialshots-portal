/**
 * Centralized Error Handling Utilities
 *
 * Provides standardized error classes and helpers for consistent error
 * handling across the application, particularly in API routes.
 */

import { NextResponse } from 'next/server'

/**
 * Base application error class with error code, HTTP status, and optional details
 */
export class AppError extends Error {
  public readonly isOperational = true // Distinguishes from programmer errors

  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'

    // Maintains proper stack trace for where error was thrown (V8 engines only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    Object.setPrototypeOf(this, AppError.prototype)
  }

  /**
   * Serialize error to JSON-safe object for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    }
  }
}

/**
 * API-specific error class for API route errors
 * Extends AppError with additional context for API operations
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    code: string,
    status: number = 500,
    details?: Record<string, unknown>,
    public readonly endpoint?: string,
    public readonly method?: string
  ) {
    super(message, code, status, details)
    this.name = 'ApiError'
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /**
   * Serialize API error to JSON-safe object
   */
  toJSON(): Record<string, unknown> {
    const json = super.toJSON()

    if (this.endpoint) {
      json.endpoint = this.endpoint
    }

    if (this.method) {
      json.method = this.method
    }

    return json
  }
}

/**
 * Type guards for error checking
 */

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * Common error factory functions
 * These provide consistent error creation for common HTTP scenarios
 */

export function badRequest(
  message: string = 'Bad request',
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, 'BAD_REQUEST', 400, details)
}

export function unauthorized(
  message: string = 'Unauthorized',
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, 'UNAUTHORIZED', 401, details)
}

export function forbidden(
  message: string = 'Forbidden',
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, 'FORBIDDEN', 403, details)
}

export function notFound(
  message: string = 'Resource not found',
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, 'NOT_FOUND', 404, details)
}

export function conflict(
  message: string = 'Resource conflict',
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, 'CONFLICT', 409, details)
}

export function unprocessableEntity(
  message: string = 'Unprocessable entity',
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, 'UNPROCESSABLE_ENTITY', 422, details)
}

export function paymentRequired(
  message: string = 'Payment required',
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, 'PAYMENT_REQUIRED', 402, details)
}

export function serverError(
  message: string = 'Internal server error',
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, 'INTERNAL_ERROR', 500, details)
}

export function serviceUnavailable(
  message: string = 'Service temporarily unavailable',
  details?: Record<string, unknown>
): ApiError {
  return new ApiError(message, 'SERVICE_UNAVAILABLE', 503, details)
}

/**
 * Create a NextResponse from an error
 * Handles AppError, ApiError, and unknown errors consistently
 *
 * @example
 * try {
 *   // ... some operation
 * } catch (error) {
 *   return createErrorResponse(error)
 * }
 */
export function createErrorResponse(error: unknown): NextResponse {
  // Handle AppError and ApiError instances
  if (isAppError(error)) {
    const response = error.toJSON()

    // Log server errors for debugging
    if (error.status >= 500) {
      console.error(`[${error.code}] ${error.message}`, {
        status: error.status,
        details: error.details,
        stack: error.stack,
      })
    }

    return NextResponse.json(response, { status: error.status })
  }

  // Handle standard Error instances
  if (isError(error)) {
    console.error('Unhandled error:', error)

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }

  // Handle unknown error types
  console.error('Unknown error type:', error)

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  )
}

/**
 * Wrapper for API route handlers with standardized error handling
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   return handleApiError(async () => {
 *     const body = await request.json()
 *
 *     if (!body.name) {
 *       throw badRequest('Name is required')
 *     }
 *
 *     // ... rest of handler
 *
 *     return NextResponse.json({ success: true })
 *   })
 * }
 */
export async function handleApiError<T extends NextResponse>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  try {
    return await handler()
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Validation error helper
 * Creates a BadRequest error with validation details
 *
 * @example
 * const errors = validateInput(body)
 * if (errors.length > 0) {
 *   throw validationError(errors)
 * }
 */
export function validationError(
  errors: Array<{ field: string; message: string }>,
  message: string = 'Validation failed'
): ApiError {
  return badRequest(message, { errors })
}

/**
 * Database error helper
 * Converts Supabase/database errors to AppError instances
 *
 * @example
 * const { data, error } = await supabase.from('table').select()
 * if (error) {
 *   throw databaseError(error)
 * }
 */
export function databaseError(
  error: { message: string; code?: string; details?: string },
  context?: string
): ApiError {
  const message = context
    ? `Database error in ${context}: ${error.message}`
    : `Database error: ${error.message}`

  return serverError(message, {
    dbCode: error.code,
    dbDetails: error.details,
  })
}

/**
 * External service error helper
 * For errors from third-party APIs and services
 *
 * @example
 * try {
 *   const result = await externalApi.call()
 * } catch (error) {
 *   throw externalServiceError('External API', error)
 * }
 */
export function externalServiceError(
  serviceName: string,
  error: unknown,
  shouldRetry: boolean = false
): ApiError {
  const message = `${serviceName} service error: ${
    isError(error) ? error.message : 'Unknown error'
  }`

  return new ApiError(
    message,
    'EXTERNAL_SERVICE_ERROR',
    shouldRetry ? 503 : 500,
    {
      service: serviceName,
      shouldRetry,
      originalError: isError(error) ? error.message : String(error),
    }
  )
}

/**
 * Credit/payment error helpers
 */

export function insufficientCredits(
  required: number,
  balance: number,
  description?: string
): ApiError {
  return paymentRequired(
    description
      ? `Insufficient credits: ${description}`
      : 'Insufficient credits to complete this operation',
    {
      required,
      balance,
      shortfall: required - balance,
    }
  )
}

/**
 * Authentication error helpers
 */

export function notAuthenticated(
  message: string = 'Authentication required'
): ApiError {
  return unauthorized(message, {
    hint: 'Please sign in to access this resource',
  })
}

export function notAuthorized(
  message: string = 'Not authorized to access this resource',
  requiredRole?: string
): ApiError {
  return forbidden(message, {
    ...(requiredRole && { requiredRole }),
  })
}

/**
 * Resource error helpers
 */

export function resourceNotFound(
  resourceType: string,
  identifier?: string | number
): ApiError {
  const message = identifier
    ? `${resourceType} not found: ${identifier}`
    : `${resourceType} not found`

  return notFound(message, {
    resourceType,
    ...(identifier && { identifier }),
  })
}

export function resourceConflict(
  resourceType: string,
  message?: string
): ApiError {
  return conflict(
    message || `${resourceType} already exists or conflicts with existing data`,
    { resourceType }
  )
}
