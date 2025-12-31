/**
 * Render Skills - Types
 *
 * Type definitions for rendering skills.
 */

import type { BrandKit, TemplateDefinition, LifeHereData } from '@/lib/render/types'

// =====================
// RENDER TEMPLATE SKILL
// =====================

/**
 * Input for render-template skill
 */
export interface RenderTemplateInput {
  // Template source (one required)
  templateId?: string
  templateSlug?: string
  template?: TemplateDefinition

  // Variable data
  variables?: Record<string, unknown>

  // Brand kit
  brandKit?: BrandKit

  // Life Here data for location-based content
  lifeHereData?: LifeHereData

  // Listing data
  listingData?: {
    id: string
    address: string
    city: string
    state: string
    price?: number
    beds?: number
    baths?: number
    sqft?: number
    description?: string
    features?: string[]
    photoUrls?: string[]
  }

  // Agent data
  agentData?: {
    name: string
    title?: string
    phone?: string
    email?: string
    photoUrl?: string
    brokerageName?: string
    brokerageLogo?: string
  }

  // Output options
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number
  width?: number
  height?: number
}

/**
 * Output from render-template skill
 */
export interface RenderTemplateOutput {
  // Result
  imageUrl: string
  imageBuffer?: Buffer

  // Dimensions
  width: number
  height: number

  // Metadata
  format: string
  renderEngine: 'satori' | 'puppeteer'
  renderTimeMs: number
  templateId?: string
  templateSlug?: string
}

// =====================
// RENDER CAROUSEL SKILL
// =====================

/**
 * Input for render-carousel skill
 */
export interface RenderCarouselInput {
  // Slides configuration
  slides: CarouselSlideInput[]

  // Shared template set (optional)
  templateSetId?: string
  templateSetSlug?: string

  // Shared brand kit for all slides
  brandKit?: BrandKit

  // Shared Life Here data
  lifeHereData?: LifeHereData

  // Shared listing data
  listingData?: RenderTemplateInput['listingData']

  // Shared agent data
  agentData?: RenderTemplateInput['agentData']

  // Output options
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number

  // Processing options
  parallel?: boolean
  maxConcurrent?: number
}

/**
 * Single slide input for carousel
 */
export interface CarouselSlideInput {
  // Slide position
  position: number

  // Template (one required)
  templateId?: string
  templateSlug?: string
  template?: TemplateDefinition

  // Slide-specific variables (merged with shared)
  variables?: Record<string, unknown>

  // Size override
  width?: number
  height?: number
}

/**
 * Output from render-carousel skill
 */
export interface RenderCarouselOutput {
  // Results
  slides: CarouselSlideOutput[]

  // Aggregated metadata
  totalRenderTimeMs: number
  slidesRendered: number
  slidesFailed: number
  format: string
}

/**
 * Single slide output
 */
export interface CarouselSlideOutput {
  position: number
  success: boolean
  imageUrl?: string
  imageBuffer?: Buffer
  width?: number
  height?: number
  renderTimeMs: number
  error?: string
}

// =====================
// COMPOSE TEXT OVERLAY
// =====================

/**
 * Input for compose-text-overlay skill
 */
export interface ComposeTextOverlayInput {
  // Text content
  headline?: string
  body?: string
  subtext?: string

  // Content source (for auto-generation)
  contentType?: 'listing' | 'neighborhood' | 'lifestyle' | 'testimonial' | 'stats'
  storyArchetype?: string

  // Source data
  listingData?: RenderTemplateInput['listingData']
  lifeHereData?: LifeHereData

  // Constraints
  maxHeadlineLength?: number
  maxBodyLength?: number
  maxLines?: number

  // Style hints
  tone?: 'professional' | 'casual' | 'luxury' | 'friendly' | 'urgent'
  includeEmoji?: boolean
}

/**
 * Output from compose-text-overlay skill
 */
export interface ComposeTextOverlayOutput {
  headline: string
  body?: string
  subtext?: string

  // Recommended sizing
  headlineFontSize?: number
  bodyFontSize?: number

  // Metadata
  wasOptimized: boolean
  originalLength?: number
  truncatedLength?: number
}

// =====================
// APPLY BRAND KIT
// =====================

/**
 * Input for apply-brand-kit skill
 */
export interface ApplyBrandKitInput {
  // Source
  agentId?: string
  brandKitId?: string

  // Template to apply to
  template?: TemplateDefinition

  // Override values
  overrides?: Partial<BrandKit>
}

/**
 * Output from apply-brand-kit skill
 */
export interface ApplyBrandKitOutput {
  brandKit: BrandKit
  appliedTo?: TemplateDefinition
  overridesApplied: string[]
}

// =====================
// OPTIMIZE IMAGE
// =====================

/**
 * Input for optimize-image skill
 */
export interface OptimizeImageInput {
  // Source
  imageUrl?: string
  imageBuffer?: Buffer

  // Target format
  format?: 'png' | 'jpeg' | 'webp'

  // Quality (1-100)
  quality?: number

  // Resize
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'

  // Platform optimization presets
  platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'web'
}

/**
 * Output from optimize-image skill
 */
export interface OptimizeImageOutput {
  imageUrl: string
  imageBuffer?: Buffer
  width: number
  height: number
  format: string
  originalSize: number
  optimizedSize: number
  compressionRatio: number
}
