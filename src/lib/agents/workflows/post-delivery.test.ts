/**
 * Post-Delivery Workflow Tests
 *
 * Tests for the post-delivery workflow with skill integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import postDeliveryWorkflow from './post-delivery'
import type { WorkflowContext, WorkflowStep } from '../types'

// Helper to create valid WorkflowContext
function createContext(overrides: Partial<WorkflowContext> = {}): WorkflowContext {
  return {
    workflowId: 'wf-1',
    triggerEvent: 'qc.approved',
    currentStep: 0,
    stepResults: {},
    sharedContext: {},
    listingId: 'listing-123',
    triggerData: {},
    ...overrides,
  }
}

// Mock the orchestrator registration
vi.mock('../orchestrator', () => ({
  registerWorkflow: vi.fn(),
}))

describe('Post-Delivery Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have correct workflow metadata', () => {
    expect(postDeliveryWorkflow.id).toBe('post-delivery')
    expect(postDeliveryWorkflow.triggerEvent).toBe('qc.approved')
    expect(postDeliveryWorkflow.onError).toBe('continue')
  })

  it('should have all required steps', () => {
    const stepSlugs = postDeliveryWorkflow.steps.map((s) => s.agentSlug)

    expect(stepSlugs).toContain('qc-assistant')
    expect(stepSlugs).toContain('media-tips')
    expect(stepSlugs).toContain('delivery-notifier')
    expect(stepSlugs).toContain('care-task-generator')
    expect(stepSlugs).toContain('video-creator')
    expect(stepSlugs).toContain('content-writer')
    expect(stepSlugs).toContain('campaign-launcher')
  })

  it('should have delivery-notifier as required step', () => {
    const deliveryNotifier = postDeliveryWorkflow.steps.find(
      (s) => s.agentSlug === 'delivery-notifier'
    )
    expect(deliveryNotifier?.required).toBe(true)
  })

  it('should have video-creator and content-writer in parallel', () => {
    const videoCreator = postDeliveryWorkflow.steps.find(
      (s) => s.agentSlug === 'video-creator'
    )
    const contentWriter = postDeliveryWorkflow.steps.find(
      (s) => s.agentSlug === 'content-writer'
    )

    expect(videoCreator?.parallel).toBe('content-gen')
    expect(contentWriter?.parallel).toBe('content-gen')
  })

  describe('video-creator step', () => {
    const getVideoCreatorStep = (): WorkflowStep => {
      return postDeliveryWorkflow.steps.find(
        (s) => s.agentSlug === 'video-creator'
      ) as WorkflowStep
    }

    it('should have condition that requires at least 3 photos', async () => {
      const step = getVideoCreatorStep()
      expect(step.condition).toBeDefined()

      // Should return false with no photos
      const contextNoPhotos = createContext({ triggerData: {} })
      expect(await step.condition!(contextNoPhotos)).toBe(false)

      // Should return false with 2 photos
      const contextTwoPhotos = createContext({
        triggerData: { photos: ['photo1.jpg', 'photo2.jpg'] },
      })
      expect(await step.condition!(contextTwoPhotos)).toBe(false)

      // Should return true with 3+ photos
      const contextThreePhotos = createContext({
        triggerData: { photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'] },
      })
      expect(await step.condition!(contextThreePhotos)).toBe(true)
    })

    it('should map inputs correctly', async () => {
      const step = getVideoCreatorStep()

      const context = createContext({
        triggerData: {
          photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
        },
      })

      if (!step.inputMapper) {
        throw new Error('inputMapper is undefined')
      }

      const input = await step.inputMapper(context) as {
        listingId: string
        photos: string[]
        videoType: string
        aspectRatio: string
        transition: string
      }

      expect(input.listingId).toBe('listing-123')
      expect(input.photos).toHaveLength(4)
      expect(input.videoType).toBe('slideshow')
      expect(input.aspectRatio).toBe('16:9')
      expect(input.transition).toBe('kenburns')
    })

    it('should store slideshow video in shared context on complete', async () => {
      const step = getVideoCreatorStep()

      const context = createContext()

      const result = {
        success: true,
        output: {
          videoPath: '/videos/listing-123-slideshow.mp4',
          videoUrl: 'https://cdn.example.com/videos/listing-123.mp4',
          thumbnailPath: '/thumbs/listing-123.jpg',
          durationSeconds: 45,
        },
      }

      await step.onComplete!(result, context)

      const slideshowVideo = context.sharedContext.slideshowVideo as { videoUrl: string; durationSeconds: number }
      expect(slideshowVideo).toBeDefined()
      expect(slideshowVideo.videoUrl).toBe(
        'https://cdn.example.com/videos/listing-123.mp4'
      )
      expect(slideshowVideo.durationSeconds).toBe(45)
    })
  })

  describe('content-writer step', () => {
    const getContentWriterStep = (): WorkflowStep => {
      return postDeliveryWorkflow.steps.find(
        (s) => s.agentSlug === 'content-writer'
      ) as WorkflowStep
    }

    it('should map property data from triggerData', async () => {
      const step = getContentWriterStep()

      const context = createContext({
        listingId: 'listing-456',
        triggerData: {
          address: '123 Main St',
          city: 'Orlando',
          beds: 4,
          baths: 3,
          sqft: 2500,
          price: 450000,
          agentName: 'John Agent',
        },
      })

      if (!step.inputMapper) {
        throw new Error('inputMapper is undefined')
      }

      const input = await step.inputMapper(context) as {
        listingId: string
        property: {
          address: string
          city: string
          beds: number
          baths: number
          sqft: number
          price: number
        }
        contentTypes: string[]
        descriptionStyles: string[]
      }

      expect(input.listingId).toBe('listing-456')
      expect(input.property.address).toBe('123 Main St')
      expect(input.property.city).toBe('Orlando')
      expect(input.property.beds).toBe(4)
      expect(input.property.sqft).toBe(2500)
      expect(input.contentTypes).toContain('description')
      expect(input.contentTypes).toContain('social')
      expect(input.descriptionStyles).toContain('professional')
      expect(input.descriptionStyles).toContain('warm')
      expect(input.descriptionStyles).toContain('luxury')
    })

    it('should store generated content in shared context on complete', async () => {
      const step = getContentWriterStep()

      const context = createContext({ listingId: 'listing-456' })

      const result = {
        success: true,
        output: {
          descriptions: {
            professional: 'Beautiful home...',
            warm: 'Welcome to your dream home...',
            luxury: 'Exceptional property...',
          },
          socialCaptions: {
            instagram: '🏠 Just listed!',
            facebook: 'New on the market!',
          },
          generatedAt: new Date().toISOString(),
          totalItemsGenerated: 5,
        },
      }

      await step.onComplete!(result, context)

      const generatedContent = context.sharedContext.generatedContent as {
        descriptions: Record<string, string>
        socialCaptions: Record<string, string>
      }
      expect(generatedContent).toBeDefined()
      expect(generatedContent.descriptions).toBeDefined()
      expect(generatedContent.socialCaptions).toBeDefined()
    })
  })

  describe('campaign-launcher step', () => {
    const getCampaignLauncherStep = (): WorkflowStep => {
      return postDeliveryWorkflow.steps.find(
        (s) => s.agentSlug === 'campaign-launcher'
      ) as WorkflowStep
    }

    it('should only launch when autoLaunch is true and preferences exist', async () => {
      const step = getCampaignLauncherStep()

      // Should not launch without autoLaunch
      const contextNoAuto = createContext({
        triggerData: { campaignPreferences: { channels: ['email'] } },
      })
      expect(await step.condition!(contextNoAuto)).toBe(false)

      // Should not launch without preferences
      const contextNoPrefs = createContext({
        triggerData: { autoLaunch: true },
      })
      expect(await step.condition!(contextNoPrefs)).toBe(false)

      // Should launch with both
      const contextBoth = createContext({
        triggerData: {
          autoLaunch: true,
          campaignPreferences: { channels: ['email', 'social'] },
        },
      })
      expect(await step.condition!(contextBoth)).toBe(true)
    })

    it('should include video URLs and generated content in input', async () => {
      const step = getCampaignLauncherStep()

      const context = createContext({
        listingId: 'listing-789',
        triggerData: {
          carouselUrls: ['https://cdn.example.com/carousel1.jpg'],
          campaignPreferences: { channels: ['email'] },
        },
        sharedContext: {
          slideshowVideo: {
            videoUrl: 'https://cdn.example.com/video.mp4',
            thumbnailPath: '/thumbs/video.jpg',
          },
          generatedContent: {
            descriptions: { professional: 'Great home...' },
            socialCaptions: { instagram: '🏠 New listing!' },
          },
        },
      })

      if (!step.inputMapper) {
        throw new Error('inputMapper is undefined')
      }

      const input = await step.inputMapper(context) as {
        videoUrls: { slideshow: string }
        generatedDescriptions: { professional: string }
        socialCaptions: { instagram: string }
      }

      expect(input.videoUrls).toBeDefined()
      expect(input.videoUrls.slideshow).toBe('https://cdn.example.com/video.mp4')
      expect(input.generatedDescriptions).toBeDefined()
      expect(input.generatedDescriptions.professional).toBe('Great home...')
      expect(input.socialCaptions).toBeDefined()
      expect(input.socialCaptions.instagram).toBe('🏠 New listing!')
    })
  })
})
