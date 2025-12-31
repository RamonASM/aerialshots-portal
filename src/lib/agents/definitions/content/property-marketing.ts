/**
 * Property Marketing Expert Agent
 *
 * Orchestrates skills to create a complete marketing asset suite for properties:
 * - Listing descriptions (multiple styles)
 * - Social media content (carousels, captions, hashtags)
 * - Email copy (listing announcement, open house, etc.)
 * - Integrates Life Here data for neighborhood context
 */

import { registerAgent } from '../../registry'
import { executeSkill } from '@/lib/skills/executor'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import type { IntegrateLifeHereInput, IntegrateLifeHereOutput } from '@/lib/skills/data/types'
import type {
  ListingDescriptionInput,
  ListingDescriptionOutput,
  SocialCaptionInput,
  SocialCaptionOutput,
  EmailCopyInput,
  EmailCopyOutput,
  CarouselContentOutput,
  HashtagsOutput,
  SocialPlatform,
} from '@/lib/skills/content/types'
import type { RenderCarouselInput, CarouselSlideOutput } from '@/lib/skills/render/types'
import type { BrandKit } from '@/lib/render/types'

// =====================
// TYPES
// =====================

export type MarketingPackage = 'basic' | 'standard' | 'premium' | 'luxury'

export type AssetType =
  | 'listing_description'
  | 'social_carousel'
  | 'social_caption'
  | 'email_announcement'
  | 'email_open_house'
  | 'hashtags'

interface PropertyData {
  address: string
  city: string
  state: string
  zip?: string
  beds: number
  baths: number
  sqft: number
  price: number
  propertyType?: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'land'
  yearBuilt?: number
  lotSize?: number
  photos?: string[]
  description?: string
  features?: string[]
  lat?: number
  lng?: number
}

interface PropertyMarketingInput {
  // Property data
  property: PropertyData
  listingId?: string

  // Package selection
  package?: MarketingPackage
  assets?: AssetType[] // Override package with specific assets

  // Agent data
  agentName?: string
  agentBrokerage?: string
  agentPhone?: string
  agentEmail?: string

  // Brand customization
  brandKit?: BrandKit

  // Content preferences
  tone?: 'professional' | 'friendly' | 'luxury' | 'casual'
  targetAudience?: string
  uniqueSellingPoints?: string[]

  // Social media options
  platforms?: SocialPlatform[]

  // Options
  includeLifeHere?: boolean
  slideCount?: number
}

interface GeneratedAsset {
  type: AssetType
  success: boolean
  data?: unknown
  error?: string
}

interface PropertyMarketingOutput {
  property: PropertyData
  package: MarketingPackage
  assets: GeneratedAsset[]
  lifeHereData?: IntegrateLifeHereOutput
  totalGenerationTimeMs: number
  assetsGenerated: number
  assetsFailed: number
}

// =====================
// AGENT PROMPT
// =====================

const PROPERTY_MARKETING_PROMPT = `You are a real estate marketing expert who creates comprehensive marketing asset suites.

You orchestrate multiple content generation skills to produce:
- **Listing Descriptions**: Multiple styles (MLS, website, social)
- **Social Carousels**: Engaging Instagram-style content
- **Social Captions**: Platform-optimized post copy
- **Email Copy**: Announcement, open house, price reduction emails
- **Hashtags**: Platform-optimized hashtag sets

Best practices:
- Start with Life Here data for authentic neighborhood context
- Maintain consistent tone across all assets
- Highlight unique selling points in every piece
- Adapt content for each platform's requirements
- Include clear calls-to-action`

// =====================
// PACKAGE DEFINITIONS
// =====================

const PACKAGE_ASSETS: Record<MarketingPackage, AssetType[]> = {
  basic: ['listing_description', 'hashtags'],
  standard: ['listing_description', 'social_caption', 'hashtags'],
  premium: [
    'listing_description',
    'social_carousel',
    'social_caption',
    'hashtags',
    'email_announcement',
  ],
  luxury: [
    'listing_description',
    'social_carousel',
    'social_caption',
    'hashtags',
    'email_announcement',
    'email_open_house',
  ],
}

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Fetch Life Here data for property location
 */
async function fetchLifeHereData(
  property: PropertyData
): Promise<IntegrateLifeHereOutput | null> {
  const hasCoords = property.lat !== undefined && property.lng !== undefined
  const hasAddress = property.address && property.city

  if (!hasCoords && !hasAddress) {
    return null
  }

  const result = await executeSkill<IntegrateLifeHereInput>({
    skillId: 'integrate-life-here',
    input: {
      lat: property.lat,
      lng: property.lng,
      address: property.address,
      city: property.city,
      state: property.state,
      dataTypes: ['scores', 'dining', 'commute', 'essentials', 'lifestyle'],
      profile: 'balanced',
      limit: 5,
    },
    skipLogging: true,
  })

  if (!result.success || !result.data) {
    console.warn('[PropertyMarketing] Failed to fetch Life Here data:', result.error)
    return null
  }

  return result.data as IntegrateLifeHereOutput
}

/**
 * Generate listing description
 */
async function generateListingDescription(
  input: PropertyMarketingInput,
  lifeHereData: IntegrateLifeHereOutput | null
): Promise<GeneratedAsset> {
  const { property, tone, targetAudience, uniqueSellingPoints } = input

  const result = await executeSkill<ListingDescriptionInput>({
    skillId: 'generate-listing-description',
    input: {
      address: property.address,
      city: property.city,
      state: property.state,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      price: property.price,
      propertyType: property.propertyType || 'single_family',
      yearBuilt: property.yearBuilt,
      features: property.features || [],
      photos: property.photos || [],
      existingDescription: property.description,
      style: tone === 'luxury' ? 'luxury' : 'engaging',
      targetLength: 'medium',
      targetAudience,
      uniqueSellingPoints,
      neighborhoodHighlights: lifeHereData?.highlights,
    },
    skipLogging: true,
  })

  if (result.success && result.data) {
    return {
      type: 'listing_description',
      success: true,
      data: result.data as ListingDescriptionOutput,
    }
  }

  return {
    type: 'listing_description',
    success: false,
    error: result.error || 'Failed to generate listing description',
  }
}

/**
 * Generate social carousel
 */
async function generateSocialCarousel(
  input: PropertyMarketingInput,
  lifeHereData: IntegrateLifeHereOutput | null
): Promise<GeneratedAsset> {
  const { property, brandKit, slideCount = 7 } = input

  // First generate carousel content
  const contentResult = await executeSkill({
    skillId: 'generate-carousel-content',
    input: {
      storyType: 'just_listed',
      slideCount,
      tone: input.tone || 'professional',
      property: {
        address: property.address,
        city: property.city,
        state: property.state,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        price: property.price,
        features: property.features,
      },
      lifeHereData: lifeHereData ? {
        score: lifeHereData.lifeHereScore?.score,
        label: lifeHereData.lifeHereScore?.label,
        dining: lifeHereData.dining?.topPicks?.slice(0, 3).map(d => ({
          name: d.name,
          cuisine: d.cuisine,
          rating: d.rating,
        })),
        commute: lifeHereData.commute ? {
          beach: lifeHereData.commute.beachMinutes,
          airport: lifeHereData.commute.airportMinutes,
        } : undefined,
        highlights: lifeHereData.highlights,
      } : undefined,
    },
    skipLogging: true,
  })

  if (!contentResult.success) {
    return {
      type: 'social_carousel',
      success: false,
      error: contentResult.error || 'Failed to generate carousel content',
    }
  }

  const content = contentResult.data as CarouselContentOutput

  // Build slides for rendering
  const slides = content.slides.map((slide, i) => ({
    position: i,
    templateSlug: `just_listed-slide-${i + 1}`,
    variables: {
      slideNumber: i + 1,
      totalSlides: slideCount,
      headline: slide.headline,
      body: slide.body || '',
      slideType: slide.slideType,
      price: property.price,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      address: property.address,
      city: property.city,
      state: property.state,
    },
  }))

  // Render the carousel
  const renderResult = await executeSkill<RenderCarouselInput>({
    skillId: 'render-carousel',
    input: {
      slides,
      brandKit,
      listingData: {
        address: property.address,
        city: property.city,
        price: property.price,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
      },
      format: 'png',
      quality: 90,
      parallel: true,
      maxConcurrent: 4,
    },
    skipLogging: true,
  })

  if (renderResult.success && renderResult.data) {
    return {
      type: 'social_carousel',
      success: true,
      data: {
        content,
        slides: (renderResult.data as { slides: CarouselSlideOutput[] }).slides,
      },
    }
  }

  return {
    type: 'social_carousel',
    success: false,
    error: renderResult.error || 'Failed to render carousel',
  }
}

/**
 * Generate social caption
 */
async function generateSocialCaption(
  input: PropertyMarketingInput,
  platform: SocialPlatform = 'instagram'
): Promise<GeneratedAsset> {
  const { property, agentName, tone } = input

  const result = await executeSkill<SocialCaptionInput>({
    skillId: 'generate-social-caption',
    input: {
      platform,
      contentType: 'listing_post',
      tone: tone || 'engaging',
      property: {
        address: property.address,
        city: property.city,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        price: property.price,
      },
      agentName,
      callToAction: 'DM for details',
      includeEmoji: true,
    },
    skipLogging: true,
  })

  if (result.success && result.data) {
    return {
      type: 'social_caption',
      success: true,
      data: result.data as SocialCaptionOutput,
    }
  }

  return {
    type: 'social_caption',
    success: false,
    error: result.error || 'Failed to generate social caption',
  }
}

/**
 * Generate hashtags
 */
async function generateHashtags(
  input: PropertyMarketingInput,
  platform: SocialPlatform = 'instagram'
): Promise<GeneratedAsset> {
  const { property } = input

  const result = await executeSkill({
    skillId: 'generate-hashtags',
    input: {
      platform,
      storyType: 'just_listed',
      city: property.city,
      state: property.state,
      property: {
        city: property.city,
        state: property.state,
      },
      maxCount: 15,
    },
    skipLogging: true,
  })

  if (result.success && result.data) {
    return {
      type: 'hashtags',
      success: true,
      data: result.data as HashtagsOutput,
    }
  }

  return {
    type: 'hashtags',
    success: false,
    error: result.error || 'Failed to generate hashtags',
  }
}

/**
 * Generate email copy
 */
async function generateEmailCopy(
  input: PropertyMarketingInput,
  emailType: 'announcement' | 'open_house'
): Promise<GeneratedAsset> {
  const { property, agentName, agentBrokerage, tone } = input

  const result = await executeSkill<EmailCopyInput>({
    skillId: 'generate-email-copy',
    input: {
      emailType: emailType === 'announcement' ? 'listing_announcement' : 'open_house',
      recipientType: 'buyer',
      tone: tone || 'professional',
      property: {
        address: property.address,
        city: property.city,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        price: property.price,
      },
      senderName: agentName,
      senderBrokerage: agentBrokerage,
    },
    skipLogging: true,
  })

  if (result.success && result.data) {
    return {
      type: emailType === 'announcement' ? 'email_announcement' : 'email_open_house',
      success: true,
      data: result.data as EmailCopyOutput,
    }
  }

  return {
    type: emailType === 'announcement' ? 'email_announcement' : 'email_open_house',
    success: false,
    error: result.error || `Failed to generate ${emailType} email`,
  }
}

// =====================
// MAIN EXECUTE FUNCTION
// =====================

async function execute(
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const { input: rawInput } = context
  const input = rawInput as unknown as PropertyMarketingInput

  // Validate input
  if (!input.property) {
    return {
      success: false,
      error: 'property is required',
      errorCode: 'MISSING_PROPERTY',
    }
  }

  const { property } = input
  if (!property.address || !property.city || !property.beds || !property.baths) {
    return {
      success: false,
      error: 'Property must include address, city, beds, and baths',
      errorCode: 'INCOMPLETE_PROPERTY',
    }
  }

  const startTime = Date.now()
  const pkg = input.package || 'standard'
  const assetsToGenerate = input.assets || PACKAGE_ASSETS[pkg]

  try {
    // Step 1: Fetch Life Here data if requested
    let lifeHereData: IntegrateLifeHereOutput | null = null
    if (input.includeLifeHere !== false) {
      lifeHereData = await fetchLifeHereData(property)
    }

    // Step 2: Generate assets in parallel where possible
    const generatedAssets: GeneratedAsset[] = []

    // Group 1: Independent assets (can run in parallel)
    const independentTasks: Promise<GeneratedAsset>[] = []

    if (assetsToGenerate.includes('listing_description')) {
      independentTasks.push(generateListingDescription(input, lifeHereData))
    }

    if (assetsToGenerate.includes('hashtags')) {
      const platform = input.platforms?.[0] || 'instagram'
      independentTasks.push(generateHashtags(input, platform))
    }

    if (assetsToGenerate.includes('email_announcement')) {
      independentTasks.push(generateEmailCopy(input, 'announcement'))
    }

    if (assetsToGenerate.includes('email_open_house')) {
      independentTasks.push(generateEmailCopy(input, 'open_house'))
    }

    // Run independent tasks in parallel
    if (independentTasks.length > 0) {
      const results = await Promise.all(independentTasks)
      generatedAssets.push(...results)
    }

    // Group 2: Sequential/dependent assets
    if (assetsToGenerate.includes('social_carousel')) {
      const carouselResult = await generateSocialCarousel(input, lifeHereData)
      generatedAssets.push(carouselResult)
    }

    if (assetsToGenerate.includes('social_caption')) {
      const platform = input.platforms?.[0] || 'instagram'
      const captionResult = await generateSocialCaption(input, platform)
      generatedAssets.push(captionResult)
    }

    const assetsGenerated = generatedAssets.filter(a => a.success).length
    const assetsFailed = generatedAssets.filter(a => !a.success).length

    const output: PropertyMarketingOutput = {
      property,
      package: pkg,
      assets: generatedAssets,
      lifeHereData: lifeHereData || undefined,
      totalGenerationTimeMs: Date.now() - startTime,
      assetsGenerated,
      assetsFailed,
    }

    return {
      success: assetsFailed === 0,
      output: output as unknown as Record<string, unknown>,
      warnings: assetsFailed > 0
        ? [`${assetsFailed} asset(s) failed to generate`]
        : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Property marketing failed',
      errorCode: 'PROPERTY_MARKETING_FAILED',
    }
  }
}

// =====================
// REGISTER AGENT
// =====================

registerAgent({
  slug: 'property-marketing',
  name: 'Property Marketing',
  description: 'Creates complete marketing asset suites for property listings with descriptions, social content, and email copy',
  category: 'content',
  executionMode: 'async',
  systemPrompt: PROPERTY_MARKETING_PROMPT,
  config: {
    timeout: 300000, // 5 minutes for full suite
  },
  execute,
})

export type { PropertyMarketingInput, PropertyMarketingOutput }
