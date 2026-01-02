/**
 * Distributed Rate Limiting with Upstash Redis
 *
 * Production-ready rate limiting that works across multiple Vercel instances.
 * Falls back to in-memory limiting if Redis is not configured.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // Render API - computationally expensive
  render: {
    requests: 50,
    window: '1 m', // 50 requests per minute
  },
  // Carousel API - even more expensive
  carousel: {
    requests: 20,
    window: '1 m', // 20 carousels per minute
  },
  // Template CRUD - moderate
  template: {
    requests: 100,
    window: '1 m', // 100 requests per minute
  },
  // Booking session - public endpoint, moderate limit
  booking: {
    requests: 30,
    window: '1 m', // 30 requests per minute per IP
  },
  // Reference file uploads - stricter due to storage costs
  upload: {
    requests: 10,
    window: '1 m', // 10 uploads per minute per IP
  },
  // Airspace checks - external API calls
  airspace: {
    requests: 20,
    window: '1 m', // 20 checks per minute per IP
  },
  // Default for other endpoints
  default: {
    requests: 100,
    window: '1 m',
  },
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

// Check if Redis is configured
const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

// Create Redis client only if configured
const redis = isRedisConfigured
  ? Redis.fromEnv()
  : null

// Create rate limiters for each type
const rateLimiters = new Map<RateLimitType, Ratelimit | null>()

function getRateLimiter(type: RateLimitType): Ratelimit | null {
  if (!redis) return null

  if (!rateLimiters.has(type)) {
    const config = RATE_LIMITS[type]
    rateLimiters.set(
      type,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        analytics: true,
        prefix: `asm-portal:ratelimit:${type}`,
      })
    )
  }

  return rateLimiters.get(type) || null
}

// In-memory fallback for development/testing
const inMemoryStore = new Map<string, { count: number; resetAt: number }>()

function inMemoryRateLimit(
  identifier: string,
  type: RateLimitType
): { success: boolean; limit: number; remaining: number; reset: number } {
  const config = RATE_LIMITS[type]
  const now = Date.now()
  const windowMs = parseWindow(config.window)
  const key = `${type}:${identifier}`

  const record = inMemoryStore.get(key)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of inMemoryStore) {
      if (v.resetAt < now) inMemoryStore.delete(k)
    }
  }

  if (!record || record.resetAt < now) {
    // Start new window
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: Math.floor((now + windowMs) / 1000),
    }
  }

  if (record.count >= config.requests) {
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset: Math.floor(record.resetAt / 1000),
    }
  }

  record.count++
  return {
    success: true,
    limit: config.requests,
    remaining: config.requests - record.count,
    reset: Math.floor(record.resetAt / 1000),
  }
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/)
  if (!match) return 60000 // Default 1 minute

  const [, num, unit] = match
  const value = parseInt(num, 10)

  switch (unit) {
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      return 60000
  }
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  isDistributed: boolean
}

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID, API key)
 * @param type - Type of rate limit to apply
 * @returns Rate limit result with success status and limits
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'default'
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(type)

  if (limiter) {
    // Use distributed rate limiting
    try {
      const result = await limiter.limit(identifier)
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        isDistributed: true,
      }
    } catch (error) {
      // Fall back to in-memory if Redis fails
      console.warn('[RateLimit] Redis error, falling back to in-memory:', error)
      const fallback = inMemoryRateLimit(identifier, type)
      return { ...fallback, isDistributed: false }
    }
  }

  // Use in-memory rate limiting
  const result = inMemoryRateLimit(identifier, type)
  return { ...result, isDistributed: false }
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
    'X-RateLimit-Policy': `${result.limit};w=60`,
  }
}

/**
 * Create rate-limited response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: result.reset - Math.floor(Date.now() / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.reset - Math.floor(Date.now() / 1000)),
        ...getRateLimitHeaders(result),
      },
    }
  )
}

/**
 * Helper to extract identifier from request
 */
export function getIdentifier(request: Request): string {
  // Try API key first
  const apiKey = request.headers.get('X-ASM-Secret')
  if (apiKey) {
    // Hash the API key for privacy
    return `apikey:${hashString(apiKey)}`
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0].trim() || 'unknown'
  return `ip:${ip}`
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
