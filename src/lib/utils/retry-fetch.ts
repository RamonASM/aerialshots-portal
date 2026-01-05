/**
 * Retry Fetch Utility
 *
 * Wraps fetchWithTimeout with exponential backoff and retry logic
 * for resilient external API calls.
 */

import { fetchWithTimeout, FetchWithTimeoutOptions, isTimeoutError, FETCH_TIMEOUTS } from './fetch-with-timeout'

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelay?: number
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number
  /** Jitter factor (0-1) to add randomness to delays (default: 0.1) */
  jitterFactor?: number
  /** HTTP status codes to retry on (default: [429, 500, 502, 503, 504]) */
  retryableStatuses?: number[]
  /** HTTP methods that are safe to retry (default: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']) */
  retryableMethods?: string[]
  /** Callback when a retry occurs */
  onRetry?: (attempt: number, error: Error, delay: number) => void
}

export interface RetryFetchOptions extends FetchWithTimeoutOptions, RetryOptions {}

const DEFAULT_RETRYABLE_STATUSES = [429, 500, 502, 503, 504]
const DEFAULT_RETRYABLE_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']

/**
 * Custom error for retry exhaustion
 */
export class RetryExhaustedError extends Error {
  constructor(
    public readonly url: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(`All ${attempts} retry attempts exhausted for ${url}: ${lastError.message}`)
    this.name = 'RetryExhaustedError'
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitterFactor: number
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  const jitter = exponentialDelay * jitterFactor * Math.random()
  return Math.floor(exponentialDelay + jitter)
}

/**
 * Extract retry-after header value in milliseconds
 */
function getRetryAfterMs(response: Response): number | null {
  const retryAfter = response.headers.get('retry-after')
  if (!retryAfter) return null

  // Check if it's a number (seconds)
  const seconds = parseInt(retryAfter, 10)
  if (!isNaN(seconds)) {
    return seconds * 1000
  }

  // Check if it's a date
  const date = Date.parse(retryAfter)
  if (!isNaN(date)) {
    const delay = date - Date.now()
    return delay > 0 ? delay : null
  }

  return null
}

/**
 * Check if a response status is retryable
 */
function isRetryableStatus(status: number, retryableStatuses: number[]): boolean {
  return retryableStatuses.includes(status)
}

/**
 * Check if an HTTP method is safe to retry
 */
function isRetryableMethod(method: string | undefined, retryableMethods: string[]): boolean {
  const normalizedMethod = (method || 'GET').toUpperCase()
  return retryableMethods.includes(normalizedMethod)
}

/**
 * Check if an error is retryable (network errors, timeouts)
 */
function isRetryableError(error: unknown): boolean {
  if (isTimeoutError(error)) return true
  if (error instanceof TypeError && error.message.includes('fetch')) return true
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('network') ||
      msg.includes('econnreset') ||
      msg.includes('econnrefused') ||
      msg.includes('etimedout') ||
      msg.includes('socket hang up')
    )
  }
  return false
}

/**
 * Delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch with automatic retry on transient failures
 *
 * @param url - The URL to fetch
 * @param options - Fetch options plus retry configuration
 * @returns Promise<Response>
 * @throws RetryExhaustedError if all retries fail
 *
 * @example
 * // Basic usage
 * const response = await retryFetch('https://api.example.com/data')
 *
 * @example
 * // With custom retry config
 * const response = await retryFetch('https://api.example.com/data', {
 *   maxRetries: 5,
 *   baseDelay: 500,
 *   timeout: 10000,
 *   onRetry: (attempt, error, delay) => {
 *     console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`)
 *   }
 * })
 */
export async function retryFetch(
  url: string,
  options: RetryFetchOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitterFactor = 0.1,
    retryableStatuses = DEFAULT_RETRYABLE_STATUSES,
    retryableMethods = DEFAULT_RETRYABLE_METHODS,
    onRetry,
    ...fetchOptions
  } = options

  // Check if method is retryable
  const canRetry = isRetryableMethod(fetchOptions.method, retryableMethods)

  let lastError: Error = new Error('No attempts made')
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions)
      lastResponse = response

      // If response is ok, return it
      if (response.ok) {
        return response
      }

      // Check if we should retry this status
      if (canRetry && isRetryableStatus(response.status, retryableStatuses) && attempt < maxRetries) {
        // Calculate delay, respecting Retry-After header
        const retryAfterMs = getRetryAfterMs(response)
        const backoffDelay = calculateDelay(attempt, baseDelay, maxDelay, jitterFactor)
        const waitTime = retryAfterMs !== null ? Math.max(retryAfterMs, backoffDelay) : backoffDelay

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

        onRetry?.(attempt + 1, lastError, waitTime)

        await delay(waitTime)
        continue
      }

      // Non-retryable status or out of retries, return the response
      return response
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      lastError = error

      // Check if we should retry this error
      if (canRetry && isRetryableError(error) && attempt < maxRetries) {
        const waitTime = calculateDelay(attempt, baseDelay, maxDelay, jitterFactor)
        onRetry?.(attempt + 1, error, waitTime)
        await delay(waitTime)
        continue
      }

      // Non-retryable error or out of retries
      throw error
    }
  }

  // If we have a response but it wasn't ok, return it
  if (lastResponse) {
    return lastResponse
  }

  // All retries exhausted
  throw new RetryExhaustedError(url, maxRetries + 1, lastError)
}

/**
 * Helper to check if an error is a retry exhausted error
 */
export function isRetryExhaustedError(error: unknown): error is RetryExhaustedError {
  return error instanceof RetryExhaustedError
}

/**
 * Pre-configured retry fetch for different use cases
 */

/** For quick operations with short timeouts and fewer retries */
export function quickRetryFetch(url: string, options: RetryFetchOptions = {}): Promise<Response> {
  return retryFetch(url, {
    timeout: FETCH_TIMEOUTS.QUICK,
    maxRetries: 2,
    baseDelay: 500,
    ...options,
  })
}

/** For AI/generation calls with longer timeouts */
export function generationRetryFetch(url: string, options: RetryFetchOptions = {}): Promise<Response> {
  return retryFetch(url, {
    timeout: FETCH_TIMEOUTS.GENERATION,
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 60000,
    ...options,
  })
}

/** For critical operations like payments with aggressive retry */
export function criticalRetryFetch(url: string, options: RetryFetchOptions = {}): Promise<Response> {
  return retryFetch(url, {
    timeout: FETCH_TIMEOUTS.DEFAULT,
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    ...options,
  })
}
