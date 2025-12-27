// API Key validation middleware for Life Here API

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiResponse, ApiKeyData, ApiTier, TIER_LIMITS } from '../types'
import { nanoid } from 'nanoid'

// Cache API keys in memory for performance (refresh every 5 min)
const keyCache = new Map<string, { data: ApiKeyData; cachedAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  // Format: lh_live_xxxxxxxxxxxxxxxxxxxx (32 chars total)
  return `lh_live_${nanoid(24)}`
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate API key from request headers
 */
export async function validateApiKey(
  request: NextRequest
): Promise<{ valid: true; keyData: ApiKeyData } | { valid: false; error: ApiResponse }> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')
  const rapidApiKey = request.headers.get('X-RapidAPI-Key')
  const rapidApiProxySecret = request.headers.get('X-RapidAPI-Proxy-Secret')
  const rapidApiUser = request.headers.get('X-RapidAPI-User')
  const rapidApiSubscription = request.headers.get('X-RapidAPI-Subscription')

  // Check for RapidAPI proxy (they handle auth)
  if (rapidApiKey) {
    // Verify proxy secret if configured (prevents direct API access bypass)
    const expectedSecret = process.env.RAPIDAPI_PROXY_SECRET
    if (expectedSecret && rapidApiProxySecret !== expectedSecret) {
      return {
        valid: false,
        error: {
          success: false,
          error: {
            code: 'INVALID_PROXY_SECRET',
            message: 'Invalid RapidAPI proxy request.',
          },
          meta: {
            requestId: nanoid(),
            cached: false,
            responseTime: 0,
          },
        },
      }
    }

    // Map RapidAPI subscription tiers to our tiers
    let tier: ApiTier = 'free'
    let monthlyLimit = TIER_LIMITS.free.requestsPerMonth

    if (rapidApiSubscription) {
      const subscriptionLower = rapidApiSubscription.toLowerCase()
      if (subscriptionLower.includes('enterprise') || subscriptionLower.includes('ultra')) {
        tier = 'enterprise'
        monthlyLimit = TIER_LIMITS.enterprise.requestsPerMonth
      } else if (subscriptionLower.includes('mega') || subscriptionLower.includes('business')) {
        tier = 'business'
        monthlyLimit = TIER_LIMITS.business.requestsPerMonth
      } else if (subscriptionLower.includes('pro')) {
        tier = 'pro'
        monthlyLimit = TIER_LIMITS.pro.requestsPerMonth
      }
    }

    return {
      valid: true,
      keyData: {
        id: `rapidapi-${rapidApiUser || 'anonymous'}`,
        userId: null,
        name: `RapidAPI: ${rapidApiUser || 'Anonymous'}`,
        tier,
        monthlyLimit,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      },
    }
  }

  if (!apiKey) {
    return {
      valid: false,
      error: {
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required. Include X-API-Key header.',
        },
        meta: {
          requestId: nanoid(),
          cached: false,
          responseTime: 0,
        },
      },
    }
  }

  // Check cache first
  const cached = keyCache.get(apiKey)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    if (!cached.data.isActive) {
      return {
        valid: false,
        error: {
          success: false,
          error: {
            code: 'API_KEY_DISABLED',
            message: 'This API key has been disabled.',
          },
          meta: {
            requestId: nanoid(),
            cached: false,
            responseTime: 0,
          },
        },
      }
    }
    return { valid: true, keyData: cached.data }
  }

  // Hash the key and look up in database
  const keyHash = await hashApiKey(apiKey)
  const supabase = createAdminClient()

  const { data: keyRecord, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .single()

  if (error || !keyRecord) {
    return {
      valid: false,
      error: {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key. Please check your key and try again.',
        },
        meta: {
          requestId: nanoid(),
          cached: false,
          responseTime: 0,
        },
      },
    }
  }

  if (!keyRecord.is_active) {
    return {
      valid: false,
      error: {
        success: false,
        error: {
          code: 'API_KEY_DISABLED',
          message: 'This API key has been disabled.',
        },
        meta: {
          requestId: nanoid(),
          cached: false,
          responseTime: 0,
        },
      },
    }
  }

  const keyData: ApiKeyData = {
    id: keyRecord.id,
    userId: keyRecord.user_id,
    name: keyRecord.name,
    tier: keyRecord.tier as ApiTier,
    monthlyLimit: keyRecord.monthly_limit,
    isActive: keyRecord.is_active,
    createdAt: keyRecord.created_at,
    lastUsedAt: keyRecord.last_used_at,
  }

  // Cache the key
  keyCache.set(apiKey, { data: keyData, cachedAt: Date.now() })

  // Update last_used_at asynchronously (don't block response)
  void (async () => {
    try {
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRecord.id)
    } catch {
      // Ignore update errors
    }
  })()

  return { valid: true, keyData }
}

/**
 * Create error response helper
 */
export function apiError(
  code: string,
  message: string,
  status: number = 400,
  requestId?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
      meta: {
        requestId: requestId || nanoid(),
        cached: false,
        responseTime: 0,
      },
    },
    { status }
  )
}

/**
 * Create success response helper
 */
export function apiSuccess<T>(
  data: T,
  options: {
    requestId?: string
    cached?: boolean
    cachedAt?: string
    responseTime?: number
  } = {}
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      requestId: options.requestId || nanoid(),
      cached: options.cached || false,
      cachedAt: options.cachedAt,
      responseTime: options.responseTime || 0,
    },
  })
}

/**
 * Wrapper to handle API key validation
 */
export function withApiKey<T>(
  handler: (
    request: NextRequest,
    keyData: ApiKeyData
  ) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (request: NextRequest): Promise<NextResponse<ApiResponse<T> | ApiResponse>> => {
    const startTime = Date.now()
    const validation = await validateApiKey(request)

    if (!validation.valid) {
      return NextResponse.json(validation.error, { status: 401 })
    }

    try {
      const response = await handler(request, validation.keyData)

      // Log usage asynchronously
      logApiUsage(validation.keyData.id, request, response.status, Date.now() - startTime)

      return response
    } catch (error) {
      console.error('API Error:', error)
      return apiError(
        'INTERNAL_ERROR',
        'An internal error occurred. Please try again.',
        500
      )
    }
  }
}

/**
 * Log API usage for analytics and rate limiting
 */
async function logApiUsage(
  apiKeyId: string,
  request: NextRequest,
  statusCode: number,
  responseTimeMs: number
): Promise<void> {
  // RapidAPI handles their own usage tracking
  if (apiKeyId.startsWith('rapidapi-')) return

  try {
    const supabase = createAdminClient()
    const url = new URL(request.url)

    await supabase.from('api_usage').insert({
      api_key_id: apiKeyId,
      endpoint: url.pathname,
      method: request.method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      cached: false, // Will be set by cache layer
    })
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log API usage:', error)
  }
}
