// CORS middleware for Life Here API

import { NextRequest, NextResponse } from 'next/server'

/**
 * Allowed origins for CORS
 */
const ALLOWED_ORIGINS = [
  'https://app.aerialshots.media',
  'https://www.aerialshots.media',
  'https://aerialshots.media',
  'https://portal.aerialshots.media',
  // RapidAPI
  'https://rapidapi.com',
  // Development
  'http://localhost:3000',
  'http://localhost:3001',
]

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true // Allow requests with no origin (like curl, Postman)

  // Allow any subdomain of aerialshots.media
  if (origin.endsWith('.aerialshots.media')) return true

  return ALLOWED_ORIGINS.includes(origin)
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-RapidAPI-Key, X-RapidAPI-Host',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Expose-Headers': 'X-RateLimit-Limit-Minute, X-RateLimit-Remaining-Minute, X-RateLimit-Reset-Minute, X-RateLimit-Limit-Month, X-RateLimit-Remaining-Month, X-RateLimit-Reset-Month, X-API-Tier',
  }

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  } else {
    // For public API, allow any origin for simple requests
    headers['Access-Control-Allow-Origin'] = '*'
  }

  return headers
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPrelight(request: NextRequest): NextResponse {
  const headers = getCorsHeaders(request)
  return new NextResponse(null, { status: 204, headers })
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const headers = getCorsHeaders(request)

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }

  return response
}

/**
 * CORS middleware wrapper
 */
export function withCors<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T | null>> => {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPrelight(request) as NextResponse<T | null>
    }

    const response = await handler(request)
    return addCorsHeaders(response, request) as NextResponse<T | null>
  }
}
