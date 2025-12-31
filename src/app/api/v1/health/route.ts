/**
 * Health Check Endpoint
 * GET /api/v1/health
 *
 * Returns system health status for monitoring and alerting.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTimeMs?: number
  message?: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  checks: Record<string, HealthCheck>
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabase = await createClient()
    // Simple query to check connection
    const { error } = await supabase.from('staff').select('count').limit(1)

    if (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        message: 'Connection failed',
      }
    }

    const responseTime = Date.now() - start
    return {
      name: 'database',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTimeMs: responseTime,
    }
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check storage connectivity
 */
async function checkStorage(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabase = await createClient()
    // List a bucket to check storage connectivity
    const { error } = await supabase.storage.from('render-outputs').list('', { limit: 1 })

    if (error) {
      return {
        name: 'storage',
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        message: 'Storage access failed',
      }
    }

    const responseTime = Date.now() - start
    return {
      name: 'storage',
      status: responseTime > 2000 ? 'degraded' : 'healthy',
      responseTimeMs: responseTime,
    }
  } catch (error) {
    return {
      name: 'storage',
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check Claude API availability
 */
async function checkClaudeApi(): Promise<HealthCheck> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return {
      name: 'claude_api',
      status: 'unhealthy',
      message: 'API key not configured',
    }
  }

  // Just check if key is configured - don't make actual API calls
  // Real health check would hit /v1/messages with a minimal request
  return {
    name: 'claude_api',
    status: 'healthy',
    message: 'API key configured',
  }
}

/**
 * Check Redis/rate limiting availability
 */
async function checkRateLimiting(): Promise<HealthCheck> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    return {
      name: 'rate_limiting',
      status: 'degraded',
      message: 'Distributed rate limiting not configured, using in-memory fallback',
    }
  }

  return {
    name: 'rate_limiting',
    status: 'healthy',
    message: 'Upstash Redis configured',
  }
}

/**
 * Calculate overall health status
 */
function calculateOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(c => c.status)

  if (statuses.some(s => s === 'unhealthy')) {
    return 'unhealthy'
  }

  if (statuses.some(s => s === 'degraded')) {
    return 'degraded'
  }

  return 'healthy'
}

/**
 * GET handler for health check
 */
export async function GET() {
  const startTime = Date.now()

  // Run all checks in parallel
  const [database, storage, claudeApi, rateLimiting] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkClaudeApi(),
    checkRateLimiting(),
  ])

  const checks: Record<string, HealthCheck> = {
    database,
    storage,
    claude_api: claudeApi,
    rate_limiting: rateLimiting,
  }

  const overallStatus = calculateOverallStatus(checks)

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  }

  // Return 503 if unhealthy
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Health-Check-Duration': String(Date.now() - startTime),
    },
  })
}
