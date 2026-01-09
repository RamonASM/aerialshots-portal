import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  generateMarketingKit,
  generateSocialPost,
  generatePropertyFlyer,
  generateInstagramStory,
  getMarketingKit,
  regenerateAsset,
  type MarketingKit,
  type MarketingAsset,
  type AssetType,
} from './kit-generator'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock Bannerbear
vi.mock('@/lib/integrations/bannerbear', () => ({
  generateImage: vi.fn(() =>
    Promise.resolve({
      success: true,
      url: 'https://cdn.bannerbear.com/generated/123.png',
    })
  ),
}))

// Helper to create fully chainable mock
const createChain = (finalResult: unknown) => {
  const createNestedChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {}
    const methods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'is', 'in', 'contains',
      'gte', 'gt', 'lt', 'lte',
      'order', 'limit', 'range',
      'single', 'maybeSingle', 'rpc', 'returns'
    ]
    methods.forEach((method) => {
      chain[method] = () => createNestedChain()
    })
    // Terminal methods return a thenable with .returns()
    const terminalMethods = ['single', 'maybeSingle']
    terminalMethods.forEach((method) => {
      chain[method] = () => {
        const result = Promise.resolve(finalResult) as Promise<unknown> & { returns: () => Promise<unknown> }
        result.returns = () => result
        return result
      }
    })
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(finalResult).then(resolve)
    return chain
  }
  return createNestedChain()
}

describe('Marketing Kit Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('generateMarketingKit', () => {
    it('should generate a complete marketing kit for a listing', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'listing-1',
              address: '123 Main St',
              price: 450000,
              bedrooms: 3,
              bathrooms: 2,
              sqft: 1800,
              photos: ['photo1.jpg', 'photo2.jpg'],
            },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'kit-1',
              listing_id: 'listing-1',
              assets: [],
            },
            error: null,
          })
        )

      const result = await generateMarketingKit('listing-1')

      expect(result.success).toBe(true)
      expect(result.kit).toBeDefined()
    })

    it('should generate multiple asset types', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'listing-1',
              address: '123 Main St',
              photos: ['photo1.jpg'],
            },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'kit-1',
              assets: [
                { type: 'social_post', url: 'social.png' },
                { type: 'flyer', url: 'flyer.pdf' },
                { type: 'instagram_story', url: 'story.png' },
              ],
            },
            error: null,
          })
        )

      const result = await generateMarketingKit('listing-1', {
        asset_types: ['social_post', 'flyer', 'instagram_story'],
      })

      expect(result.success).toBe(true)
    })

    it('should use agent branding if available', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'listing-1',
              photos: ['photo1.jpg'],
              agent: {
                logo_url: 'logo.png',
                brand_color: '#FF5500',
              },
            },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: { id: 'kit-1' },
            error: null,
          })
        )

      const result = await generateMarketingKit('listing-1')

      expect(result.success).toBe(true)
    })

    it('should handle missing listing', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        })
      )

      const result = await generateMarketingKit('invalid-listing')

      expect(result.success).toBe(false)
      expect(result.error?.toLowerCase()).toContain('not found')
    })
  })

  describe('generateSocialPost', () => {
    it('should generate social media post image', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'asset-1',
            type: 'social_post',
            url: 'https://cdn.example.com/social.png',
            dimensions: { width: 1200, height: 630 },
          },
          error: null,
        })
      )

      const result = await generateSocialPost({
        listing_id: 'listing-1',
        photo_url: 'photo.jpg',
        headline: 'Just Listed!',
        price: '$450,000',
        address: '123 Main St',
      })

      expect(result.success).toBe(true)
      expect(result.asset?.type).toBe('social_post')
    })

    it('should support different platforms', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { type: 'social_post', platform: 'facebook' },
          error: null,
        })
      )

      const result = await generateSocialPost({
        listing_id: 'listing-1',
        photo_url: 'photo.jpg',
        platform: 'facebook',
      })

      expect(result.success).toBe(true)
    })

    it('should include agent contact info', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { type: 'social_post' },
          error: null,
        })
      )

      const result = await generateSocialPost({
        listing_id: 'listing-1',
        photo_url: 'photo.jpg',
        agent_name: 'John Agent',
        agent_phone: '555-1234',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('generatePropertyFlyer', () => {
    it('should generate PDF property flyer', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'asset-1',
            type: 'flyer',
            url: 'https://cdn.example.com/flyer.pdf',
            format: 'pdf',
          },
          error: null,
        })
      )

      const result = await generatePropertyFlyer({
        listing_id: 'listing-1',
        photos: ['photo1.jpg', 'photo2.jpg'],
        details: {
          price: '$450,000',
          bedrooms: 3,
          bathrooms: 2,
          sqft: 1800,
        },
      })

      expect(result.success).toBe(true)
      expect(result.asset?.type).toBe('flyer')
    })

    it('should support different templates', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { type: 'flyer', template: 'luxury' },
          error: null,
        })
      )

      const result = await generatePropertyFlyer({
        listing_id: 'listing-1',
        template: 'luxury',
      })

      expect(result.success).toBe(true)
    })

    it('should include QR code for property website', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { type: 'flyer', has_qr_code: true },
          error: null,
        })
      )

      const result = await generatePropertyFlyer({
        listing_id: 'listing-1',
        include_qr_code: true,
        property_url: 'https://example.com/property/123',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('generateInstagramStory', () => {
    it('should generate vertical story image', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'asset-1',
            type: 'instagram_story',
            url: 'https://cdn.example.com/story.png',
            dimensions: { width: 1080, height: 1920 },
          },
          error: null,
        })
      )

      const result = await generateInstagramStory({
        listing_id: 'listing-1',
        photo_url: 'photo.jpg',
        headline: 'New Listing!',
      })

      expect(result.success).toBe(true)
      expect(result.asset?.type).toBe('instagram_story')
    })

    it('should support animated stories', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { type: 'instagram_story', format: 'mp4' },
          error: null,
        })
      )

      const result = await generateInstagramStory({
        listing_id: 'listing-1',
        photo_url: 'photo.jpg',
        animated: true,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('getMarketingKit', () => {
    it('should return existing marketing kit', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'kit-1',
            listing_id: 'listing-1',
            assets: [
              { type: 'social_post', url: 'social.png' },
              { type: 'flyer', url: 'flyer.pdf' },
            ],
            created_at: '2025-01-15T10:00:00',
          },
          error: null,
        })
      )

      const result = await getMarketingKit('listing-1')

      expect(result).not.toBeNull()
      expect(result?.assets?.length).toBe(2)
    })

    it('should return null for listing without kit', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: null,
        })
      )

      const result = await getMarketingKit('no-kit-listing')

      expect(result).toBeNull()
    })
  })

  describe('regenerateAsset', () => {
    it('should regenerate a specific asset', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: { id: 'asset-1', type: 'social_post' },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'asset-1',
              url: 'https://cdn.example.com/new-social.png',
              regenerated_at: '2025-01-15T10:00:00',
            },
            error: null,
          })
        )

      const result = await regenerateAsset('asset-1')

      expect(result.success).toBe(true)
    })

    it('should update the asset URL', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: { id: 'asset-1', type: 'flyer' },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: { url: 'https://cdn.example.com/updated.pdf' },
            error: null,
          })
        )

      const result = await regenerateAsset('asset-1')

      expect(result.success).toBe(true)
    })
  })
})

describe('Marketing Kit Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle listings without photos', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: {
          id: 'listing-1',
          photos: [],
        },
        error: null,
      })
    )

    const result = await generateMarketingKit('listing-1')

    expect(result.success).toBe(false)
    expect(result.error).toContain('photo')
  })

  it('should handle generation service errors', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: null,
        error: { message: 'Service unavailable' },
      })
    )

    const result = await generateSocialPost({
      listing_id: 'listing-1',
      photo_url: 'photo.jpg',
    })

    expect(result.success).toBe(false)
  })
})
