import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @upstash/redis before imports
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDel = vi.fn()
const mockKeys = vi.fn()
const mockPing = vi.fn()
const mockIncr = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {
    get = mockGet
    set = mockSet
    del = mockDel
    keys = mockKeys
    ping = mockPing
    incr = mockIncr
  },
}))

import {
  CACHE_CONFIG,
  generateCacheKey,
  generateLocationKey,
  getCached,
  setCached,
  deleteCached,
  cacheThrough,
  cacheLocationData,
  checkCacheHealth,
  resetRedisClient,
  getRedisClient,
} from './redis'

describe('Redis Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRedisClient()
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('CACHE_CONFIG', () => {
    it('should have TTL for all categories', () => {
      expect(CACHE_CONFIG.ttl.attractions).toBe(5 * 60)
      expect(CACHE_CONFIG.ttl.dining).toBe(30 * 60)
      expect(CACHE_CONFIG.ttl.events).toBe(60 * 60)
      expect(CACHE_CONFIG.ttl.movies).toBe(60 * 60)
      expect(CACHE_CONFIG.ttl.news).toBe(15 * 60)
      expect(CACHE_CONFIG.ttl.commute).toBe(10 * 60)
      expect(CACHE_CONFIG.ttl.scores).toBe(24 * 60 * 60)
      expect(CACHE_CONFIG.ttl.lifestyle).toBe(60 * 60)
      expect(CACHE_CONFIG.ttl.overview).toBe(15 * 60)
      expect(CACHE_CONFIG.ttl.community).toBe(60 * 60)
    })

    it('should have correct prefixes', () => {
      expect(CACHE_CONFIG.prefix.api).toBe('api:v1:')
      expect(CACHE_CONFIG.prefix.location).toBe('loc:')
    })
  })

  describe('generateCacheKey', () => {
    it('should generate key from endpoint and params', () => {
      const key = generateCacheKey('location/dining', { lat: 28.5383, lng: -81.3792 })

      expect(key).toBe('api:v1:location/dining:lat=28.5383&lng=-81.3792')
    })

    it('should sort params alphabetically', () => {
      const key = generateCacheKey('location/overview', { lng: -81.3792, lat: 28.5383, radius: 10 })

      expect(key).toBe('api:v1:location/overview:lat=28.5383&lng=-81.3792&radius=10')
    })

    it('should filter out undefined params', () => {
      const key = generateCacheKey('location/events', {
        lat: 28.5383,
        lng: -81.3792,
        category: undefined,
      })

      expect(key).toBe('api:v1:location/events:lat=28.5383&lng=-81.3792')
    })

    it('should handle boolean params', () => {
      const key = generateCacheKey('location/dining', { lat: 28.5383, lng: -81.3792, openNow: true })

      expect(key).toBe('api:v1:location/dining:lat=28.5383&lng=-81.3792&openNow=true')
    })

    it('should handle empty params', () => {
      const key = generateCacheKey('health', {})

      expect(key).toBe('api:v1:health:')
    })
  })

  describe('generateLocationKey', () => {
    it('should generate location-based key', () => {
      const key = generateLocationKey(28.5383, -81.3792, 'dining')

      expect(key).toBe('loc:dining:28.538,-81.379')
    })

    it('should use custom precision', () => {
      const key = generateLocationKey(28.5383456, -81.3792123, 'attractions', 4)

      expect(key).toBe('loc:attractions:28.5383,-81.3792')
    })

    it('should round coordinates to reduce fragmentation', () => {
      const key1 = generateLocationKey(28.5381, -81.3791, 'events')
      const key2 = generateLocationKey(28.5382, -81.3792, 'events')

      // Both should round to same key
      expect(key1).toBe(key2)
    })
  })

  describe('getRedisClient', () => {
    it('should return null when env vars are missing', () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
      resetRedisClient()

      const client = getRedisClient()

      expect(client).toBeNull()
    })

    it('should return client when configured', () => {
      const client = getRedisClient()

      expect(client).not.toBeNull()
    })

    it('should return same client on subsequent calls', () => {
      const client1 = getRedisClient()
      const client2 = getRedisClient()

      expect(client1).toBe(client2)
    })
  })

  describe('getCached', () => {
    it('should return null when not cached', async () => {
      mockGet.mockResolvedValue(null)

      const result = await getCached('test-key')

      expect(result).toBeNull()
    })

    it('should return cached data with metadata', async () => {
      const cachedData = {
        data: { foo: 'bar' },
        cachedAt: '2024-12-24T12:00:00Z',
        expiresAt: '2024-12-24T12:30:00Z',
      }
      mockGet.mockResolvedValue(cachedData)

      const result = await getCached<{ foo: string }>('test-key')

      expect(result).not.toBeNull()
      expect(result?.data).toEqual({ foo: 'bar' })
      expect(result?.cached).toBe(true)
      expect(result?.cachedAt).toBe('2024-12-24T12:00:00Z')
      expect(result?.expiresAt).toBe('2024-12-24T12:30:00Z')
    })

    it('should return null on error', async () => {
      mockGet.mockRejectedValue(new Error('Redis error'))

      const result = await getCached('test-key')

      expect(result).toBeNull()
    })

    it('should return null when Redis not configured', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
      resetRedisClient()

      const result = await getCached('test-key')

      expect(result).toBeNull()
    })
  })

  describe('setCached', () => {
    it('should set data with default TTL', async () => {
      mockSet.mockResolvedValue('OK')

      const result = await setCached('test-key', { foo: 'bar' })

      expect(result).toBe(true)
      expect(mockSet).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          data: { foo: 'bar' },
          cachedAt: expect.any(String),
          expiresAt: expect.any(String),
        }),
        { ex: 300 } // Default 5 minute TTL
      )
    })

    it('should set data with custom TTL', async () => {
      mockSet.mockResolvedValue('OK')

      await setCached('test-key', { foo: 'bar' }, { ttl: 600 })

      expect(mockSet).toHaveBeenCalledWith('test-key', expect.any(Object), { ex: 600 })
    })

    it('should set data with category TTL', async () => {
      mockSet.mockResolvedValue('OK')

      await setCached('test-key', { foo: 'bar' }, { category: 'dining' })

      expect(mockSet).toHaveBeenCalledWith('test-key', expect.any(Object), { ex: 30 * 60 })
    })

    it('should return false on error', async () => {
      mockSet.mockRejectedValue(new Error('Redis error'))

      const result = await setCached('test-key', { foo: 'bar' })

      expect(result).toBe(false)
    })

    it('should return false when Redis not configured', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
      resetRedisClient()

      const result = await setCached('test-key', { foo: 'bar' })

      expect(result).toBe(false)
    })
  })

  describe('deleteCached', () => {
    it('should delete cached data', async () => {
      mockDel.mockResolvedValue(1)

      const result = await deleteCached('test-key')

      expect(result).toBe(true)
      expect(mockDel).toHaveBeenCalledWith('test-key')
    })

    it('should return false on error', async () => {
      mockDel.mockRejectedValue(new Error('Redis error'))

      const result = await deleteCached('test-key')

      expect(result).toBe(false)
    })
  })

  describe('cacheThrough', () => {
    it('should return cached data when available', async () => {
      const cachedData = {
        data: { cached: true },
        cachedAt: '2024-12-24T12:00:00Z',
        expiresAt: '2024-12-24T12:30:00Z',
      }
      mockGet.mockResolvedValue(cachedData)

      const fetchFn = vi.fn().mockResolvedValue({ fresh: true })

      const result = await cacheThrough('test-key', fetchFn)

      expect(result.data).toEqual({ cached: true })
      expect(result.cached).toBe(true)
      expect(fetchFn).not.toHaveBeenCalled()
    })

    it('should fetch and cache when not cached', async () => {
      mockGet.mockResolvedValue(null)
      mockSet.mockResolvedValue('OK')

      const fetchFn = vi.fn().mockResolvedValue({ fresh: true })

      const result = await cacheThrough('test-key', fetchFn)

      expect(result.data).toEqual({ fresh: true })
      expect(result.cached).toBe(false)
      expect(fetchFn).toHaveBeenCalledTimes(1)
      expect(mockSet).toHaveBeenCalled()
    })

    it('should pass options to setCached', async () => {
      mockGet.mockResolvedValue(null)
      mockSet.mockResolvedValue('OK')

      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' })

      await cacheThrough('test-key', fetchFn, { category: 'attractions' })

      expect(mockSet).toHaveBeenCalledWith('test-key', expect.any(Object), { ex: 5 * 60 })
    })
  })

  describe('cacheLocationData', () => {
    it('should use location-based key', async () => {
      mockGet.mockResolvedValue(null)
      mockSet.mockResolvedValue('OK')

      const fetchFn = vi.fn().mockResolvedValue({ restaurants: [] })

      await cacheLocationData(28.5383, -81.3792, 'dining', fetchFn)

      expect(mockGet).toHaveBeenCalledWith('loc:dining:28.538,-81.379')
    })

    it('should use category TTL', async () => {
      mockGet.mockResolvedValue(null)
      mockSet.mockResolvedValue('OK')

      const fetchFn = vi.fn().mockResolvedValue({ events: [] })

      await cacheLocationData(28.5383, -81.3792, 'events', fetchFn)

      expect(mockSet).toHaveBeenCalledWith('loc:events:28.538,-81.379', expect.any(Object), {
        ex: 60 * 60,
      })
    })
  })

  describe('checkCacheHealth', () => {
    it('should return connected when Redis responds', async () => {
      mockPing.mockResolvedValue('PONG')

      const health = await checkCacheHealth()

      expect(health.connected).toBe(true)
      expect(health.latencyMs).toBeDefined()
      expect(health.error).toBeUndefined()
    })

    it('should return not connected when Redis fails', async () => {
      mockPing.mockRejectedValue(new Error('Connection failed'))

      const health = await checkCacheHealth()

      expect(health.connected).toBe(false)
      expect(health.error).toBe('Connection failed')
    })

    it('should return not connected when not configured', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
      resetRedisClient()

      const health = await checkCacheHealth()

      expect(health.connected).toBe(false)
      expect(health.error).toBe('Redis not configured')
    })
  })
})

describe('Cache Key Edge Cases', () => {
  it('should handle special characters in params', () => {
    const key = generateCacheKey('search', {
      query: 'italian restaurant',
      lat: 28.5383,
    })

    expect(key).toContain('query=italian restaurant')
  })

  it('should handle numeric params as strings', () => {
    const key = generateCacheKey('location/dining', {
      lat: 28.5383,
      lng: -81.3792,
      limit: 10,
    })

    expect(key).toBe('api:v1:location/dining:lat=28.5383&limit=10&lng=-81.3792')
  })
})

describe('Cache TTL Values', () => {
  it('should have shorter TTL for frequently changing data', () => {
    expect(CACHE_CONFIG.ttl.attractions).toBeLessThan(CACHE_CONFIG.ttl.dining)
    expect(CACHE_CONFIG.ttl.commute).toBeLessThan(CACHE_CONFIG.ttl.events)
  })

  it('should have longer TTL for stable data', () => {
    expect(CACHE_CONFIG.ttl.scores).toBeGreaterThan(CACHE_CONFIG.ttl.events)
    expect(CACHE_CONFIG.ttl.scores).toBe(24 * 60 * 60) // 24 hours
  })
})
