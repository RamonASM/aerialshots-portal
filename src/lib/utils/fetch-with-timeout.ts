/**
 * Fetch wrapper with configurable timeout
 * Prevents infinite hangs when external APIs are slow or unresponsive
 */

export class FetchTimeoutError extends Error {
  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`)
    this.name = 'FetchTimeoutError'
  }
}

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number
}

// Default timeouts for different operation types (in milliseconds)
export const FETCH_TIMEOUTS = {
  DEFAULT: 30000,        // 30 seconds - standard API calls
  GENERATION: 120000,    // 2 minutes - AI content generation
  RENDER: 60000,         // 1 minute - image rendering
  UPLOAD: 180000,        // 3 minutes - file uploads
  QUICK: 10000,          // 10 seconds - simple operations
} as const

/**
 * Fetch with automatic timeout using AbortController
 *
 * @param url - The URL to fetch
 * @param options - Fetch options plus optional timeout
 * @returns Promise<Response>
 * @throws FetchTimeoutError if request times out
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = FETCH_TIMEOUTS.DEFAULT, signal: externalSignal, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // If an external signal is provided, listen for its abort
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Check if it was aborted by external signal or timeout
      if (externalSignal?.aborted) {
        throw error // Re-throw original abort
      }
      throw new FetchTimeoutError(url, timeout)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Helper to check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): error is FetchTimeoutError {
  return error instanceof FetchTimeoutError
}
