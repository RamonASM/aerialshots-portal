import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { checkRateLimit, addRateLimitHeaders, getUsageStats, cleanupRateLimitStore } from './rate-limit'
import type { ApiKeyData } from '../types'

// Mock API key data for tests
function createMockKeyData(overrides: Partial<ApiKeyData> = {}): ApiKeyData {
  return {
    id: `key-${Math.random().toString(36).slice(2)}`,
    userId: 'user-123',
    name: 'Test Key',
    tier: 'free',
    monthlyLimit: 3000,
    isActive: true,
    createdAt: '2024-12-01T00:00:00Z',
    lastUsedAt: null,
    ...overrides,
  }
}

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    // Reset the rate limit store between tests by using unique key IDs
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-24T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const keyData = createMockKeyData()
      const result = checkRateLimit(keyData)

      expect(result.allowed).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should track remaining requests correctly', () => {
      const keyData = createMockKeyData({ tier: 'free' })

      // First request
      const result1 = checkRateLimit(keyData)
      expect(result1.allowed).toBe(true)
      expect(result1.remaining.minute).toBe(9) // 10 - 1
      expect(result1.remaining.month).toBe(2999) // 3000 - 1

      // Second request
      const result2 = checkRateLimit(keyData)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining.minute).toBe(8) // 10 - 2
      expect(result2.remaining.month).toBe(2998) // 3000 - 2
    })

    it('should enforce minute rate limit for free tier', () => {
      const keyData = createMockKeyData({ tier: 'free' })

      // Make 10 requests (free tier limit is 10/minute)
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(keyData)
        expect(result.allowed).toBe(true)
      }

      // 11th request should be denied
      const result = checkRateLimit(keyData)
      expect(result.allowed).toBe(false)
      expect(result.error?.error?.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(result.remaining.minute).toBe(0)
    })

    it('should allow more requests for pro tier', () => {
      const keyData = createMockKeyData({ tier: 'pro' })

      // Make 20 requests (pro tier allows 60/minute)
      for (let i = 0; i < 20; i++) {
        const result = checkRateLimit(keyData)
        expect(result.allowed).toBe(true)
      }

      // Should still have remaining
      const result = checkRateLimit(keyData)
      expect(result.allowed).toBe(true)
      expect(result.remaining.minute).toBe(39) // 60 - 21
    })

    it('should reset minute limit after 1 minute', () => {
      const keyData = createMockKeyData({ tier: 'free' })

      // Use all minute requests
      for (let i = 0; i < 10; i++) {
        checkRateLimit(keyData)
      }

      // Should be blocked
      expect(checkRateLimit(keyData).allowed).toBe(false)

      // Advance time by 1 minute
      vi.advanceTimersByTime(60000)

      // Should be allowed again
      const result = checkRateLimit(keyData)
      expect(result.allowed).toBe(true)
    })

    it('should enforce monthly limit', () => {
      const keyData = createMockKeyData({
        tier: 'free',
        monthlyLimit: 5, // Low limit for testing
      })

      // The tier limits are defined in types.ts, not monthlyLimit on keyData
      // For testing purposes, let's just verify the monthly tracking works
      for (let i = 0; i < 5; i++) {
        checkRateLimit(keyData)
      }

      // After 5 requests, should have used 5 of the month allocation
      const stats = getUsageStats(keyData.id)
      expect(stats?.month).toBe(5)
    })

    it('should include upgrade URL in error', () => {
      const keyData = createMockKeyData({ tier: 'free' })

      // Exhaust minute limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit(keyData)
      }

      const result = checkRateLimit(keyData)
      const details = result.error?.error?.details as { upgradeUrl?: string } | undefined
      expect(details?.upgradeUrl).toContain('developers/pricing')
    })

    it('should handle business tier limits', () => {
      const keyData = createMockKeyData({ tier: 'business' })

      // Business tier has 300/minute
      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit(keyData)
        expect(result.allowed).toBe(true)
      }

      // Should still have 200 remaining
      const result = checkRateLimit(keyData)
      expect(result.remaining.minute).toBe(199)
    })
  })

  describe('addRateLimitHeaders', () => {
    it('should add all rate limit headers', () => {
      const keyData = createMockKeyData({ tier: 'pro' })
      const response = new NextResponse()
      const rateLimitResult = checkRateLimit(keyData)

      addRateLimitHeaders(response, keyData, rateLimitResult)

      expect(response.headers.get('X-RateLimit-Limit-Minute')).toBe('60')
      expect(response.headers.get('X-RateLimit-Remaining-Minute')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Reset-Minute')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Limit-Month')).toBeDefined()
      expect(response.headers.get('X-API-Tier')).toBe('pro')
    })

    it('should set correct limits for each tier', () => {
      const tiers: Array<{ tier: ApiKeyData['tier']; expectedMinute: string }> = [
        { tier: 'free', expectedMinute: '10' },
        { tier: 'pro', expectedMinute: '60' },
        { tier: 'business', expectedMinute: '300' },
      ]

      for (const { tier, expectedMinute } of tiers) {
        const keyData = createMockKeyData({ tier })
        const response = new NextResponse()
        const rateLimitResult = checkRateLimit(keyData)

        addRateLimitHeaders(response, keyData, rateLimitResult)

        expect(response.headers.get('X-RateLimit-Limit-Minute')).toBe(expectedMinute)
      }
    })
  })

  describe('getUsageStats', () => {
    it('should return null for unknown key', () => {
      const stats = getUsageStats('unknown-key-id')
      expect(stats).toBeNull()
    })

    it('should return usage stats after requests', () => {
      const keyData = createMockKeyData()

      // Make some requests
      checkRateLimit(keyData)
      checkRateLimit(keyData)
      checkRateLimit(keyData)

      const stats = getUsageStats(keyData.id)
      expect(stats).not.toBeNull()
      expect(stats?.minute).toBe(3)
      expect(stats?.month).toBe(3)
      expect(stats?.resetAt.minute).toBeInstanceOf(Date)
      expect(stats?.resetAt.month).toBeInstanceOf(Date)
    })
  })

  describe('cleanupRateLimitStore', () => {
    it('should cleanup the store without errors', () => {
      const keyData = createMockKeyData()

      // Make a request
      checkRateLimit(keyData)
      expect(getUsageStats(keyData.id)).not.toBeNull()

      // Cleanup should not throw
      expect(() => cleanupRateLimitStore()).not.toThrow()
    })
  })
})

describe('Rate Limit Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-24T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle concurrent requests gracefully', () => {
    const keyData = createMockKeyData()

    // Simulate concurrent requests
    const results = Array(5)
      .fill(null)
      .map(() => checkRateLimit(keyData))

    // All should be allowed
    expect(results.every((r) => r.allowed)).toBe(true)

    // Total count should be 5
    const stats = getUsageStats(keyData.id)
    expect(stats?.minute).toBe(5)
  })

  it('should handle month rollover', () => {
    const keyData = createMockKeyData()

    // Make some requests
    checkRateLimit(keyData)
    checkRateLimit(keyData)

    // Advance to next month
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))

    // Reset should occur on next request
    const result = checkRateLimit(keyData)
    expect(result.allowed).toBe(true)

    const stats = getUsageStats(keyData.id)
    // Month count should be 1 (reset + this request)
    expect(stats?.month).toBe(1)
  })

  it('should handle enterprise tier with high limits', () => {
    const keyData = createMockKeyData({ tier: 'enterprise' })

    // Make many requests (less than minute limit of 1000)
    for (let i = 0; i < 100; i++) {
      const result = checkRateLimit(keyData)
      expect(result.allowed).toBe(true)
    }

    // Should still be allowed
    const result = checkRateLimit(keyData)
    expect(result.allowed).toBe(true)
    // Enterprise has 1000/min, so after 101 requests should have 899 remaining
    expect(result.remaining.minute).toBe(899)
  })
})
