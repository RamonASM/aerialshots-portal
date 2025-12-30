/**
 * Canva Integration Tests
 *
 * TDD tests for Canva OAuth and template integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CanvaClient,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getUserProfile,
  listDesigns,
  createDesignFromTemplate,
  getDesignExportUrl,
  type CanvaTokens,
  type CanvaUserProfile,
  type CanvaDesign,
} from './client'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Canva Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CANVA_CLIENT_ID = 'test-client-id'
    process.env.CANVA_CLIENT_SECRET = 'test-client-secret'
    process.env.CANVA_REDIRECT_URI = 'https://app.aerialshots.media/api/integrations/canva/callback'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('OAuth Flow', () => {
    it('should generate correct authorization URL', () => {
      const state = 'random-state-123'
      const url = getAuthorizationUrl(state)

      expect(url).toContain('https://www.canva.com/api/oauth/authorize')
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('redirect_uri=')
      expect(url).toContain('response_type=code')
      expect(url).toContain(`state=${state}`)
      expect(url).toContain('scope=')
    })

    it('should include required scopes in authorization URL', () => {
      const url = getAuthorizationUrl('state')
      const decodedUrl = decodeURIComponent(url)

      // Required scopes for design creation and management
      expect(decodedUrl).toContain('design:content:read')
      expect(decodedUrl).toContain('design:content:write')
      expect(decodedUrl).toContain('design:meta:read')
    })

    it('should exchange authorization code for tokens', async () => {
      const mockTokens: CanvaTokens = {
        access_token: 'canva-access-token',
        refresh_token: 'canva-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'design:content:read design:content:write',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      })

      const result = await exchangeCodeForTokens('auth-code-123')

      expect(result).toMatchObject(mockTokens)
      expect(result.expires_at).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.canva.com/rest/v1/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      )
    })

    it('should throw error on failed token exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant' }),
      })

      await expect(exchangeCodeForTokens('invalid-code')).rejects.toThrow()
    })

    it('should refresh access token', async () => {
      const mockTokens: CanvaTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'design:content:read design:content:write',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      })

      const result = await refreshAccessToken('old-refresh-token')

      expect(result).toMatchObject(mockTokens)
      expect(result.expires_at).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.canva.com/rest/v1/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('grant_type=refresh_token'),
        })
      )
    })
  })

  describe('User Profile', () => {
    it('should fetch user profile', async () => {
      const mockProfile: CanvaUserProfile = {
        id: 'user-123',
        display_name: 'John Doe',
        email: 'john@example.com',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockProfile }),
      })

      const result = await getUserProfile('access-token')

      expect(result).toEqual(mockProfile)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.canva.com/rest/v1/users/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token',
          }),
        })
      )
    })

    it('should handle unauthorized user profile request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthorized' }),
      })

      await expect(getUserProfile('invalid-token')).rejects.toThrow('Unauthorized')
    })
  })

  describe('Design Management', () => {
    it('should list user designs', async () => {
      const mockDesigns: CanvaDesign[] = [
        {
          id: 'design-1',
          title: 'Property Flyer',
          thumbnail: { url: 'https://example.com/thumb1.jpg' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 'design-2',
          title: 'Social Post',
          thumbnail: { url: 'https://example.com/thumb2.jpg' },
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-04T00:00:00Z',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockDesigns }),
      })

      const result = await listDesigns('access-token')

      expect(result).toEqual(mockDesigns)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.canva.com/rest/v1/designs'),
        expect.any(Object)
      )
    })

    it('should create design from template with listing data', async () => {
      const templateId = 'template-123'
      const listingData = {
        address: '123 Main St',
        price: '$500,000',
        beds: '3',
        baths: '2',
        sqft: '2,000',
        agentName: 'Jane Agent',
        agentPhone: '(555) 123-4567',
        brokerageName: 'Real Estate Co',
        heroImageUrl: 'https://example.com/hero.jpg',
      }

      const mockDesign: CanvaDesign = {
        id: 'new-design-123',
        title: 'Property Flyer - 123 Main St',
        thumbnail: { url: 'https://example.com/thumb.jpg' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        urls: {
          edit_url: 'https://www.canva.com/design/new-design-123/edit',
          view_url: 'https://www.canva.com/design/new-design-123/view',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ design: mockDesign }),
      })

      const result = await createDesignFromTemplate('access-token', templateId, listingData)

      expect(result).toEqual(mockDesign)
      expect(result.urls?.edit_url).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.canva.com/rest/v1/designs',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(templateId),
        })
      )
    })

    it('should get design export URL', async () => {
      // First call: start export job
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: { id: 'export-job-123' } }),
      })

      // Second call: get export status
      const mockExport = {
        status: 'completed',
        urls: [{ url: 'https://example.com/export.pdf' }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: mockExport }),
      })

      const result = await getDesignExportUrl('access-token', 'design-123', 'pdf')

      expect(result).toBe('https://example.com/export.pdf')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('CanvaClient Class', () => {
    it('should initialize with tokens', () => {
      const tokens: CanvaTokens = {
        access_token: 'test-access',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'design:content:read',
      }

      const client = new CanvaClient(tokens)

      expect(client).toBeDefined()
      expect(client.isAuthenticated()).toBe(true)
    })

    it('should check if token is expired', () => {
      const tokens: CanvaTokens = {
        access_token: 'test-access',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'design:content:read',
        expires_at: Date.now() - 1000, // Already expired
      }

      const client = new CanvaClient(tokens)

      expect(client.isTokenExpired()).toBe(true)
    })

    it('should auto-refresh expired token on API call', async () => {
      const expiredTokens: CanvaTokens = {
        access_token: 'expired-access',
        refresh_token: 'valid-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'design:content:read',
        expires_at: Date.now() - 1000,
      }

      const newTokens: CanvaTokens = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'design:content:read',
      }

      // First call refreshes token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newTokens,
      })

      // Second call is the actual API request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 'user-123', display_name: 'Test' } }),
      })

      const client = new CanvaClient(expiredTokens)
      const profile = await client.getProfile()

      expect(profile).toBeDefined()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should create design with listing data', async () => {
      const tokens: CanvaTokens = {
        access_token: 'test-access',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'design:content:write',
        expires_at: Date.now() + 3600000,
      }

      const mockDesign: CanvaDesign = {
        id: 'design-123',
        title: 'Test Design',
        thumbnail: { url: 'https://example.com/thumb.jpg' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ design: mockDesign }),
      })

      const client = new CanvaClient(tokens)
      const result = await client.createFromTemplate('template-id', {
        address: '123 Main St',
        price: '$500,000',
      })

      expect(result).toEqual(mockDesign)
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

      await expect(getUserProfile('access-token')).rejects.toThrow('Rate limited')
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(getUserProfile('access-token')).rejects.toThrow('Network error')
    })

    it('should handle invalid template ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'template_not_found' }),
      })

      await expect(
        createDesignFromTemplate('access-token', 'invalid-template', {})
      ).rejects.toThrow('Template not found')
    })
  })
})
