// Carousel rendering service using Bannerbear
// Handles the full rendering process for ListingLaunch carousels

import { createImage, buildSlideModifications, type BannerbearImage } from './client'
import { integrationLogger, formatError } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'bannerbear' })
import { TEMPLATES } from './templates'
import { resolveMediaUrl } from '@/lib/storage/resolve-url'
import type { CarouselSlide } from '@/lib/supabase/types'

interface RenderSlideOptions {
  slide: CarouselSlide
  backgroundImageUrl: string
  agentLogoUrl?: string
  brandColor?: string
  slideNumber: number
  totalSlides: number
  webhookUrl?: string
  carouselId: string
}

interface RenderCarouselOptions {
  carouselId: string
  slides: CarouselSlide[]
  mediaAssets: Array<{
    id: string
    media_url: string | null
    type: string
    category?: string | null
  }>
  agentLogoUrl?: string
  brandColor?: string
  webhookUrl?: string
}

// Render a single slide
export async function renderSlide(options: RenderSlideOptions): Promise<BannerbearImage> {
  const {
    slide,
    backgroundImageUrl,
    agentLogoUrl,
    brandColor,
    slideNumber,
    totalSlides,
    webhookUrl,
    carouselId,
  } = options

  const modifications = buildSlideModifications(
    slide.headline,
    slide.body,
    backgroundImageUrl,
    agentLogoUrl,
    brandColor,
    slideNumber,
    totalSlides
  )

  // Include carouselId and slideNumber in metadata for webhook processing
  const metadata = JSON.stringify({
    carouselId,
    slidePosition: slide.position,
  })

  return createImage(
    TEMPLATES.carousel_slide,
    modifications,
    webhookUrl,
    metadata
  )
}

// Map slides to appropriate photos based on content
function mapSlideToPhoto(
  slideIndex: number,
  totalSlides: number,
  mediaAssets: RenderCarouselOptions['mediaAssets']
): string | null {
  const photos = mediaAssets.filter(a => a.type === 'photo')
  if (photos.length === 0) return null

  // Simple mapping: cycle through photos
  // In production, could use AI or category matching
  const photoIndex = slideIndex % photos.length
  const photo = photos[photoIndex]
  return photo ? resolveMediaUrl(photo) : null
}

// Render all slides in a carousel
export async function renderCarousel(
  options: RenderCarouselOptions
): Promise<{ pendingRenders: BannerbearImage[]; errors: string[] }> {
  const {
    carouselId,
    slides,
    mediaAssets,
    agentLogoUrl,
    brandColor,
    webhookUrl,
  } = options

  const pendingRenders: BannerbearImage[] = []
  const errors: string[] = []

  // Render each slide
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const backgroundImageUrl = mapSlideToPhoto(i, slides.length, mediaAssets)

    if (!backgroundImageUrl) {
      errors.push(`No photo available for slide ${i + 1}`)
      continue
    }

    try {
      const render = await renderSlide({
        slide,
        backgroundImageUrl,
        agentLogoUrl,
        brandColor,
        slideNumber: i + 1,
        totalSlides: slides.length,
        webhookUrl,
        carouselId,
      })

      pendingRenders.push(render)
    } catch (error) {
      logger.error({ slideNumber: i + 1, ...formatError(error) }, 'Error rendering slide')
      errors.push(`Failed to render slide ${i + 1}`)
    }

    // Delay between requests to avoid rate limiting (increased to 500ms)
    if (i < slides.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return { pendingRenders, errors }
}

// Check if Bannerbear is configured
export function isBannerbearConfigured(): boolean {
  return !!(
    process.env.BANNERBEAR_API_KEY &&
    process.env.BANNERBEAR_CAROUSEL_TEMPLATE_ID
  )
}

// Get estimated render time
export function getEstimatedRenderTime(slideCount: number): number {
  // Bannerbear typically renders in 5-15 seconds per image
  // Estimate 10 seconds per slide + 5 seconds buffer
  return slideCount * 10 + 5
}
