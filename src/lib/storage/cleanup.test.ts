/**
 * Storage Cleanup Tests
 *
 * TDD tests for the storage cleanup service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractTimestampFromPath,
  isExpired,
  StorageCleanupService,
  createStorageCleanup,
} from './cleanup'

// Mock Supabase admin client
const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null })
const mockList = vi.fn().mockResolvedValue({ data: [], error: null })

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        list: mockList,
        remove: mockRemove,
      })),
    },
  })),
}))

describe('extractTimestampFromPath', () => {
  it('should extract timestamp from valid path', () => {
    const path = 'listing-123/raw/1704067200000-abc123.jpg'
    const timestamp = extractTimestampFromPath(path)
    expect(timestamp).toBe(1704067200000)
  })

  it('should handle nested category paths', () => {
    const path = 'listing-123/raw/interior/1704067200000-abc123.jpg'
    const timestamp = extractTimestampFromPath(path)
    expect(timestamp).toBe(1704067200000)
  })

  it('should return null for invalid path', () => {
    const path = 'listing-123/raw/invalid-file.jpg'
    const timestamp = extractTimestampFromPath(path)
    expect(timestamp).toBeNull()
  })

  it('should return null for path without timestamp', () => {
    const path = 'listing-123/raw/abc123.jpg'
    const timestamp = extractTimestampFromPath(path)
    expect(timestamp).toBeNull()
  })
})

describe('isExpired', () => {
  it('should return true for files older than retention', () => {
    // Create a timestamp 10 days ago
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000
    const path = `listing-123/raw/${tenDaysAgo}-abc123.jpg`
    // 7 day retention = 168 hours
    expect(isExpired(path, 168)).toBe(true)
  })

  it('should return false for fresh files', () => {
    // Create a timestamp 1 hour ago
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const path = `listing-123/raw/${oneHourAgo}-abc123.jpg`
    // 7 day retention = 168 hours
    expect(isExpired(path, 168)).toBe(false)
  })

  it('should return false for files at boundary', () => {
    // Create a timestamp exactly at retention
    const atBoundary = Date.now() - 168 * 60 * 60 * 1000
    const path = `listing-123/raw/${atBoundary}-abc123.jpg`
    // Should not be expired (uses > not >=)
    expect(isExpired(path, 168)).toBe(false)
  })

  it('should return false for invalid paths', () => {
    const path = 'listing-123/raw/invalid.jpg'
    expect(isExpired(path, 168)).toBe(false)
  })

  it('should handle 48 hour retention', () => {
    // Create a timestamp 3 days ago
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
    const path = `listing-123/processing/${threeDaysAgo}-abc123.jpg`
    // 48 hour retention
    expect(isExpired(path, 48)).toBe(true)
  })
})

describe('StorageCleanupService', () => {
  let cleanup: StorageCleanupService

  beforeEach(() => {
    vi.clearAllMocks()
    mockList.mockResolvedValue({ data: [], error: null })
    mockRemove.mockResolvedValue({ data: null, error: null })
    cleanup = createStorageCleanup()
  })

  describe('cleanupBucket', () => {
    it('should skip buckets with no retention policy', async () => {
      const result = await cleanup.cleanupBucket('final')
      expect(result.deletedCount).toBe(0)
      expect(result.errors).toEqual([])
    })

    it('should skip buckets with no retention policy (qc)', async () => {
      const result = await cleanup.cleanupBucket('qc')
      expect(result.deletedCount).toBe(0)
      expect(result.errors).toEqual([])
    })

    it('should delete expired files from raw bucket', async () => {
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000

      // Mock listing folders
      mockList
        .mockResolvedValueOnce({
          data: [{ name: 'listing-123' }],
          error: null,
        })
        // Mock listing files in folder
        .mockResolvedValueOnce({
          data: [{ name: `${tenDaysAgo}-abc123.jpg` }],
          error: null,
        })

      const result = await cleanup.cleanupBucket('raw')

      expect(result.deletedCount).toBe(1)
      expect(mockRemove).toHaveBeenCalled()
    })

    it('should not delete fresh files', async () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000

      mockList
        .mockResolvedValueOnce({
          data: [{ name: 'listing-123' }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ name: `${oneHourAgo}-abc123.jpg` }],
          error: null,
        })

      const result = await cleanup.cleanupBucket('raw')

      expect(result.deletedCount).toBe(0)
      expect(mockRemove).not.toHaveBeenCalled()
    })

    it('should handle list errors gracefully', async () => {
      mockList.mockResolvedValueOnce({
        data: null,
        error: { message: 'List failed' },
      })

      const result = await cleanup.cleanupBucket('raw')

      expect(result.deletedCount).toBe(0)
      expect(result.errors).toContain('List failed')
    })
  })

  describe('runFullCleanup', () => {
    it('should clean raw and processing buckets', async () => {
      const result = await cleanup.runFullCleanup()

      expect(result.results).toHaveLength(2)
      expect(result.results[0].stage).toBe('raw')
      expect(result.results[1].stage).toBe('processing')
    })

    it('should return summary with timestamps', async () => {
      const result = await cleanup.runFullCleanup()

      expect(result.startedAt).toBeDefined()
      expect(result.completedAt).toBeDefined()
      expect(new Date(result.startedAt).getTime()).toBeLessThanOrEqual(
        new Date(result.completedAt).getTime()
      )
    })

    it('should calculate totals', async () => {
      const result = await cleanup.runFullCleanup()

      expect(typeof result.totalDeleted).toBe('number')
      expect(typeof result.totalErrors).toBe('number')
    })
  })

  describe('getStorageStats', () => {
    it('should return stats for all stages', async () => {
      const stats = await cleanup.getStorageStats()

      expect(stats).toHaveProperty('raw')
      expect(stats).toHaveProperty('processing')
      expect(stats).toHaveProperty('qc')
      expect(stats).toHaveProperty('final')
    })

    it('should include count and size', async () => {
      const stats = await cleanup.getStorageStats()

      expect(stats.raw).toHaveProperty('count')
      expect(stats.raw).toHaveProperty('sizeBytes')
    })
  })
})

describe('createStorageCleanup', () => {
  it('should create cleanup service instance', () => {
    const cleanup = createStorageCleanup()
    expect(cleanup).toBeInstanceOf(StorageCleanupService)
  })
})
