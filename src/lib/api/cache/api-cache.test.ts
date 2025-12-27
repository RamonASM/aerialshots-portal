import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse } from 'next/server'

// Mock redis module before imports
const mockGetCached = vi.fn()
const mockSetCached = vi.fn()
const mockCacheLocationData = vi.fn()
const mockCheckCacheHealth = vi.fn()
const mockRecordCacheHit = vi.fn()
const mockRecordCacheMiss = vi.fn()
const mockGenerateCacheKey = vi.fn()

vi.mock('./redis', () => ({
  getCached: (...args: unknown[]) => mockGetCached(...args),
  setCached: (...args: unknown[]) => mockSetCached(...args),
  cacheLocationData: (...args: unknown[]) => mockCacheLocationData(...args),
  checkCacheHealth: () => mockCheckCacheHealth(),
  recordCacheHit: () => mockRecordCacheHit(),
  recordCacheMiss: () => mockRecordCacheMiss(),
  generateCacheKey: (...args: unknown[]) => mockGenerateCacheKey(...args),
}))

import {
  withLocationCache,
  withCache,
  createApiCacheKey,
  addCacheHeaders,
  cachedJsonResponse,
  getCacheHealthStatus,
} from './api-cache'

describe('API Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateCacheKey.mockImplementation(
      (endpoint: string, params: Record<string, unknown>) => {
        const sortedParams = Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
        return `api:v1:${endpoint}:${sortedParams}`
      }
    )
  })

  describe('withLocationCache', () => {
    it('should return cached data when available', async () => {
      mockCacheLocationData.mockResolvedValue({
        data: { restaurants: ['test'] },
        cached: true,
        cachedAt: '2024-12-24T12:00:00Z',
        expiresAt: '2024-12-24T12:30:00Z',
      })

      const fetchFn = vi.fn().mockResolvedValue({ restaurants: ['fresh'] })

      const result = await withLocationCache(28.5383, -81.3792, 'dining', fetchFn)

      expect(result.data).toEqual({ restaurants: ['test'] })
      expect(result.meta.cached).toBe(true)
      expect(result.meta.cachedAt).toBe('2024-12-24T12:00:00Z')
      expect(mockRecordCacheHit).toHaveBeenCalled()
    })

    it('should fetch and return fresh data when not cached', async () => {
      mockCacheLocationData.mockResolvedValue({
        data: { events: ['event1'] },
        cached: false,
      })

      const fetchFn = vi.fn().mockResolvedValue({ events: ['event1'] })

      const result = await withLocationCache(28.5383, -81.3792, 'events', fetchFn)

      expect(result.data).toEqual({ events: ['event1'] })
      expect(result.meta.cached).toBe(false)
      expect(mockRecordCacheMiss).toHaveBeenCalled()
    })

    it('should include response time in meta', async () => {
      mockCacheLocationData.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 10))
        return { data: { test: true }, cached: false }
      })

      const result = await withLocationCache(28.5383, -81.3792, 'overview', async () => ({
        test: true,
      }))

      expect(result.meta.responseTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('withCache', () => {
    it('should return cached data when available', async () => {
      mockGetCached.mockResolvedValue({
        data: { cached: true },
        cachedAt: '2024-12-24T12:00:00Z',
        expiresAt: '2024-12-24T12:30:00Z',
      })

      const fetchFn = vi.fn().mockResolvedValue({ fresh: true })

      const result = await withCache('test-key', 'dining', fetchFn)

      expect(result.data).toEqual({ cached: true })
      expect(result.meta.cached).toBe(true)
      expect(fetchFn).not.toHaveBeenCalled()
      expect(mockRecordCacheHit).toHaveBeenCalled()
    })

    it('should fetch and cache when not cached', async () => {
      mockGetCached.mockResolvedValue(null)
      mockSetCached.mockResolvedValue(true)

      const fetchFn = vi.fn().mockResolvedValue({ fresh: true })

      const result = await withCache('test-key', 'events', fetchFn)

      expect(result.data).toEqual({ fresh: true })
      expect(result.meta.cached).toBe(false)
      expect(fetchFn).toHaveBeenCalledTimes(1)
      expect(mockSetCached).toHaveBeenCalledWith('test-key', { fresh: true }, { category: 'events' })
      expect(mockRecordCacheMiss).toHaveBeenCalled()
    })
  })

  describe('createApiCacheKey', () => {
    it('should create key from endpoint and params', () => {
      const key = createApiCacheKey('location/dining', { lat: 28.5383, lng: -81.3792 })

      expect(mockGenerateCacheKey).toHaveBeenCalledWith('location/dining', {
        lat: 28.5383,
        lng: -81.3792,
      })
    })

    it('should include all params in key', () => {
      createApiCacheKey('location/events', {
        lat: 28.5383,
        lng: -81.3792,
        radius: 10,
        category: 'music',
      })

      expect(mockGenerateCacheKey).toHaveBeenCalledWith('location/events', {
        lat: 28.5383,
        lng: -81.3792,
        radius: 10,
        category: 'music',
      })
    })
  })

  describe('addCacheHeaders', () => {
    it('should add cache hit header', () => {
      const response = new NextResponse()
      const cacheResult = {
        data: { test: true },
        meta: {
          cached: true,
          cachedAt: '2024-12-24T12:00:00Z',
          expiresAt: '2024-12-24T12:30:00Z',
          responseTime: 50,
        },
      }

      addCacheHeaders(response, cacheResult)

      expect(response.headers.get('X-Cache')).toBe('HIT')
      expect(response.headers.get('X-Response-Time')).toBe('50ms')
      expect(response.headers.get('X-Cache-Time')).toBe('2024-12-24T12:00:00Z')
      expect(response.headers.get('X-Cache-Expires')).toBe('2024-12-24T12:30:00Z')
    })

    it('should add cache miss header', () => {
      const response = new NextResponse()
      const cacheResult = {
        data: { test: true },
        meta: {
          cached: false,
          responseTime: 100,
        },
      }

      addCacheHeaders(response, cacheResult)

      expect(response.headers.get('X-Cache')).toBe('MISS')
      expect(response.headers.get('X-Response-Time')).toBe('100ms')
      expect(response.headers.get('X-Cache-Time')).toBeNull()
    })
  })

  describe('cachedJsonResponse', () => {
    it('should create response with cache metadata', () => {
      const data = { restaurants: ['test'] }
      const cacheResult = {
        data,
        meta: {
          cached: true,
          cachedAt: '2024-12-24T12:00:00Z',
          expiresAt: '2024-12-24T12:30:00Z',
          responseTime: 25,
        },
      }

      const response = cachedJsonResponse(data, cacheResult, {
        category: 'dining',
        requestId: 'test-123',
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('X-Cache')).toBe('HIT')
    })

    it('should generate request ID if not provided', () => {
      const data = { test: true }
      const cacheResult = {
        data,
        meta: { cached: false, responseTime: 10 },
      }

      const response = cachedJsonResponse(data, cacheResult)

      expect(response.status).toBe(200)
    })
  })

  describe('getCacheHealthStatus', () => {
    it('should return healthy when cache is connected and fast', async () => {
      mockCheckCacheHealth.mockResolvedValue({
        connected: true,
        latencyMs: 5,
      })

      const health = await getCacheHealthStatus()

      expect(health.status).toBe('healthy')
      expect(health.cache.connected).toBe(true)
      expect(health.cache.latencyMs).toBe(5)
    })

    it('should return degraded when cache is slow', async () => {
      mockCheckCacheHealth.mockResolvedValue({
        connected: true,
        latencyMs: 150,
      })

      const health = await getCacheHealthStatus()

      expect(health.status).toBe('degraded')
    })

    it('should return degraded when cache is disconnected', async () => {
      mockCheckCacheHealth.mockResolvedValue({
        connected: false,
        error: 'Connection refused',
      })

      const health = await getCacheHealthStatus()

      expect(health.status).toBe('degraded')
      expect(health.cache.error).toBe('Connection refused')
    })
  })
})

describe('Cache Integration Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateCacheKey.mockImplementation(
      (endpoint: string, params: Record<string, unknown>) => {
        const sortedParams = Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
        return `api:v1:${endpoint}:${sortedParams}`
      }
    )
  })

  it('should handle cache miss then hit pattern', async () => {
    // First call - cache miss
    mockGetCached.mockResolvedValueOnce(null)
    mockSetCached.mockResolvedValue(true)

    const fetchFn = vi.fn().mockResolvedValue({ data: 'test' })
    const result1 = await withCache('key1', 'dining', fetchFn)

    expect(result1.meta.cached).toBe(false)
    expect(fetchFn).toHaveBeenCalledTimes(1)

    // Second call - cache hit
    mockGetCached.mockResolvedValueOnce({
      data: { data: 'test' },
      cachedAt: '2024-12-24T12:00:00Z',
    })

    const result2 = await withCache('key1', 'dining', fetchFn)

    expect(result2.meta.cached).toBe(true)
    expect(fetchFn).toHaveBeenCalledTimes(1) // Not called again
  })

  it('should track hit/miss correctly', async () => {
    // Cache hit
    mockGetCached.mockResolvedValueOnce({ data: { test: true }, cached: true })
    await withCache('key1', 'dining', async () => ({}))
    expect(mockRecordCacheHit).toHaveBeenCalledTimes(1)
    expect(mockRecordCacheMiss).not.toHaveBeenCalled()

    vi.clearAllMocks()

    // Cache miss
    mockGetCached.mockResolvedValueOnce(null)
    mockSetCached.mockResolvedValue(true)
    await withCache('key2', 'events', async () => ({}))
    expect(mockRecordCacheMiss).toHaveBeenCalledTimes(1)
  })
})
