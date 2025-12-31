/**
 * Carousel Creator Expert Agent
 *
 * Orchestrates skills to create Instagram-style carousel posts:
 * - Integrates Life Here data for neighborhood stories
 * - Generates slide content with AI
 * - Renders multi-slide carousels with branding
 * - Creates captions and hashtags
 */

import { registerAgent } from '../../registry'
import { executeSkill } from '@/lib/skills/executor'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import type { RenderCarouselInput, CarouselSlideOutput } from '@/lib/skills/render/types'
import type { IntegrateLifeHereInput, IntegrateLifeHereOutput, LifeHereDataType } from '@/lib/skills/data/types'
import type {
  CarouselContentInput,
  CarouselContentOutput,
  HashtagsInput,
  HashtagsOutput,
  CarouselCaptionInput,
  CarouselCaptionOutput,
  SlideContent,
  SocialPlatform,
} from '@/lib/skills/content/types'
import type { BrandKit } from '@/lib/render/types'

// =====================
// TYPES
// =====================

/**
 * Story archetypes supported by the carousel creator
 */
export type StoryArchetype =
  | 'just_listed'
  | 'just_sold'
  | 'open_house'
  | 'price_reduction'
  | 'coming_soon'
  | 'neighborhood_guide'
  | 'local_favorites'
  | 'lifestyle'
  | 'market_update'
  | 'agent_spotlight'
  | 'testimonial'
  | 'tips_advice'

interface CarouselCreatorInput {
  // Story configuration
  storyType: StoryArchetype
  storyPrompt?: string // Optional custom prompt

  // Location data (for neighborhood stories)
  address?: string
  city?: string
  state?: string
  lat?: number
  lng?: number

  // Listing data (for property stories)
  listingId?: string
  listingData?: {
    price?: number
    beds?: number
    baths?: number
    sqft?: number
    address?: string
    city?: string
    state?: string
    photos?: string[]
    description?: string
    features?: string[]
  }

  // Agent/brand data
  agentId?: string
  brandKit?: BrandKit

  // Output options
  slideCount?: number // Default 7
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number
}

interface CarouselCreatorOutput {
  slides: CarouselSlideOutput[]
  caption?: string
  hashtags?: string[]
  totalRenderTimeMs: number
  slidesRendered: number
  slidesFailed: number
  format: string
  storyType: StoryArchetype
  lifeHereData?: IntegrateLifeHereOutput
}

// =====================
// AGENT PROMPT
// =====================

const CAROUSEL_CREATOR_PROMPT = `You are a carousel content expert for real estate marketing.
You create engaging Instagram carousel posts that tell compelling stories.

Story types you create:
- **just_listed**: Showcase new listings with key features
- **just_sold**: Celebrate successful sales
- **open_house**: Promote upcoming open houses
- **neighborhood_guide**: Highlight local dining, schools, parks
- **local_favorites**: Feature agent's favorite local spots
- **lifestyle**: Show community lifestyle and activities
- **market_update**: Share local market statistics
- **tips_advice**: Provide buyer/seller tips

Best practices:
- First slide is the hook - make it attention-grabbing
- Use data from Life Here API for authentic local content
- Limit text per slide for readability
- End with a clear call-to-action
- Match content tone to property and neighborhood style`

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Determine which Life Here data types to fetch based on story type
 */
function getLifeHereDataTypes(storyType: StoryArchetype): LifeHereDataType[] {
  switch (storyType) {
    case 'neighborhood_guide':
      return ['scores', 'dining', 'essentials', 'lifestyle', 'overview']
    case 'local_favorites':
      return ['dining', 'attractions', 'lifestyle', 'events']
    case 'lifestyle':
      return ['scores', 'commute', 'lifestyle', 'attractions']
    case 'just_listed':
    case 'just_sold':
    case 'open_house':
    case 'price_reduction':
    case 'coming_soon':
      return ['scores', 'commute', 'dining'] // Basic context for listings
    default:
      return ['scores', 'overview']
  }
}

/**
 * Fetch Life Here data for location-based stories
 */
async function fetchLifeHereData(
  input: CarouselCreatorInput
): Promise<IntegrateLifeHereOutput | null> {
  // Need location data
  const hasCoords = input.lat !== undefined && input.lng !== undefined
  const hasAddress = input.address || input.city || input.listingData?.city

  if (!hasCoords && !hasAddress) {
    return null
  }

  const dataTypes = getLifeHereDataTypes(input.storyType)

  const result = await executeSkill<IntegrateLifeHereInput>({
    skillId: 'integrate-life-here',
    input: {
      lat: input.lat,
      lng: input.lng,
      address: input.address || input.listingData?.address,
      city: input.city || input.listingData?.city,
      state: input.state || input.listingData?.state,
      dataTypes,
      profile: 'balanced',
      limit: 5,
    },
    skipLogging: true,
  })

  if (!result.success || !result.data) {
    console.warn('[CarouselCreator] Failed to fetch Life Here data:', result.error)
    return null
  }

  return result.data as IntegrateLifeHereOutput
}

/**
 * Generate slide content using AI content generation skill
 */
async function generateAIContent(
  input: CarouselCreatorInput,
  lifeHereData: IntegrateLifeHereOutput | null,
  slideCount: number
): Promise<SlideContent[]> {
  const contentInput: CarouselContentInput = {
    storyType: input.storyType,
    slideCount,
    tone: 'professional',
  }

  // Add property data if available
  if (input.listingData) {
    contentInput.property = {
      address: input.listingData.address || '',
      city: input.listingData.city || '',
      state: input.listingData.state || '',
      beds: input.listingData.beds || 0,
      baths: input.listingData.baths || 0,
      sqft: input.listingData.sqft || 0,
      price: input.listingData.price,
      features: input.listingData.features,
    }
  }

  // Add Life Here data if available
  if (lifeHereData) {
    contentInput.lifeHereData = {
      score: lifeHereData.lifeHereScore?.score,
      label: lifeHereData.lifeHereScore?.label,
      dining: lifeHereData.dining?.topPicks?.map(d => ({
        name: d.name,
        cuisine: d.cuisine,
        rating: d.rating,
      })),
      commute: lifeHereData.commute ? {
        beach: lifeHereData.commute.beachMinutes,
        airport: lifeHereData.commute.airportMinutes,
      } : undefined,
      highlights: lifeHereData.highlights,
    }
  }

  const result = await executeSkill<CarouselContentInput>({
    skillId: 'generate-carousel-content',
    input: contentInput,
    skipLogging: true,
  })

  if (result.success && result.data) {
    return (result.data as CarouselContentOutput).slides
  }

  // Fallback to basic content if AI generation fails
  console.warn('[CarouselCreator] AI content generation failed, using fallback')
  return generateFallbackContent(input.storyType, slideCount, lifeHereData, input.listingData)
}

/**
 * Fallback content generation when AI is unavailable
 */
function generateFallbackContent(
  storyType: StoryArchetype,
  slideCount: number,
  lifeHereData: IntegrateLifeHereOutput | null,
  listingData?: CarouselCreatorInput['listingData']
): SlideContent[] {
  const slides: SlideContent[] = []
  const city = listingData?.city || 'the area'

  for (let i = 0; i < slideCount; i++) {
    let slide: SlideContent

    if (i === 0) {
      // Hook slide
      slide = {
        position: i,
        slideType: 'hook',
        headline: storyType.replace(/_/g, ' ').toUpperCase(),
        body: `Discover ${city}`,
        visualSuggestion: 'Hero image',
      }
    } else if (i === slideCount - 1) {
      // CTA slide
      slide = {
        position: i,
        slideType: 'cta',
        headline: 'Get in Touch',
        body: 'DM for more details!',
        visualSuggestion: 'Contact info',
      }
    } else {
      // Content slides
      slide = {
        position: i,
        slideType: 'narrative',
        headline: `Slide ${i + 1}`,
        body: lifeHereData?.highlights?.[i - 1] || 'Learn more...',
        visualSuggestion: 'Supporting image',
      }
    }

    slides.push(slide)
  }

  return slides
}

/**
 * Convert AI-generated slide content to template variables
 */
function slideContentToVariables(
  slide: SlideContent,
  totalSlides: number,
  lifeHereData: IntegrateLifeHereOutput | null,
  listingData?: CarouselCreatorInput['listingData']
): Record<string, unknown> {
  const variables: Record<string, unknown> = {
    slideNumber: slide.position + 1,
    totalSlides,
    headline: slide.headline,
    body: slide.body || '',
    slideType: slide.slideType,
  }

  // Add listing data
  if (listingData) {
    variables.price = listingData.price
    variables.beds = listingData.beds
    variables.baths = listingData.baths
    variables.sqft = listingData.sqft
    variables.address = listingData.address
    variables.city = listingData.city
    variables.state = listingData.state
  }

  // Add Life Here data
  if (lifeHereData) {
    variables.lifeHereScore = lifeHereData.lifeHereScore?.score
    variables.lifeHereLabel = lifeHereData.lifeHereScore?.label

    if (lifeHereData.commute) {
      variables.beachMinutes = lifeHereData.commute.beachMinutes
      variables.airportMinutes = lifeHereData.commute.airportMinutes
      variables.walkScore = lifeHereData.commute.walkScore
    }

    if (lifeHereData.dining) {
      variables.diningCount = lifeHereData.dining.count
      variables.topRestaurant = lifeHereData.dining.topPicks?.[0]?.name
    }

    if (lifeHereData.highlights?.length) {
      variables.highlight1 = lifeHereData.highlights[0]
      variables.highlight2 = lifeHereData.highlights[1]
      variables.highlight3 = lifeHereData.highlights[2]
    }
  }

  // Add data points if available
  if (slide.dataPoints?.length) {
    slide.dataPoints.forEach((dp, idx) => {
      variables[`dataLabel${idx + 1}`] = dp.label
      variables[`dataValue${idx + 1}`] = dp.value
    })
  }

  return variables
}

/**
 * Render the carousel using the render-carousel skill
 */
async function renderCarousel(
  storyType: StoryArchetype,
  slideCount: number,
  lifeHereData: IntegrateLifeHereOutput | null,
  input: CarouselCreatorInput,
  slideContent: SlideContent[]
): Promise<{ slides: CarouselSlideOutput[]; renderTimeMs: number }> {
  // Build slides array with AI-generated content
  const slides = slideContent.map((content, i) => ({
    position: i,
    variables: slideContentToVariables(
      content,
      slideCount,
      lifeHereData,
      input.listingData
    ),
    // In production, these would come from template sets based on story type
    templateSlug: `${storyType}-slide-${i + 1}`,
  }))

  const result = await executeSkill<RenderCarouselInput>({
    skillId: 'render-carousel',
    input: {
      slides,
      brandKit: input.brandKit,
      lifeHereData: lifeHereData as unknown as Record<string, unknown>,
      listingData: input.listingData as unknown as Record<string, unknown>,
      format: input.format || 'png',
      quality: input.quality || 90,
      parallel: true,
      maxConcurrent: 4,
    },
    skipLogging: true,
  })

  if (!result.success) {
    throw new Error(result.error || 'Carousel rendering failed')
  }

  const data = result.data as {
    slides: CarouselSlideOutput[]
    totalRenderTimeMs: number
  }

  return {
    slides: data.slides || [],
    renderTimeMs: data.totalRenderTimeMs || 0,
  }
}

/**
 * Generate caption and hashtags for the carousel using AI skills
 */
async function generateCaptionAndHashtags(
  storyType: StoryArchetype,
  lifeHereData: IntegrateLifeHereOutput | null,
  listingData?: CarouselCreatorInput['listingData'],
  slideContent?: SlideContent[]
): Promise<{ caption: string; hashtags: string[] }> {
  const city = listingData?.city || lifeHereData?.location?.city || 'your area'
  const state = listingData?.state || lifeHereData?.location?.state

  // Generate hashtags using skill
  const hashtagsResult = await executeSkill<HashtagsInput>({
    skillId: 'generate-hashtags',
    input: {
      storyType,
      city,
      state,
      platform: 'instagram',
      property: listingData ? {
        city: listingData.city,
        state: listingData.state,
      } : undefined,
      maxCount: 15,
    },
    skipLogging: true,
  })

  let hashtags: string[] = []
  if (hashtagsResult.success && hashtagsResult.data) {
    hashtags = (hashtagsResult.data as HashtagsOutput).hashtags
  } else {
    // Fallback hashtags
    hashtags = [
      '#realestate', '#realtor', '#homeforsale',
      `#${city.replace(/\s+/g, '')}realestate`,
      '#dreamhome', '#property',
    ]
  }

  // Generate caption using skill
  const captionResult = await executeSkill<CarouselCaptionInput>({
    skillId: 'generate-carousel-caption',
    input: {
      storyType,
      platform: 'instagram',
      tone: 'engaging',
      includeEmoji: true,
      property: listingData ? {
        address: listingData.address || '',
        city: listingData.city || '',
        state: listingData.state || '',
        beds: listingData.beds || 0,
        baths: listingData.baths || 0,
        sqft: listingData.sqft || 0,
        price: listingData.price,
      } : undefined,
      slides: slideContent?.slice(0, 3).map(s => ({
        position: s.position,
        headline: s.headline,
      })),
    },
    skipLogging: true,
  })

  let caption: string
  if (captionResult.success && captionResult.data) {
    caption = (captionResult.data as CarouselCaptionOutput).caption
  } else {
    // Fallback caption
    switch (storyType) {
      case 'just_listed':
        caption = `New on the market! This beautiful ${listingData?.beds || 3}-bedroom home in ${city} is waiting for you. DM for details or to schedule a showing!`
        break
      case 'neighborhood_guide':
        caption = `Thinking about ${city}? Here's everything you need to know about this amazing neighborhood! Save this for later. 📍`
        break
      case 'local_favorites':
        caption = `My favorite spots in ${city}! Which one would you try first? 👇`
        break
      case 'lifestyle':
        if (lifeHereData?.lifeHereScore) {
          caption = `Life Here Score: ${lifeHereData.lifeHereScore.score}/100! Discover what makes ${city} special.`
        } else {
          caption = `Why ${city} is the perfect place to call home. Save this! 🏡`
        }
        break
      default:
        caption = `Check out this amazing opportunity! Contact me for more information.`
    }
  }

  return { caption, hashtags }
}

// =====================
// MAIN EXECUTE FUNCTION
// =====================

async function execute(
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const { input: rawInput } = context
  const input = rawInput as unknown as CarouselCreatorInput

  // Validate input
  if (!input.storyType) {
    return {
      success: false,
      error: 'storyType is required',
      errorCode: 'MISSING_STORY_TYPE',
    }
  }

  const slideCount = input.slideCount || 7

  try {
    // Step 1: Fetch Life Here data for location-based stories
    let lifeHereData: IntegrateLifeHereOutput | null = null

    const locationBasedStories: StoryArchetype[] = [
      'neighborhood_guide',
      'local_favorites',
      'lifestyle',
      'just_listed',
      'open_house',
    ]

    if (locationBasedStories.includes(input.storyType)) {
      lifeHereData = await fetchLifeHereData(input)
    }

    // Step 2: Generate AI-powered slide content
    const slideContent = await generateAIContent(input, lifeHereData, slideCount)

    // Step 3: Render the carousel with generated content
    const { slides, renderTimeMs } = await renderCarousel(
      input.storyType,
      slideCount,
      lifeHereData,
      input,
      slideContent
    )

    // Step 4: Generate caption and hashtags using AI skills
    const { caption, hashtags } = await generateCaptionAndHashtags(
      input.storyType,
      lifeHereData,
      input.listingData,
      slideContent
    )

    const slidesRendered = slides.filter(s => s.success).length
    const slidesFailed = slides.filter(s => !s.success).length

    const output: CarouselCreatorOutput = {
      slides,
      caption,
      hashtags,
      totalRenderTimeMs: renderTimeMs,
      slidesRendered,
      slidesFailed,
      format: input.format || 'png',
      storyType: input.storyType,
      lifeHereData: lifeHereData || undefined,
    }

    return {
      success: slidesFailed === 0,
      output: output as unknown as Record<string, unknown>,
      warnings: slidesFailed > 0
        ? [`${slidesFailed} slide(s) failed to render`]
        : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Carousel creation failed',
      errorCode: 'CAROUSEL_CREATION_FAILED',
    }
  }
}

// =====================
// REGISTER AGENT
// =====================

registerAgent({
  slug: 'carousel-creator',
  name: 'Carousel Creator',
  description: 'Creates Instagram carousel posts with Life Here data, AI content generation, and template-based rendering',
  category: 'content',
  executionMode: 'async',
  systemPrompt: CAROUSEL_CREATOR_PROMPT,
  config: {
    timeout: 180000, // 3 minutes for full carousel
  },
  execute,
})

export type { CarouselCreatorInput, CarouselCreatorOutput }
