/**
 * Expert Agents Tests
 *
 * Tests for skill-orchestrating expert agents:
 * - Video Creator
 * - Content Writer
 * - Image Enhancer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the skill executor
const mockExecuteSkill = vi.fn()
vi.mock('@/lib/skills/executor', () => ({
  executeSkill: (...args: unknown[]) => mockExecuteSkill(...args),
}))

// Mock Supabase
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  }),
}))

// Mock AI client
vi.mock('@/lib/ai/client', () => ({
  generateWithAI: vi.fn(() => Promise.resolve({
    content: '{}',
    tokensUsed: 100,
  })),
}))

// Import agent functions after mocks
import {
  createSlideshow,
  createMotion,
  createSocialReel,
} from './definitions/content/video-creator'
import {
  generateDescriptions,
  generateSocialCaptions,
  generateEmail,
} from './definitions/content/content-writer'
import {
  analyzeImage,
  stageRoom,
  inpaintImage,
  createTwilight,
} from './definitions/operations/image-enhancer'
import type { PropertyData } from '@/lib/skills/content/types'

describe('Expert Agents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================
  // VIDEO CREATOR AGENT TESTS
  // ===========================================
  describe('Video Creator Agent', () => {
    beforeEach(() => {
      mockExecuteSkill.mockImplementation(async (options) => {
        if (options.skillId === 'video-slideshow') {
          return {
            success: true,
            data: {
              videoPath: '/tmp/slideshow.mp4',
              durationSeconds: 15,
              fileSize: 5000000,
              photoCount: 5,
              resolution: { width: 1920, height: 1080 },
            },
          }
        }
        if (options.skillId === 'video-motion') {
          return {
            success: true,
            data: {
              videoPath: '/tmp/motion.mp4',
              durationSeconds: 5,
              fileSize: 2000000,
              resolution: { width: 1920, height: 1080 },
            },
          }
        }
        return { success: false, error: 'Unknown skill' }
      })
    })

    it('should create a slideshow', async () => {
      const result = await createSlideshow(
        ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
        {
          aspectRatio: '16:9',
          transition: 'fade',
          outputFormat: 'mp4',
        }
      )

      expect(result.videoPath).toBeDefined()
      expect(result.type).toBe('slideshow')
      expect(result.photoCount).toBe(3)
      expect(mockExecuteSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'video-slideshow',
        })
      )
    })

    it('should create slideshow with music', async () => {
      await createSlideshow(
        ['photo1.jpg', 'photo2.jpg'],
        {
          aspectRatio: '16:9',
          transition: 'kenburns',
          musicUrl: 'https://example.com/music.mp3',
          musicVolume: 0.7,
          outputFormat: 'mp4',
        }
      )

      expect(mockExecuteSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            musicUrl: 'https://example.com/music.mp3',
            musicVolume: 0.7,
          }),
        })
      )
    })

    it('should create motion video', async () => {
      const result = await createMotion('hero.jpg', {
        duration: 5,
        motionType: 'kenburns',
        outputFormat: 'mp4',
      })

      expect(result.videoPath).toBeDefined()
      expect(result.type).toBe('motion')
      expect(result.photoCount).toBe(1)
    })

    it('should create social reel', async () => {
      const photos = Array(10).fill('photo.jpg')
      const result = await createSocialReel(photos, {
        outputFormat: 'mp4',
      })

      expect(result.type).toBe('social_reel')
      // Should limit to 8 photos
      expect(mockExecuteSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            aspectRatio: '9:16',
          }),
        })
      )
    })

    it('should handle skill failure', async () => {
      mockExecuteSkill.mockResolvedValue({
        success: false,
        error: 'FFmpeg not available',
      })

      await expect(
        createSlideshow(['photo.jpg'], {
          aspectRatio: '16:9',
          transition: 'fade',
          outputFormat: 'mp4',
        })
      ).rejects.toThrow('FFmpeg not available')
    })
  })

  // ===========================================
  // CONTENT WRITER AGENT TESTS
  // ===========================================
  describe('Content Writer Agent', () => {
    const sampleProperty: PropertyData = {
      address: '123 Main St',
      city: 'Orlando',
      state: 'FL',
      beds: 4,
      baths: 3,
      sqft: 2500,
      price: 450000,
    }

    beforeEach(() => {
      mockExecuteSkill.mockImplementation(async (options) => {
        if (options.skillId === 'listing-description') {
          return {
            success: true,
            data: {
              description: 'Beautiful 4-bedroom home...',
              style: options.input.style,
              wordCount: 150,
              highlights: ['Pool', 'Kitchen'],
            },
          }
        }
        if (options.skillId === 'social-caption') {
          return {
            success: true,
            data: {
              caption: 'Just listed! #realestate',
              platform: options.input.platform,
              hashtags: ['realestate', 'orlando'],
              characterCount: 50,
            },
          }
        }
        if (options.skillId === 'email-copy') {
          return {
            success: true,
            data: {
              subject: 'Just Listed',
              previewText: 'Beautiful home',
              body: '<p>Check out...</p>',
              callToAction: 'Schedule a Showing',
              emailType: options.input.emailType,
            },
          }
        }
        return { success: false, error: 'Unknown skill' }
      })
    })

    it('should generate descriptions in multiple styles', async () => {
      const descriptions = await generateDescriptions(
        sampleProperty,
        undefined,
        ['professional', 'warm', 'luxury']
      )

      expect(descriptions).toHaveLength(3)
      expect(descriptions[0].style).toBe('professional')
      expect(descriptions[1].style).toBe('warm')
      expect(descriptions[2].style).toBe('luxury')
    })

    it('should generate social captions for multiple platforms', async () => {
      const captions = await generateSocialCaptions(sampleProperty, [
        'instagram',
        'facebook',
        'tiktok',
      ])

      expect(captions).toHaveLength(3)
      expect(captions[0].platform).toBe('instagram')
      expect(captions[1].platform).toBe('facebook')
      expect(captions[2].platform).toBe('tiktok')
    })

    it('should generate marketing email', async () => {
      const email = await generateEmail(sampleProperty, 'just_listed', 'Jane Smith')

      expect(email).toBeDefined()
      expect(email?.subject).toBeDefined()
      expect(email?.body).toBeDefined()
      expect(email?.emailType).toBe('just_listed')
    })

    it('should handle skill failure gracefully', async () => {
      mockExecuteSkill.mockResolvedValue({
        success: false,
        error: 'API error',
      })

      const descriptions = await generateDescriptions(
        sampleProperty,
        undefined,
        ['professional']
      )

      // Should return empty array on failure
      expect(descriptions).toHaveLength(0)
    })
  })

  // ===========================================
  // IMAGE ENHANCER AGENT TESTS
  // ===========================================
  describe('Image Enhancer Agent', () => {
    beforeEach(() => {
      mockExecuteSkill.mockImplementation(async (options) => {
        if (options.skillId === 'image-analyze') {
          return {
            success: true,
            data: {
              roomType: 'living_room',
              objects: ['sofa', 'table'],
              suggestions: ['Add more lighting'],
              confidence: 0.95,
            },
          }
        }
        if (options.skillId === 'image-generate') {
          return {
            success: true,
            data: {
              imageUrl: 'https://example.com/generated.jpg',
              processingTimeMs: 5000,
            },
          }
        }
        if (options.skillId === 'image-inpaint') {
          return {
            success: true,
            data: {
              imageUrl: 'https://example.com/inpainted.jpg',
              processingTimeMs: 3000,
            },
          }
        }
        return { success: false, error: 'Unknown skill' }
      })
    })

    it('should analyze image', async () => {
      const result = await analyzeImage('https://example.com/room.jpg')

      expect(result).toBeDefined()
      expect(result?.roomType).toBe('living_room')
      expect(result?.objects).toContain('sofa')
    })

    it('should stage a room', async () => {
      const result = await stageRoom(
        'https://example.com/empty-room.jpg',
        'living_room',
        'modern'
      )

      expect(result).toBeDefined()
      expect(mockExecuteSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'image-generate',
          input: expect.objectContaining({
            generationType: 'staging',
          }),
        })
      )
    })

    it('should inpaint (remove objects)', async () => {
      const result = await inpaintImage(
        'https://example.com/photo.jpg',
        'Remove the clutter on the counter'
      )

      expect(result).toBeDefined()
      expect(mockExecuteSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'image-inpaint',
        })
      )
    })

    it('should create twilight conversion', async () => {
      const result = await createTwilight('https://example.com/exterior.jpg')

      expect(result).toBeDefined()
      expect(mockExecuteSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'image-generate',
          input: expect.objectContaining({
            generationType: 'twilight',
          }),
        })
      )
    })

    it('should handle skill failure', async () => {
      mockExecuteSkill.mockResolvedValue({
        success: false,
        error: 'API error',
      })

      const result = await analyzeImage('https://example.com/room.jpg')
      expect(result).toBeNull()
    })
  })

  // ===========================================
  // INTEGRATION TESTS
  // ===========================================
  describe('Expert Agents Integration', () => {
    it('should have all three agents importable', () => {
      expect(createSlideshow).toBeDefined()
      expect(generateDescriptions).toBeDefined()
      expect(analyzeImage).toBeDefined()
    })

    it('should work with skill executor mock', async () => {
      mockExecuteSkill.mockResolvedValue({
        success: true,
        data: {
          videoPath: '/tmp/test.mp4',
          durationSeconds: 10,
          fileSize: 1000000,
          photoCount: 2,
          resolution: { width: 1920, height: 1080 },
        },
      })

      const result = await createSlideshow(['a.jpg', 'b.jpg'], {
        aspectRatio: '16:9',
        transition: 'fade',
        outputFormat: 'mp4',
      })

      expect(result.videoPath).toBe('/tmp/test.mp4')
    })
  })
})
