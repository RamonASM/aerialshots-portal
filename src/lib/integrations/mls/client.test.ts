/**
 * MLS Integration Tests
 *
 * TDD tests for MLS direct upload providers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  MLSClient,
  getMLSProvider,
  listMLSProviders,
  uploadPhotosToMLS,
  validateMLSCredentials,
  type MLSProvider,
  type MLSCredentials,
  type MLSUploadResult,
  type MLSPhoto,
} from './client'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('MLS Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Provider Management', () => {
    it('should list available MLS providers', async () => {
      const providers = await listMLSProviders()

      expect(providers).toBeInstanceOf(Array)
      expect(providers.length).toBeGreaterThan(0)

      // Check provider structure
      const provider = providers[0]
      expect(provider).toHaveProperty('id')
      expect(provider).toHaveProperty('name')
      expect(provider).toHaveProperty('slug')
      expect(provider).toHaveProperty('provider_type')
      expect(provider).toHaveProperty('supports_photo_upload')
    })

    it('should get provider by slug', async () => {
      const provider = await getMLSProvider('flexmls')

      expect(provider).not.toBeNull()
      expect(provider?.slug).toBe('flexmls')
      expect(provider?.provider_type).toBe('flexmls')
    })

    it('should return null for unknown provider', async () => {
      const provider = await getMLSProvider('unknown-mls')

      expect(provider).toBeNull()
    })

    it('should include provider capabilities', async () => {
      const provider = await getMLSProvider('flexmls')

      expect(provider).toHaveProperty('supports_photo_upload')
      expect(provider).toHaveProperty('supports_video_upload')
      expect(provider).toHaveProperty('supports_3d_tour')
      expect(provider).toHaveProperty('max_photos')
    })
  })

  describe('Credential Validation', () => {
    it('should validate correct MLS credentials', async () => {
      const credentials: MLSCredentials = {
        provider_slug: 'flexmls',
        agent_id: 'MLS-12345',
        password: 'secure-password',
        office_id: 'OFFICE-001',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, agent_name: 'John Agent' }),
      })

      const result = await validateMLSCredentials(credentials)

      expect(result.valid).toBe(true)
      expect(result.agent_name).toBe('John Agent')
    })

    it('should reject invalid credentials', async () => {
      const credentials: MLSCredentials = {
        provider_slug: 'flexmls',
        agent_id: 'INVALID',
        password: 'wrong-password',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'invalid_credentials' }),
      })

      const result = await validateMLSCredentials(credentials)

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle provider API errors', async () => {
      const credentials: MLSCredentials = {
        provider_slug: 'flexmls',
        agent_id: 'MLS-12345',
        password: 'password',
      }

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await validateMLSCredentials(credentials)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('error')
    })
  })

  describe('Photo Upload', () => {
    it('should upload single photo to MLS', async () => {
      const photos: MLSPhoto[] = [
        {
          url: 'https://example.com/photo1.jpg',
          order: 1,
          caption: 'Living Room',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          uploaded: [{ id: 'mls-photo-1', order: 1, status: 'success' }],
        }),
      })

      const result = await uploadPhotosToMLS({
        provider_slug: 'flexmls',
        listing_id: 'MLS-LISTING-123',
        photos,
        credentials: {
          agent_id: 'MLS-12345',
          password: 'password',
        },
      })

      expect(result.success).toBe(true)
      expect(result.uploaded_count).toBe(1)
    })

    it('should upload multiple photos with ordering', async () => {
      const photos: MLSPhoto[] = [
        { url: 'https://example.com/photo1.jpg', order: 1, caption: 'Front' },
        { url: 'https://example.com/photo2.jpg', order: 2, caption: 'Kitchen' },
        { url: 'https://example.com/photo3.jpg', order: 3, caption: 'Bedroom' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          uploaded: photos.map((p, i) => ({
            id: `mls-photo-${i + 1}`,
            order: p.order,
            status: 'success',
          })),
        }),
      })

      const result = await uploadPhotosToMLS({
        provider_slug: 'flexmls',
        listing_id: 'MLS-LISTING-123',
        photos,
        credentials: {
          agent_id: 'MLS-12345',
          password: 'password',
        },
      })

      expect(result.success).toBe(true)
      expect(result.uploaded_count).toBe(3)
      expect(result.results).toHaveLength(3)
    })

    it('should handle partial upload failures', async () => {
      const photos: MLSPhoto[] = [
        { url: 'https://example.com/photo1.jpg', order: 1 },
        { url: 'https://example.com/photo2.jpg', order: 2 },
        { url: 'https://example.com/broken.jpg', order: 3 },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          uploaded: [
            { id: 'mls-photo-1', order: 1, status: 'success' },
            { id: 'mls-photo-2', order: 2, status: 'success' },
            { order: 3, status: 'failed', error: 'Invalid image format' },
          ],
        }),
      })

      const result = await uploadPhotosToMLS({
        provider_slug: 'flexmls',
        listing_id: 'MLS-LISTING-123',
        photos,
        credentials: {
          agent_id: 'MLS-12345',
          password: 'password',
        },
      })

      expect(result.success).toBe(false)
      expect(result.uploaded_count).toBe(2)
      expect(result.failed_count).toBe(1)
    })

    it('should respect max photos limit', async () => {
      const provider = await getMLSProvider('flexmls')
      const maxPhotos = provider?.max_photos || 50

      const tooManyPhotos: MLSPhoto[] = Array.from({ length: maxPhotos + 10 }, (_, i) => ({
        url: `https://example.com/photo${i}.jpg`,
        order: i + 1,
      }))

      await expect(
        uploadPhotosToMLS({
          provider_slug: 'flexmls',
          listing_id: 'MLS-LISTING-123',
          photos: tooManyPhotos,
          credentials: {
            agent_id: 'MLS-12345',
            password: 'password',
          },
        })
      ).rejects.toThrow(/exceeds maximum/)
    })

    it('should replace existing photos when specified', async () => {
      const photos: MLSPhoto[] = [
        { url: 'https://example.com/new-photo.jpg', order: 1 },
      ]

      mockFetch
        // First call: delete existing photos
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ deleted: 5 }),
        })
        // Second call: upload new photos
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            uploaded: [{ id: 'mls-photo-1', order: 1, status: 'success' }],
          }),
        })

      const result = await uploadPhotosToMLS({
        provider_slug: 'flexmls',
        listing_id: 'MLS-LISTING-123',
        photos,
        credentials: {
          agent_id: 'MLS-12345',
          password: 'password',
        },
        replace_existing: true,
      })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('MLSClient Class', () => {
    it('should initialize with credentials', () => {
      const client = new MLSClient('flexmls', {
        agent_id: 'MLS-12345',
        password: 'password',
      })

      expect(client).toBeDefined()
      expect(client.getProviderSlug()).toBe('flexmls')
    })

    it('should check if authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      })

      const client = new MLSClient('flexmls', {
        agent_id: 'MLS-12345',
        password: 'password',
      })

      const isAuth = await client.isAuthenticated()
      expect(isAuth).toBe(true)
    })

    it('should upload photos through client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          uploaded: [{ id: 'mls-photo-1', order: 1, status: 'success' }],
        }),
      })

      const client = new MLSClient('flexmls', {
        agent_id: 'MLS-12345',
        password: 'password',
      })

      const result = await client.uploadPhotos('MLS-LISTING-123', [
        { url: 'https://example.com/photo.jpg', order: 1 },
      ])

      expect(result.success).toBe(true)
    })

    it('should get listing details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          listing_id: 'MLS-123',
          address: '123 Main St',
          status: 'active',
          photos: [{ id: 'photo-1', url: 'https://example.com/photo.jpg' }],
        }),
      })

      const client = new MLSClient('flexmls', {
        agent_id: 'MLS-12345',
        password: 'password',
      })

      const listing = await client.getListing('MLS-123')

      expect(listing).toBeDefined()
      expect(listing?.listing_id).toBe('MLS-123')
      expect(listing?.photos).toHaveLength(1)
    })
  })

  describe('Provider-Specific Implementations', () => {
    it('should format FlexMLS API requests correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, uploaded: [] }),
      })

      await uploadPhotosToMLS({
        provider_slug: 'flexmls',
        listing_id: 'MLS-123',
        photos: [{ url: 'https://example.com/photo.jpg', order: 1 }],
        credentials: { agent_id: 'MLS-12345', password: 'password' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('flexmls'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should format Matrix API requests correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, uploaded: [] }),
      })

      await uploadPhotosToMLS({
        provider_slug: 'matrix',
        listing_id: 'MATRIX-123',
        photos: [{ url: 'https://example.com/photo.jpg', order: 1 }],
        credentials: { agent_id: 'MATRIX-AGENT', password: 'password' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('matrix'),
        expect.any(Object)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === 'Retry-After' ? '60' : null),
        },
        json: async () => ({ error: 'rate_limited' }),
      })

      const result = await uploadPhotosToMLS({
        provider_slug: 'flexmls',
        listing_id: 'MLS-123',
        photos: [{ url: 'https://example.com/photo.jpg', order: 1 }],
        credentials: { agent_id: 'MLS-12345', password: 'password' },
      })

      expect(result.success).toBe(false)
      expect(result.error?.toLowerCase()).toContain('rate')
    })

    it('should handle authentication failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthorized' }),
      })

      const result = await uploadPhotosToMLS({
        provider_slug: 'flexmls',
        listing_id: 'MLS-123',
        photos: [{ url: 'https://example.com/photo.jpg', order: 1 }],
        credentials: { agent_id: 'MLS-12345', password: 'wrong' },
      })

      expect(result.success).toBe(false)
      expect(result.error?.toLowerCase()).toContain('authentication')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await uploadPhotosToMLS({
        provider_slug: 'flexmls',
        listing_id: 'MLS-123',
        photos: [{ url: 'https://example.com/photo.jpg', order: 1 }],
        credentials: { agent_id: 'MLS-12345', password: 'password' },
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate listing ID format', async () => {
      await expect(
        uploadPhotosToMLS({
          provider_slug: 'flexmls',
          listing_id: '', // Empty listing ID
          photos: [{ url: 'https://example.com/photo.jpg', order: 1 }],
          credentials: { agent_id: 'MLS-12345', password: 'password' },
        })
      ).rejects.toThrow(/listing.*id/i)
    })
  })
})
