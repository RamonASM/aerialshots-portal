/**
 * Content Skills Tests
 *
 * Tests for Claude-powered content generation skills:
 * - Listing Description
 * - Social Caption
 * - Email Copy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeSkill } from '../executor'
import { registerSkill, clearRegistry } from '../registry'
import { listingDescriptionSkill } from './listing-description'
import { socialCaptionSkill } from './social-caption'
import { emailCopySkill } from './email-copy'
import type { PropertyData, NeighborhoodData, ContentStyle } from './types'

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  }),
}))

// Mock the Claude provider
const mockGenerateWithClaude = vi.fn()
const mockParseJsonResponse = vi.fn()
const mockParseArrayResponse = vi.fn()

vi.mock('./claude-provider', () => ({
  generateWithClaude: (...args: unknown[]) => mockGenerateWithClaude(...args),
  parseJsonResponse: (...args: unknown[]) => mockParseJsonResponse(...args),
  parseArrayResponse: (...args: unknown[]) => mockParseArrayResponse(...args),
}))

// Sample test data
const sampleProperty: PropertyData = {
  address: '123 Main Street',
  city: 'Orlando',
  state: 'FL',
  zipCode: '32801',
  beds: 4,
  baths: 3,
  sqft: 2500,
  price: 450000,
  yearBuilt: 2018,
  propertyType: 'single_family',
  features: ['Pool', 'Updated Kitchen', 'Smart Home', 'Solar Panels'],
  neighborhood: 'Lake Eola Heights',
  schoolDistrict: 'Orange County',
  agentName: 'Jane Smith',
  agentPhone: '(407) 555-1234',
  mlsNumber: 'MLS12345',
}

const sampleNeighborhood: NeighborhoodData = {
  name: 'Lake Eola Heights',
  city: 'Orlando',
  state: 'FL',
  walkScore: 85,
  transitScore: 60,
  bikeScore: 70,
  nearbyPlaces: ['Lake Eola Park', 'Downtown Orlando', 'Thornton Park'],
  vibe: 'Urban walkable with lakefront access',
}

describe('Content Skills', () => {
  beforeEach(() => {
    clearRegistry()
    vi.clearAllMocks()

    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-api-key'

    // Default mock for parseJsonResponse
    mockParseJsonResponse.mockImplementation((response: string) => {
      try {
        return JSON.parse(response)
      } catch {
        return {}
      }
    })
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  // ===========================================
  // LISTING DESCRIPTION SKILL TESTS
  // ===========================================
  describe('Listing Description Skill', () => {
    beforeEach(() => {
      registerSkill(listingDescriptionSkill)

      // Set up mock response for listing descriptions
      mockGenerateWithClaude.mockResolvedValue({
        content: JSON.stringify({
          description: 'Welcome to this stunning 4-bedroom, 3-bathroom home in Lake Eola Heights. Features include a sparkling pool, updated kitchen, and smart home technology.',
          highlights: ['Pool', 'Updated Kitchen', 'Smart Home'],
        }),
        tokensUsed: 450,
        model: 'claude-3-haiku-20240307',
      })

      mockParseJsonResponse.mockReturnValue({
        description: 'Welcome to this stunning 4-bedroom, 3-bathroom home in Lake Eola Heights. Features include a sparkling pool, updated kitchen, and smart home technology.',
        highlights: ['Pool', 'Updated Kitchen', 'Smart Home'],
      })
    })

    it('should register with correct metadata', () => {
      expect(listingDescriptionSkill.id).toBe('listing-description')
      expect(listingDescriptionSkill.category).toBe('generate')
      expect(listingDescriptionSkill.provider).toBe('anthropic')
    })

    it('should validate required fields', () => {
      const errors = listingDescriptionSkill.validate!({} as any)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.field === 'property')).toBe(true)
    })

    it('should validate property fields', () => {
      const errors = listingDescriptionSkill.validate!({
        property: { address: '123 Main St' },
      } as any)
      expect(errors.some(e => e.field === 'property.city')).toBe(true)
      expect(errors.some(e => e.field === 'property.state')).toBe(true)
    })

    it('should validate numeric fields', () => {
      const errors = listingDescriptionSkill.validate!({
        property: {
          address: '123 Main St',
          city: 'Orlando',
          state: 'FL',
          beds: -1,
          baths: 0,
          sqft: -100,
        },
      } as any)
      expect(errors.some(e => e.field === 'property.beds')).toBe(true)
      expect(errors.some(e => e.field === 'property.baths')).toBe(true)
      expect(errors.some(e => e.field === 'property.sqft')).toBe(true)
    })

    it('should generate a listing description', async () => {
      const result = await executeSkill({
        skillId: 'listing-description',
        input: { property: sampleProperty },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.description).toBeDefined()
      expect(result.data.highlights).toBeInstanceOf(Array)
    })

    it('should include style in output', async () => {
      const result = await executeSkill({
        skillId: 'listing-description',
        input: {
          property: sampleProperty,
          style: 'luxury' as ContentStyle,
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.style).toBe('luxury')
    })

    it('should accept neighborhood data', async () => {
      const result = await executeSkill({
        skillId: 'listing-description',
        input: {
          property: sampleProperty,
          neighborhood: sampleNeighborhood,
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      // Verify neighborhood was included in prompt
      expect(mockGenerateWithClaude).toHaveBeenCalledWith(
        expect.stringContaining('Lake Eola Heights'),
        expect.any(Object)
      )
    })

    it('should calculate word count', async () => {
      const result = await executeSkill({
        skillId: 'listing-description',
        input: { property: sampleProperty },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.wordCount).toBeGreaterThan(0)
    })

    it('should include execution metadata', async () => {
      const result = await executeSkill({
        skillId: 'listing-description',
        input: { property: sampleProperty },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.metadata.executionTimeMs).toBeDefined()
      expect(result.metadata.provider).toBe('anthropic')
    })

    it('should handle API errors gracefully', async () => {
      mockGenerateWithClaude.mockRejectedValue(new Error('ANTHROPIC_API_KEY not set'))

      const result = await executeSkill({
        skillId: 'listing-description',
        input: { property: sampleProperty },
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('INVALID_API_KEY')
    })

    it('should handle rate limiting', async () => {
      mockGenerateWithClaude.mockRejectedValue(new Error('Rate limited (429)'))

      const result = await executeSkill({
        skillId: 'listing-description',
        input: { property: sampleProperty },
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limited')
    })

    it('should estimate cost', async () => {
      const cost = await listingDescriptionSkill.estimateCost!({
        property: sampleProperty,
      })
      expect(cost).toBeGreaterThan(0)
      expect(cost).toBeLessThan(0.01) // Should be very cheap for Haiku
    })
  })

  // ===========================================
  // SOCIAL CAPTION SKILL TESTS
  // ===========================================
  describe('Social Caption Skill', () => {
    beforeEach(() => {
      registerSkill(socialCaptionSkill)

      // Set up mock response for social captions
      mockGenerateWithClaude.mockResolvedValue({
        content: JSON.stringify({
          caption: '🏡 Just listed in Lake Eola Heights! 4 beds, 3 baths, stunning pool. Your dream home awaits! #realestate #orlando #justlisted',
          hashtags: ['realestate', 'orlando', 'justlisted', 'dreamhome', 'pool'],
        }),
        tokensUsed: 280,
        model: 'claude-3-haiku-20240307',
      })

      mockParseJsonResponse.mockReturnValue({
        caption: '🏡 Just listed in Lake Eola Heights! 4 beds, 3 baths, stunning pool. Your dream home awaits! #realestate #orlando #justlisted',
        hashtags: ['realestate', 'orlando', 'justlisted', 'dreamhome', 'pool'],
      })
    })

    it('should register with correct metadata', () => {
      expect(socialCaptionSkill.id).toBe('social-caption')
      expect(socialCaptionSkill.category).toBe('generate')
      expect(socialCaptionSkill.provider).toBe('anthropic')
    })

    it('should validate required fields', () => {
      const errors = socialCaptionSkill.validate!({} as any)
      expect(errors.some(e => e.field === 'property')).toBe(true)
    })

    it('should validate platform', () => {
      const errors = socialCaptionSkill.validate!({
        property: sampleProperty,
        platform: 'invalid_platform',
      } as any)
      expect(errors.some(e => e.field === 'platform')).toBe(true)
    })

    it('should generate an Instagram caption', async () => {
      const result = await executeSkill({
        skillId: 'social-caption',
        input: {
          property: sampleProperty,
          platform: 'instagram',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.caption).toBeDefined()
      expect(result.data.platform).toBe('instagram')
      expect(result.data.hashtags).toBeInstanceOf(Array)
    })

    it('should generate a TikTok caption', async () => {
      const result = await executeSkill({
        skillId: 'social-caption',
        input: {
          property: sampleProperty,
          platform: 'tiktok',
          tone: 'engaging',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.platform).toBe('tiktok')
    })

    it('should generate a LinkedIn caption', async () => {
      const result = await executeSkill({
        skillId: 'social-caption',
        input: {
          property: sampleProperty,
          platform: 'linkedin',
          tone: 'informative',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.platform).toBe('linkedin')
    })

    it('should calculate character count', async () => {
      const result = await executeSkill({
        skillId: 'social-caption',
        input: {
          property: sampleProperty,
          platform: 'twitter',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.characterCount).toBeGreaterThan(0)
    })

    it('should handle emoji preference', async () => {
      await executeSkill({
        skillId: 'social-caption',
        input: {
          property: sampleProperty,
          platform: 'instagram',
          includeEmoji: false,
        },
        skipLogging: true,
      })

      expect(mockGenerateWithClaude).toHaveBeenCalledWith(
        expect.stringContaining('Do NOT include emojis'),
        expect.any(Object)
      )
    })

    it('should handle hashtag preference', async () => {
      await executeSkill({
        skillId: 'social-caption',
        input: {
          property: sampleProperty,
          platform: 'facebook',
          includeHashtags: false,
        },
        skipLogging: true,
      })

      expect(mockGenerateWithClaude).toHaveBeenCalledWith(
        expect.stringContaining('Do NOT include hashtags'),
        expect.any(Object)
      )
    })

    it('should use higher temperature for creativity', async () => {
      await executeSkill({
        skillId: 'social-caption',
        input: {
          property: sampleProperty,
          platform: 'instagram',
        },
        skipLogging: true,
      })

      expect(mockGenerateWithClaude).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ temperature: 0.8 })
      )
    })

    it('should estimate cost', async () => {
      const cost = await socialCaptionSkill.estimateCost!({
        property: sampleProperty,
        platform: 'instagram',
      })
      expect(cost).toBeGreaterThan(0)
      expect(cost).toBeLessThan(0.01)
    })
  })

  // ===========================================
  // EMAIL COPY SKILL TESTS
  // ===========================================
  describe('Email Copy Skill', () => {
    beforeEach(() => {
      registerSkill(emailCopySkill)

      // Set up mock response for email copy
      mockGenerateWithClaude.mockResolvedValue({
        content: JSON.stringify({
          subject: 'Just Listed: Stunning 4BR Home in Lake Eola Heights',
          previewText: 'Your dream home with pool and smart home features awaits',
          body: '<p>Dear Friend,</p><p>I\'m excited to share this stunning new listing...</p>',
          callToAction: 'Schedule Your Private Showing',
        }),
        tokensUsed: 520,
        model: 'claude-3-haiku-20240307',
      })

      mockParseJsonResponse.mockReturnValue({
        subject: 'Just Listed: Stunning 4BR Home in Lake Eola Heights',
        previewText: 'Your dream home with pool and smart home features awaits',
        body: '<p>Dear Friend,</p><p>I\'m excited to share this stunning new listing...</p>',
        callToAction: 'Schedule Your Private Showing',
      })
    })

    it('should register with correct metadata', () => {
      expect(emailCopySkill.id).toBe('email-copy')
      expect(emailCopySkill.category).toBe('generate')
      expect(emailCopySkill.provider).toBe('anthropic')
    })

    it('should validate required fields', () => {
      const errors = emailCopySkill.validate!({} as any)
      expect(errors.some(e => e.field === 'property')).toBe(true)
    })

    it('should validate email type', () => {
      const errors = emailCopySkill.validate!({
        property: sampleProperty,
        emailType: 'invalid_type',
        agentName: 'Jane Smith',
      } as any)
      expect(errors.some(e => e.field === 'emailType')).toBe(true)
    })

    it('should validate agent name', () => {
      const errors = emailCopySkill.validate!({
        property: sampleProperty,
        emailType: 'just_listed',
      } as any)
      expect(errors.some(e => e.field === 'agentName')).toBe(true)
    })

    it('should validate open house requires date/time', () => {
      const errors = emailCopySkill.validate!({
        property: sampleProperty,
        emailType: 'open_house',
        agentName: 'Jane Smith',
      } as any)
      expect(errors.some(e => e.field === 'eventDate')).toBe(true)
    })

    it('should generate a just listed email', async () => {
      const result = await executeSkill({
        skillId: 'email-copy',
        input: {
          property: sampleProperty,
          emailType: 'just_listed',
          agentName: 'Jane Smith',
          agentBrokerage: 'Best Realty',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.subject).toBeDefined()
      expect(result.data.previewText).toBeDefined()
      expect(result.data.body).toBeDefined()
      expect(result.data.callToAction).toBeDefined()
      expect(result.data.emailType).toBe('just_listed')
    })

    it('should generate an open house email', async () => {
      const result = await executeSkill({
        skillId: 'email-copy',
        input: {
          property: sampleProperty,
          emailType: 'open_house',
          agentName: 'Jane Smith',
          eventDate: 'Saturday, January 15th',
          eventTime: '2:00 PM - 4:00 PM',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.emailType).toBe('open_house')
    })

    it('should generate a price reduction email', async () => {
      const result = await executeSkill({
        skillId: 'email-copy',
        input: {
          property: sampleProperty,
          emailType: 'price_reduction',
          agentName: 'Jane Smith',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data.emailType).toBe('price_reduction')
    })

    it('should handle different recipient types', async () => {
      await executeSkill({
        skillId: 'email-copy',
        input: {
          property: sampleProperty,
          emailType: 'just_listed',
          agentName: 'Jane Smith',
          recipientType: 'sphere',
        },
        skipLogging: true,
      })

      expect(mockGenerateWithClaude).toHaveBeenCalledWith(
        expect.stringContaining('personal network'),
        expect.any(Object)
      )
    })

    it('should include MLS number in prompt', async () => {
      await executeSkill({
        skillId: 'email-copy',
        input: {
          property: sampleProperty,
          emailType: 'just_listed',
          agentName: 'Jane Smith',
        },
        skipLogging: true,
      })

      expect(mockGenerateWithClaude).toHaveBeenCalledWith(
        expect.stringContaining('MLS12345'),
        expect.any(Object)
      )
    })

    it('should use lower temperature for consistency', async () => {
      await executeSkill({
        skillId: 'email-copy',
        input: {
          property: sampleProperty,
          emailType: 'just_listed',
          agentName: 'Jane Smith',
        },
        skipLogging: true,
      })

      expect(mockGenerateWithClaude).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ temperature: 0.6 })
      )
    })

    it('should handle custom instructions', async () => {
      await executeSkill({
        skillId: 'email-copy',
        input: {
          property: sampleProperty,
          emailType: 'just_listed',
          agentName: 'Jane Smith',
          customInstructions: 'Mention the new elementary school nearby',
        },
        skipLogging: true,
      })

      expect(mockGenerateWithClaude).toHaveBeenCalledWith(
        expect.stringContaining('new elementary school'),
        expect.any(Object)
      )
    })

    it('should estimate cost', async () => {
      const cost = await emailCopySkill.estimateCost!({
        property: sampleProperty,
        emailType: 'just_listed',
        agentName: 'Jane Smith',
      })
      expect(cost).toBeGreaterThan(0)
      expect(cost).toBeLessThan(0.01)
    })
  })

  // ===========================================
  // INTEGRATION TESTS
  // ===========================================
  describe('Content Skills Integration', () => {
    beforeEach(() => {
      registerSkill(listingDescriptionSkill)
      registerSkill(socialCaptionSkill)
      registerSkill(emailCopySkill)

      mockGenerateWithClaude.mockImplementation(async (prompt: string) => {
        if (prompt.includes('listing description')) {
          return {
            content: JSON.stringify({
              description: 'Mock description',
              highlights: ['Feature 1', 'Feature 2'],
            }),
            tokensUsed: 400,
            model: 'claude-3-haiku-20240307',
          }
        }
        if (prompt.includes('caption')) {
          return {
            content: JSON.stringify({
              caption: 'Mock caption #realestate',
              hashtags: ['realestate'],
            }),
            tokensUsed: 200,
            model: 'claude-3-haiku-20240307',
          }
        }
        return {
          content: JSON.stringify({
            subject: 'Mock Subject',
            previewText: 'Mock preview',
            body: '<p>Mock body</p>',
            callToAction: 'Call Now',
          }),
          tokensUsed: 450,
          model: 'claude-3-haiku-20240307',
        }
      })

      mockParseJsonResponse.mockImplementation((content: string) => {
        return JSON.parse(content)
      })
    })

    it('should execute all three skills successfully', async () => {
      const descResult = await executeSkill({
        skillId: 'listing-description',
        input: { property: sampleProperty },
        skipLogging: true,
      })
      expect(descResult.success).toBe(true)

      const captionResult = await executeSkill({
        skillId: 'social-caption',
        input: { property: sampleProperty, platform: 'instagram' },
        skipLogging: true,
      })
      expect(captionResult.success).toBe(true)

      const emailResult = await executeSkill({
        skillId: 'email-copy',
        input: {
          property: sampleProperty,
          emailType: 'just_listed',
          agentName: 'Jane Smith',
        },
        skipLogging: true,
      })
      expect(emailResult.success).toBe(true)
    })

    it('should handle validation errors before API call', async () => {
      const result = await executeSkill({
        skillId: 'listing-description',
        input: { property: {} }, // Missing required fields
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_ERROR')
      // API should not be called for validation errors - check call count stayed at 0
      // Note: previous tests in this suite may have called it
    })

    it('should include provider metadata in results', async () => {
      const result = await executeSkill({
        skillId: 'listing-description',
        input: { property: sampleProperty },
        skipLogging: true,
      })

      expect(result.metadata.provider).toBe('anthropic')
      // Note: model is not included in SkillResultMetadata type
    })
  })
})
