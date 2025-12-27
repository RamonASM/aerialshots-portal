import { describe, it, expect } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getCorsHeaders, handleCorsPrelight, addCorsHeaders, withCors } from './cors'

describe('CORS Middleware', () => {
  describe('getCorsHeaders', () => {
    it('should return correct headers for allowed aerialshots.media origin', () => {
      const request = new NextRequest('https://api.example.com/v1/test', {
        headers: { origin: 'https://app.aerialshots.media' },
      })

      const headers = getCorsHeaders(request)

      expect(headers['Access-Control-Allow-Origin']).toBe('https://app.aerialshots.media')
      expect(headers['Access-Control-Allow-Credentials']).toBe('true')
      expect(headers['Access-Control-Allow-Methods']).toContain('GET')
      expect(headers['Access-Control-Allow-Headers']).toContain('X-API-Key')
    })

    it('should allow aerialshots.media subdomains', () => {
      const subdomains = [
        'https://portal.aerialshots.media',
        'https://api.aerialshots.media',
        'https://test.aerialshots.media',
        'https://dev.aerialshots.media',
      ]

      for (const origin of subdomains) {
        const request = new NextRequest('https://api.example.com/v1/test', {
          headers: { origin },
        })

        const headers = getCorsHeaders(request)
        expect(headers['Access-Control-Allow-Origin']).toBe(origin)
        expect(headers['Access-Control-Allow-Credentials']).toBe('true')
      }
    })

    it('should allow localhost for development', () => {
      const devOrigins = ['http://localhost:3000', 'http://localhost:3001']

      for (const origin of devOrigins) {
        const request = new NextRequest('https://api.example.com/v1/test', {
          headers: { origin },
        })

        const headers = getCorsHeaders(request)
        expect(headers['Access-Control-Allow-Origin']).toBe(origin)
      }
    })

    it('should allow RapidAPI origin', () => {
      const request = new NextRequest('https://api.example.com/v1/test', {
        headers: { origin: 'https://rapidapi.com' },
      })

      const headers = getCorsHeaders(request)
      expect(headers['Access-Control-Allow-Origin']).toBe('https://rapidapi.com')
    })

    it('should use wildcard for unknown origins (public API)', () => {
      const request = new NextRequest('https://api.example.com/v1/test', {
        headers: { origin: 'https://some-random-site.com' },
      })

      const headers = getCorsHeaders(request)
      expect(headers['Access-Control-Allow-Origin']).toBe('*')
    })

    it('should allow requests without origin (curl, Postman)', () => {
      const request = new NextRequest('https://api.example.com/v1/test')

      const headers = getCorsHeaders(request)
      expect(headers['Access-Control-Allow-Origin']).toBe('*')
    })

    it('should expose rate limit headers', () => {
      const request = new NextRequest('https://api.example.com/v1/test', {
        headers: { origin: 'https://app.aerialshots.media' },
      })

      const headers = getCorsHeaders(request)
      const exposedHeaders = headers['Access-Control-Expose-Headers']

      expect(exposedHeaders).toContain('X-RateLimit-Limit-Minute')
      expect(exposedHeaders).toContain('X-RateLimit-Remaining-Minute')
      expect(exposedHeaders).toContain('X-API-Tier')
    })

    it('should include correct allowed headers', () => {
      const request = new NextRequest('https://api.example.com/v1/test')

      const headers = getCorsHeaders(request)
      const allowedHeaders = headers['Access-Control-Allow-Headers']

      expect(allowedHeaders).toContain('Content-Type')
      expect(allowedHeaders).toContain('X-API-Key')
      expect(allowedHeaders).toContain('X-RapidAPI-Key')
      expect(allowedHeaders).toContain('X-RapidAPI-Host')
    })

    it('should set max-age for preflight caching', () => {
      const request = new NextRequest('https://api.example.com/v1/test')

      const headers = getCorsHeaders(request)
      expect(headers['Access-Control-Max-Age']).toBe('86400')
    })
  })

  describe('handleCorsPrelight', () => {
    it('should return 204 status for preflight', () => {
      const request = new NextRequest('https://api.example.com/v1/test', {
        method: 'OPTIONS',
        headers: { origin: 'https://app.aerialshots.media' },
      })

      const response = handleCorsPrelight(request)

      expect(response.status).toBe(204)
    })

    it('should include all CORS headers in preflight response', () => {
      const request = new NextRequest('https://api.example.com/v1/test', {
        method: 'OPTIONS',
        headers: { origin: 'https://app.aerialshots.media' },
      })

      const response = handleCorsPrelight(request)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://app.aerialshots.media'
      )
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-API-Key')
    })

    it('should have no body in preflight response', () => {
      const request = new NextRequest('https://api.example.com/v1/test', {
        method: 'OPTIONS',
      })

      const response = handleCorsPrelight(request)

      expect(response.body).toBeNull()
    })
  })

  describe('addCorsHeaders', () => {
    it('should add CORS headers to existing response', () => {
      const request = new NextRequest('https://api.example.com/v1/test', {
        headers: { origin: 'https://portal.aerialshots.media' },
      })
      const response = NextResponse.json({ data: 'test' })

      const corsResponse = addCorsHeaders(response, request)

      expect(corsResponse.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://portal.aerialshots.media'
      )
      expect(corsResponse.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    })

    it('should preserve existing response headers', () => {
      const request = new NextRequest('https://api.example.com/v1/test', {
        headers: { origin: 'https://app.aerialshots.media' },
      })
      const response = NextResponse.json({ data: 'test' })
      response.headers.set('X-Custom-Header', 'custom-value')

      const corsResponse = addCorsHeaders(response, request)

      expect(corsResponse.headers.get('X-Custom-Header')).toBe('custom-value')
      expect(corsResponse.headers.get('Access-Control-Allow-Origin')).toBeDefined()
    })
  })

  describe('withCors wrapper', () => {
    it('should handle preflight requests automatically', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ data: 'test' }))
      const wrappedHandler = withCors(handler)

      const request = new NextRequest('https://api.example.com/v1/test', {
        method: 'OPTIONS',
        headers: { origin: 'https://app.aerialshots.media' },
      })

      const response = await wrappedHandler(request)

      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(204)
    })

    it('should add CORS headers to handler response', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ data: 'test' }))
      const wrappedHandler = withCors(handler)

      const request = new NextRequest('https://api.example.com/v1/test', {
        method: 'GET',
        headers: { origin: 'https://app.aerialshots.media' },
      })

      const response = await wrappedHandler(request)

      expect(handler).toHaveBeenCalledWith(request)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://app.aerialshots.media'
      )
    })
  })
})

describe('CORS Security', () => {
  it('should not allow credentials for wildcard origins', () => {
    const request = new NextRequest('https://api.example.com/v1/test', {
      headers: { origin: 'https://malicious-site.com' },
    })

    const headers = getCorsHeaders(request)

    // When using wildcard, credentials should not be allowed (implicitly)
    expect(headers['Access-Control-Allow-Origin']).toBe('*')
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined()
  })

  it('should only allow credentials for trusted origins', () => {
    const trustedRequest = new NextRequest('https://api.example.com/v1/test', {
      headers: { origin: 'https://app.aerialshots.media' },
    })

    const headers = getCorsHeaders(trustedRequest)
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('should restrict methods to safe operations', () => {
    const request = new NextRequest('https://api.example.com/v1/test')

    const headers = getCorsHeaders(request)
    const methods = headers['Access-Control-Allow-Methods']

    expect(methods).toContain('GET')
    expect(methods).toContain('POST')
    expect(methods).toContain('OPTIONS')
    // Should not include destructive methods for public API
    expect(methods).not.toContain('DELETE')
    expect(methods).not.toContain('PUT')
  })
})
