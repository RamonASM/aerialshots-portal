/**
 * Media URL Resolution Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  resolveMediaUrl,
  getMediaUrlSource,
  isNativeMedia,
  resolveMediaUrls,
  filterBySource,
  getMediaStats,
  isNativeUrl,
} from './resolve-url'
import type { Database } from '@/lib/supabase/types'

type MediaAsset = Database['public']['Tables']['media_assets']['Row']

// Factory for creating test media assets
function createAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: 'test-id',
    listing_id: 'listing-123',
    aryeo_url: null,
    media_url: null,
    storage_bucket: null,
    type: 'photo',
    category: null,
    sort_order: null,
    tip_text: null,
    storage_path: null,
    qc_status: 'pending',
    qc_notes: null,
    created_at: new Date().toISOString(),
    processing_job_id: null,
    processed_storage_path: null,
    approved_storage_path: null,
    edit_history: [],
    qc_assigned_to: null,
    needs_editing: false,
    original_filename: null,
    file_size_bytes: null,
    image_width: null,
    image_height: null,
    migration_status: 'pending',
    migrated_at: null,
    ...overrides,
  }
}

describe('Media URL Resolution', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('resolveMediaUrl', () => {
    it('should prefer media_url when available', () => {
      const asset = createAsset({
        media_url: 'https://supabase.co/native.jpg',
        processed_storage_path: 'https://founddr.com/processed.jpg',
      })

      expect(resolveMediaUrl(asset)).toBe('https://supabase.co/native.jpg')
    })

    it('should use approved_storage_path when media_url is null', () => {
      const asset = createAsset({
        media_url: null,
        approved_storage_path: 'https://supabase.co/approved.jpg',
        processed_storage_path: 'https://founddr.com/processed.jpg',
      })

      expect(resolveMediaUrl(asset)).toBe('https://supabase.co/approved.jpg')
    })

    it('should use processed_storage_path as third priority', () => {
      const asset = createAsset({
        media_url: null,
        approved_storage_path: null,
        processed_storage_path: 'https://founddr.com/processed.jpg',
      })

      expect(resolveMediaUrl(asset)).toBe('https://founddr.com/processed.jpg')
    })

    it('should return null when no URL available', () => {
      const asset = createAsset({
        media_url: null,
        approved_storage_path: null,
        processed_storage_path: null,
      })

      expect(resolveMediaUrl(asset)).toBeNull()
    })
  })

  describe('getMediaUrlSource', () => {
    it('should return "native" for media_url', () => {
      const asset = createAsset({ media_url: 'https://native.com/img.jpg' })
      expect(getMediaUrlSource(asset)).toBe('native')
    })

    it('should return "approved" for approved_storage_path', () => {
      const asset = createAsset({ approved_storage_path: 'https://approved.com/img.jpg' })
      expect(getMediaUrlSource(asset)).toBe('approved')
    })

    it('should return "processed" for processed_storage_path', () => {
      const asset = createAsset({ processed_storage_path: 'https://processed.com/img.jpg' })
      expect(getMediaUrlSource(asset)).toBe('processed')
    })

    it('should return "missing" when no URL available', () => {
      const asset = createAsset({})
      expect(getMediaUrlSource(asset)).toBe('missing')
    })
  })

  describe('isNativeMedia', () => {
    it('should return true for completed migration with media_url', () => {
      const asset = createAsset({
        migration_status: 'completed',
        media_url: 'https://native.com/img.jpg',
      })
      expect(isNativeMedia(asset)).toBe(true)
    })

    it('should return false for pending migration', () => {
      const asset = createAsset({
        migration_status: 'pending',
        media_url: 'https://native.com/img.jpg',
      })
      expect(isNativeMedia(asset)).toBe(false)
    })

    it('should return false when media_url is null', () => {
      const asset = createAsset({
        migration_status: 'completed',
        media_url: null,
      })
      expect(isNativeMedia(asset)).toBe(false)
    })
  })

  describe('resolveMediaUrls', () => {
    it('should resolve URLs for multiple assets', () => {
      const assets = [
        createAsset({
          id: '1',
          media_url: 'https://native.com/1.jpg',
          type: 'photo',
          category: 'exterior',
        }),
        createAsset({
          id: '2',
          processed_storage_path: 'https://proc.com/2.jpg',
          type: 'video',
          category: 'tour',
        }),
      ]

      const result = resolveMediaUrls(assets)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: '1',
        url: 'https://native.com/1.jpg',
        source: 'native',
        type: 'photo',
        category: 'exterior',
      })
      expect(result[1]).toEqual({
        id: '2',
        url: 'https://proc.com/2.jpg',
        source: 'processed',
        type: 'video',
        category: 'tour',
      })
    })
  })

  describe('filterBySource', () => {
    it('should filter assets by source type', () => {
      const assets = [
        createAsset({ id: '1', media_url: 'https://native.com/1.jpg' }),
        createAsset({ id: '2', processed_storage_path: 'https://proc.com/2.jpg' }),
        createAsset({ id: '3', media_url: 'https://native.com/3.jpg' }),
      ]

      const nativeAssets = filterBySource(assets, 'native')
      const processedAssets = filterBySource(assets, 'processed')

      expect(nativeAssets).toHaveLength(2)
      expect(processedAssets).toHaveLength(1)
      expect(nativeAssets.map((a) => a.id)).toEqual(['1', '3'])
      expect(processedAssets.map((a) => a.id)).toEqual(['2'])
    })
  })

  describe('getMediaStats', () => {
    it('should calculate media statistics', () => {
      const assets = [
        createAsset({ media_url: 'https://native.com/1.jpg' }),
        createAsset({ media_url: 'https://native.com/2.jpg' }),
        createAsset({ processed_storage_path: 'https://proc.com/3.jpg' }),
        createAsset({}), // missing
      ]

      const stats = getMediaStats(assets)

      expect(stats.total).toBe(4)
      expect(stats.native).toBe(2)
      expect(stats.processed).toBe(1)
      expect(stats.missing).toBe(1)
    })

    it('should handle empty array', () => {
      const stats = getMediaStats([])

      expect(stats.total).toBe(0)
      expect(stats.native).toBe(0)
    })
  })

  describe('isNativeUrl', () => {
    it('should identify native Supabase URLs', () => {
      expect(isNativeUrl('https://test.supabase.co/storage/photo.jpg')).toBe(true)
    })

    it('should not match other URLs', () => {
      expect(isNativeUrl('https://other.com/photo.jpg')).toBe(false)
    })

    it('should handle missing env var', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      expect(isNativeUrl('https://test.supabase.co/photo.jpg')).toBe(false)
    })
  })
})
