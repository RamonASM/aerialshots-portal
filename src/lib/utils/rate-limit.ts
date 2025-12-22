/**
 * Simple in-memory rate limiter for API routes
 *
 * Note: This uses in-memory storage which resets on server restart.
 * For production at scale, consider using Redis or a similar distributed cache.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupTimer: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupTimer) return

  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)

  // Don't prevent process exit
  cleanupTimer.unref()
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Number of remaining requests in the current window */
  remaining: number
  /** Unix timestamp (ms) when the rate limit resets */
  resetTime: number
  /** Number of requests made in the current window */
  current: number
}

/**
 * Check and update rate limit for a given key
 *
 * @param key - Unique identifier for rate limiting (e.g., IP address, email, user ID)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with allowed status and metadata
 *
 * @example
 * // Limit to 5 requests per minute by IP
 * const result = checkRateLimit(request.ip, { limit: 5, windowSeconds: 60 })
 * if (!result.allowed) {
 *   return new Response('Too many requests', { status: 429 })
 * }
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  startCleanup()

  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const entry = rateLimitStore.get(key)

  // If no entry or window has expired, create new entry
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, newEntry)

    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime: newEntry.resetTime,
      current: 1,
    }
  }

  // Increment count
  entry.count += 1

  const allowed = entry.count <= config.limit

  return {
    allowed,
    remaining: Math.max(0, config.limit - entry.count),
    resetTime: entry.resetTime,
    current: entry.count,
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.current.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }
}

/**
 * Create a composite rate limit key from multiple identifiers
 * Useful for rate limiting by both IP and email
 */
export function createRateLimitKey(...parts: string[]): string {
  return parts.join(':')
}
