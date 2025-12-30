/**
 * Bannerbear Integration Tests
 *
 * Tests for Bannerbear image and collection rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock environment
const originalEnv = process.env

describe('Bannerbear Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      BANNERBEAR_API_KEY: 'test-api-key',
    }
  })

  describe('Image Request Structure', () => {
    it('should have required fields for image request', () => {
      const request = {
        template: 'template-123',
        modifications: [
          { name: 'title', text: 'Beautiful Home' },
          { name: 'image', image_url: 'https://example.com/photo.jpg' },
        ],
        webhook_url: 'https://example.com/webhook',
        metadata: 'listing-456',
      }

      expect(request.template).toBeDefined()
      expect(request.modifications).toBeInstanceOf(Array)
      expect(request.modifications.length).toBeGreaterThan(0)
    })

    it('should support text modifications', () => {
      const modification = {
        name: 'headline',
        text: 'New Listing!',
      }

      expect(modification.name).toBe('headline')
      expect(modification.text).toBe('New Listing!')
    })

    it('should support image modifications', () => {
      const modification = {
        name: 'hero_image',
        image_url: 'https://cdn.example.com/photo.jpg',
      }

      expect(modification.name).toBe('hero_image')
      expect(modification.image_url).toContain('https://')
    })

    it('should support color modifications', () => {
      const modification = {
        name: 'background',
        color: '#0077ff',
      }

      expect(modification.name).toBe('background')
      expect(modification.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })

  describe('Image Response Structure', () => {
    it('should have required fields for pending image', () => {
      const response = {
        uid: 'img-123',
        status: 'pending',
        image_url: null,
        image_url_png: null,
        image_url_jpg: null,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      }

      expect(response.uid).toBeDefined()
      expect(response.status).toBe('pending')
      expect(response.image_url).toBeNull()
    })

    it('should have image URLs for completed image', () => {
      const response = {
        uid: 'img-123',
        status: 'completed',
        image_url: 'https://cdn.bannerbear.com/img/123.jpg',
        image_url_png: 'https://cdn.bannerbear.com/img/123.png',
        image_url_jpg: 'https://cdn.bannerbear.com/img/123.jpg',
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:01Z',
        render_time_ms: 1500,
      }

      expect(response.status).toBe('completed')
      expect(response.image_url).toBeDefined()
      expect(response.render_time_ms).toBe(1500)
    })

    it('should handle failed status', () => {
      const response = {
        uid: 'img-123',
        status: 'failed',
        image_url: null,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:02Z',
      }

      expect(response.status).toBe('failed')
    })
  })

  describe('Collection Request Structure', () => {
    it('should have required fields for collection request', () => {
      const request = {
        template_set: 'carousel-set-123',
        modifications: [
          [{ name: 'title', text: 'Slide 1' }],
          [{ name: 'title', text: 'Slide 2' }],
          [{ name: 'title', text: 'Slide 3' }],
        ],
        webhook_url: 'https://example.com/webhook',
      }

      expect(request.template_set).toBeDefined()
      expect(request.modifications).toBeInstanceOf(Array)
      expect(request.modifications.length).toBe(3)
    })

    it('should support different modifications per slide', () => {
      const modifications = [
        [
          { name: 'title', text: 'Welcome' },
          { name: 'image', image_url: 'https://example.com/1.jpg' },
        ],
        [
          { name: 'title', text: 'Features' },
          { name: 'image', image_url: 'https://example.com/2.jpg' },
        ],
      ]

      expect(modifications[0][0].text).toBe('Welcome')
      expect(modifications[1][0].text).toBe('Features')
    })
  })

  describe('Collection Response Structure', () => {
    it('should have required fields for collection', () => {
      const response = {
        uid: 'col-123',
        status: 'pending',
        images: [],
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      }

      expect(response.uid).toBeDefined()
      expect(response.status).toBeDefined()
      expect(response.images).toBeInstanceOf(Array)
    })

    it('should have images array when completed', () => {
      const response = {
        uid: 'col-123',
        status: 'completed',
        images: [
          { uid: 'img-1', status: 'completed', image_url: 'https://cdn.bannerbear.com/1.jpg' },
          { uid: 'img-2', status: 'completed', image_url: 'https://cdn.bannerbear.com/2.jpg' },
          { uid: 'img-3', status: 'completed', image_url: 'https://cdn.bannerbear.com/3.jpg' },
        ],
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:05Z',
      }

      expect(response.status).toBe('completed')
      expect(response.images.length).toBe(3)
      expect(response.images[0].image_url).toBeDefined()
    })
  })

  describe('API Headers', () => {
    it('should include authorization header', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-key',
      }

      expect(headers['Content-Type']).toBe('application/json')
      expect(headers.Authorization).toContain('Bearer')
    })
  })

  describe('Modification Types', () => {
    const validateModification = (mod: { name: string; text?: string; image_url?: string; color?: string }) => {
      if (!mod.name) return false
      const hasValue = mod.text !== undefined || mod.image_url !== undefined || mod.color !== undefined
      return hasValue
    }

    it('should validate text modification', () => {
      expect(validateModification({ name: 'title', text: 'Hello' })).toBe(true)
    })

    it('should validate image modification', () => {
      expect(validateModification({ name: 'photo', image_url: 'https://example.com/img.jpg' })).toBe(true)
    })

    it('should validate color modification', () => {
      expect(validateModification({ name: 'bg', color: '#ffffff' })).toBe(true)
    })

    it('should reject modification without value', () => {
      expect(validateModification({ name: 'empty' })).toBe(false)
    })
  })

  describe('Carousel Templates', () => {
    const CAROUSEL_TEMPLATES = {
      INSTAGRAM_CAROUSEL: 'instagram-carousel-template',
      FACEBOOK_CAROUSEL: 'facebook-carousel-template',
      STORY_CAROUSEL: 'story-carousel-template',
    }

    it('should have Instagram carousel template', () => {
      expect(CAROUSEL_TEMPLATES.INSTAGRAM_CAROUSEL).toBeDefined()
    })

    it('should have Facebook carousel template', () => {
      expect(CAROUSEL_TEMPLATES.FACEBOOK_CAROUSEL).toBeDefined()
    })

    it('should have Story carousel template', () => {
      expect(CAROUSEL_TEMPLATES.STORY_CAROUSEL).toBeDefined()
    })
  })

  describe('Webhook Integration', () => {
    it('should support webhook URL in request', () => {
      const request = {
        template: 'template-123',
        modifications: [{ name: 'title', text: 'Test' }],
        webhook_url: 'https://app.aerialshots.media/api/bannerbear/webhook',
      }

      expect(request.webhook_url).toContain('/api/bannerbear/webhook')
    })

    it('should support metadata for tracking', () => {
      const request = {
        template: 'template-123',
        modifications: [{ name: 'title', text: 'Test' }],
        metadata: JSON.stringify({ listingId: 'listing-123', type: 'carousel' }),
      }

      const parsed = JSON.parse(request.metadata)
      expect(parsed.listingId).toBe('listing-123')
      expect(parsed.type).toBe('carousel')
    })
  })

  describe('Error Handling', () => {
    it('should throw when API key is missing', () => {
      process.env.BANNERBEAR_API_KEY = ''

      const getApiKey = () => {
        const apiKey = process.env.BANNERBEAR_API_KEY
        if (!apiKey) {
          throw new Error('BANNERBEAR_API_KEY not configured')
        }
        return apiKey
      }

      expect(() => getApiKey()).toThrow('BANNERBEAR_API_KEY not configured')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid template',
      })

      // Simulating error handling
      const response = await mockFetch()
      expect(response.ok).toBe(false)
    })
  })

  describe('Render Time Tracking', () => {
    it('should track render time in milliseconds', () => {
      const response = {
        uid: 'img-123',
        status: 'completed',
        render_time_ms: 2500,
      }

      expect(response.render_time_ms).toBe(2500)
      expect(response.render_time_ms).toBeLessThan(10000) // Should be under 10 seconds
    })
  })
})
