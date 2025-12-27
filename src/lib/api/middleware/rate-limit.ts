// Rate limiting middleware for Life Here API

import { NextRequest, NextResponse } from 'next/server'
import { ApiKeyData, ApiTier, TIER_LIMITS, ApiResponse } from '../types'
import { apiError } from './api-key'

// In-memory rate limit tracking (use Redis in production for distributed)
// Format: Map<apiKeyId, { minute: { count, resetAt }, month: { count, resetAt } }>
interface RateLimitEntry {
  minute: { count: number; resetAt: number }
  month: { count: number; resetAt: number }
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Get current month start timestamp
 */
function getMonthStart(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

/**
 * Get current minute start timestamp
 */
function getMinuteStart(): number {
  return Math.floor(Date.now() / 60000) * 60000
}

/**
 * Check rate limits for an API key
 */
export function checkRateLimit(keyData: ApiKeyData): {
  allowed: boolean
  remaining: {
    minute: number
    month: number
  }
  resetAt: {
    minute: number
    month: number
  }
  error?: ApiResponse
} {
  const limits = TIER_LIMITS[keyData.tier]
  const now = Date.now()
  const minuteStart = getMinuteStart()
  const monthStart = getMonthStart()

  // Get or create rate limit entry
  let entry = rateLimitStore.get(keyData.id)

  if (!entry) {
    entry = {
      minute: { count: 0, resetAt: minuteStart + 60000 },
      month: { count: 0, resetAt: monthStart + 30 * 24 * 60 * 60 * 1000 },
    }
    rateLimitStore.set(keyData.id, entry)
  }

  // Reset minute counter if needed
  if (now >= entry.minute.resetAt) {
    entry.minute = { count: 0, resetAt: minuteStart + 60000 }
  }

  // Reset month counter if needed
  if (now >= entry.month.resetAt) {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
    nextMonth.setHours(0, 0, 0, 0)
    entry.month = { count: 0, resetAt: nextMonth.getTime() }
  }

  // Calculate remaining
  const remainingMinute = Math.max(0, limits.requestsPerMinute - entry.minute.count)
  const remainingMonth = Math.max(0, limits.requestsPerMonth - entry.month.count)

  // Check minute limit
  if (entry.minute.count >= limits.requestsPerMinute) {
    const retryAfterSeconds = Math.ceil((entry.minute.resetAt - now) / 1000)
    return {
      allowed: false,
      remaining: { minute: 0, month: remainingMonth },
      resetAt: { minute: entry.minute.resetAt, month: entry.month.resetAt },
      error: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Maximum ${limits.requestsPerMinute} requests per minute for ${keyData.tier} tier.`,
          details: {
            limit: limits.requestsPerMinute,
            remaining: 0,
            resetAt: new Date(entry.minute.resetAt).toISOString(),
            retryAfter: retryAfterSeconds,
            upgradeUrl: 'https://app.aerialshots.media/developers/pricing',
            recommendations: [
              'Implement exponential backoff in your requests',
              'Cache API responses using the X-Cache header',
              retryAfterSeconds > 30 ? `Wait ${retryAfterSeconds} seconds before retrying` : 'Retry shortly',
              keyData.tier === 'free' ? 'Upgrade to Pro for 60 requests/minute' : undefined,
            ].filter(Boolean),
          },
        },
        meta: {
          requestId: '',
          cached: false,
          responseTime: 0,
        },
      },
    }
  }

  // Check month limit
  if (entry.month.count >= limits.requestsPerMonth) {
    const daysUntilReset = Math.ceil((entry.month.resetAt - now) / (24 * 60 * 60 * 1000))
    const nextTier = keyData.tier === 'free' ? 'pro' : keyData.tier === 'pro' ? 'business' : null
    const nextTierLimit = nextTier ? TIER_LIMITS[nextTier].requestsPerMonth : null

    return {
      allowed: false,
      remaining: { minute: remainingMinute, month: 0 },
      resetAt: { minute: entry.minute.resetAt, month: entry.month.resetAt },
      error: {
        success: false,
        error: {
          code: 'MONTHLY_LIMIT_EXCEEDED',
          message: `Monthly limit exceeded. Maximum ${limits.requestsPerMonth.toLocaleString()} requests per month for ${keyData.tier} tier.`,
          details: {
            limit: limits.requestsPerMonth,
            used: entry.month.count,
            remaining: 0,
            resetAt: new Date(entry.month.resetAt).toISOString(),
            daysUntilReset,
            upgradeUrl: 'https://app.aerialshots.media/developers/pricing',
            recommendations: [
              `Your quota resets in ${daysUntilReset} day${daysUntilReset === 1 ? '' : 's'}`,
              nextTier ? `Upgrade to ${nextTier} tier for ${nextTierLimit?.toLocaleString()} requests/month` : undefined,
              'Consider caching responses to reduce API calls',
              'Use the /overview endpoint to batch multiple data types',
            ].filter(Boolean),
          },
        },
        meta: {
          requestId: '',
          cached: false,
          responseTime: 0,
        },
      },
    }
  }

  // Increment counters
  entry.minute.count++
  entry.month.count++

  return {
    allowed: true,
    remaining: {
      minute: limits.requestsPerMinute - entry.minute.count,
      month: limits.requestsPerMonth - entry.month.count,
    },
    resetAt: {
      minute: entry.minute.resetAt,
      month: entry.month.resetAt,
    },
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders<T>(
  response: NextResponse<T>,
  keyData: ApiKeyData,
  rateLimitResult: ReturnType<typeof checkRateLimit>
): NextResponse<T> {
  const limits = TIER_LIMITS[keyData.tier]

  response.headers.set('X-RateLimit-Limit-Minute', limits.requestsPerMinute.toString())
  response.headers.set('X-RateLimit-Remaining-Minute', rateLimitResult.remaining.minute.toString())
  response.headers.set('X-RateLimit-Reset-Minute', Math.ceil(rateLimitResult.resetAt.minute / 1000).toString())

  response.headers.set('X-RateLimit-Limit-Month', limits.requestsPerMonth.toString())
  response.headers.set('X-RateLimit-Remaining-Month', rateLimitResult.remaining.month.toString())
  response.headers.set('X-RateLimit-Reset-Month', Math.ceil(rateLimitResult.resetAt.month / 1000).toString())

  response.headers.set('X-API-Tier', keyData.tier)

  // Add Retry-After header when rate limited
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt.minute - Date.now()) / 1000)
    response.headers.set('Retry-After', Math.max(1, retryAfter).toString())
  }

  return response
}

/**
 * Middleware wrapper that applies rate limiting
 */
export function withRateLimit<T>(
  handler: (request: NextRequest, keyData: ApiKeyData) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (
    request: NextRequest,
    keyData: ApiKeyData
  ): Promise<NextResponse<ApiResponse<T> | ApiResponse>> => {
    const rateLimitResult = checkRateLimit(keyData)

    if (!rateLimitResult.allowed && rateLimitResult.error) {
      const response = NextResponse.json<ApiResponse>(rateLimitResult.error, { status: 429 })
      return addRateLimitHeaders(response, keyData, rateLimitResult)
    }

    const response = await handler(request, keyData)
    return addRateLimitHeaders(response, keyData, rateLimitResult)
  }
}

/**
 * Get usage stats for an API key
 */
export function getUsageStats(keyId: string): {
  minute: number
  month: number
  resetAt: { minute: Date; month: Date }
} | null {
  const entry = rateLimitStore.get(keyId)
  if (!entry) return null

  return {
    minute: entry.minute.count,
    month: entry.month.count,
    resetAt: {
      minute: new Date(entry.minute.resetAt),
      month: new Date(entry.month.resetAt),
    },
  }
}

/**
 * Clean up old entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  const monthAgo = now - 31 * 24 * 60 * 60 * 1000

  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries that haven't been accessed in a month
    if (entry.month.resetAt < monthAgo) {
      rateLimitStore.delete(key)
    }
  }
}
