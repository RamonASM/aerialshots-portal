/**
 * Generate Carousel Content Skill
 *
 * Uses AI to generate slide content for Instagram carousels
 * based on story type, property data, and Life Here data.
 */

import type { SkillDefinition, SkillResult, ValidationError } from '../types'
import type {
  CarouselContentInput,
  CarouselContentOutput,
  SlideContent,
  StoryArchetype,
} from './types'
import { generateWithClaude, parseJsonResponse } from './claude-provider'

// =====================
// CONTENT VALIDATION
// =====================

/**
 * Maximum character limits for slide content
 */
const SLIDE_LIMITS = {
  headline: 50,  // Max 50 characters for headlines
  body: 200,     // Max 200 characters for body text
}

/**
 * Default slide content for padding when AI generates fewer slides than requested
 */
const DEFAULT_SLIDE_TEMPLATES: SlideContent[] = [
  {
    position: 0,
    slideType: 'narrative',
    headline: 'Discover More',
    body: 'There\'s so much to love about this opportunity.',
    visualSuggestion: 'Feature highlight image',
  },
  {
    position: 0,
    slideType: 'feature',
    headline: 'Key Highlights',
    body: 'Every detail has been carefully considered.',
    visualSuggestion: 'Detail shot or amenity',
  },
  {
    position: 0,
    slideType: 'cta',
    headline: 'Ready to Learn More?',
    body: 'Contact us today to schedule a tour.',
    visualSuggestion: 'Agent photo with contact info',
  },
]

/**
 * Validate and normalize AI-generated slide content
 *
 * Ensures:
 * - Exactly the requested number of slides
 * - No duplicate headlines
 * - Character limits enforced
 * - Position values are sequential
 */
function validateAndNormalizeSlides(
  slides: SlideContent[],
  expectedCount: number
): SlideContent[] {
  if (!slides || !Array.isArray(slides)) {
    slides = []
  }

  // Filter out any invalid slides
  let validSlides = slides.filter(
    (s): s is SlideContent =>
      s !== null &&
      typeof s === 'object' &&
      typeof s.headline === 'string'
  )

  // Truncate if too many slides
  if (validSlides.length > expectedCount) {
    validSlides = validSlides.slice(0, expectedCount)
  }

  // Pad if too few slides
  while (validSlides.length < expectedCount) {
    const templateIndex = validSlides.length % DEFAULT_SLIDE_TEMPLATES.length
    const template = DEFAULT_SLIDE_TEMPLATES[templateIndex]
    validSlides.push({
      ...template,
      position: validSlides.length,
    })
  }

  // Track seen headlines to prevent duplicates
  const seenHeadlines = new Set<string>()

  // Normalize each slide
  return validSlides.map((slide, index) => {
    // Fix position to be sequential
    const normalizedSlide: SlideContent = {
      ...slide,
      position: index,
    }

    // Enforce headline character limit
    if (normalizedSlide.headline && normalizedSlide.headline.length > SLIDE_LIMITS.headline) {
      normalizedSlide.headline = normalizedSlide.headline.slice(0, SLIDE_LIMITS.headline - 3) + '...'
    }

    // Enforce body character limit
    if (normalizedSlide.body && normalizedSlide.body.length > SLIDE_LIMITS.body) {
      normalizedSlide.body = normalizedSlide.body.slice(0, SLIDE_LIMITS.body - 3) + '...'
    }

    // Check for duplicate headlines
    const headlineKey = normalizedSlide.headline.toLowerCase().trim()
    if (seenHeadlines.has(headlineKey)) {
      // Append position number to make unique
      normalizedSlide.headline = `${normalizedSlide.headline} ${index + 1}`
    }
    seenHeadlines.add(headlineKey)

    return normalizedSlide
  })
}

// =====================
// PROMPTS
// =====================

const STORY_TYPE_PROMPTS: Record<StoryArchetype, string> = {
  just_listed: `Create engaging content for a "Just Listed" carousel showcasing a new property on the market.
Focus on: property highlights, unique features, location benefits, and urgency to see it.`,

  just_sold: `Create celebratory content for a "Just Sold" carousel.
Focus on: success story, happy ending, market expertise, and social proof.`,

  open_house: `Create inviting content for an "Open House" carousel.
Focus on: event details, property highlights, neighborhood appeal, and creating FOMO.`,

  price_reduction: `Create attention-grabbing content for a "Price Reduction" carousel.
Focus on: value opportunity, why the price changed, urgency, and property value.`,

  coming_soon: `Create anticipation-building content for a "Coming Soon" carousel.
Focus on: teasing features, building excitement, exclusivity, and early interest.`,

  neighborhood_guide: `Create informative content for a "Neighborhood Guide" carousel.
Focus on: local dining, schools, parks, lifestyle, commute times, and community vibe.`,

  local_favorites: `Create personal and engaging content for a "Local Favorites" carousel.
Focus on: agent's personal picks for restaurants, coffee shops, activities, and hidden gems.`,

  lifestyle: `Create aspirational content for a "Lifestyle" carousel.
Focus on: daily life in the area, activities, community events, and quality of life.`,

  market_update: `Create informative content for a "Market Update" carousel.
Focus on: market statistics, trends, what it means for buyers/sellers, and expert insights.`,

  agent_spotlight: `Create personal branding content for an "Agent Spotlight" carousel.
Focus on: agent story, expertise, recent successes, and unique value proposition.`,

  testimonial: `Create trust-building content for a "Testimonial" carousel.
Focus on: client success stories, before/after, quotes, and social proof.`,

  tips_advice: `Create educational content for a "Tips & Advice" carousel.
Focus on: actionable advice, industry insights, common mistakes, and expert tips.`,
}

function buildSystemPrompt(): string {
  return `You are an expert real estate social media content creator specializing in Instagram carousels.
You create engaging, scroll-stopping content that combines storytelling with valuable information.

Guidelines:
- Each slide should have a clear, concise headline (max 8 words)
- Body text should be 2-3 sentences max
- First slide is the HOOK - must grab attention
- Last slide is the CTA - must drive action
- Use data points from Life Here when available
- Match tone to the story type and audience
- Suggest visual elements for each slide

Output Format: Return a JSON object with this structure:
{
  "slides": [
    {
      "position": 0,
      "slideType": "hook|narrative|stats|feature|neighborhood|testimonial|cta",
      "headline": "Short attention-grabbing headline",
      "body": "Optional supporting text",
      "visualSuggestion": "What should be shown visually",
      "dataPoints": [{"label": "Walk Score", "value": "92"}]
    }
  ],
  "theme": "Overall theme/mood of the carousel",
  "targetAudience": "Who this carousel is for"
}`
}

function buildUserPrompt(input: CarouselContentInput): string {
  const storyPrompt = STORY_TYPE_PROMPTS[input.storyType]
  const slideCount = input.slideCount || 7

  let prompt = `${storyPrompt}

Create ${slideCount} slides for this carousel.
Story Type: ${input.storyType.replace(/_/g, ' ').toUpperCase()}
Tone: ${input.tone || 'professional'}
`

  if (input.property) {
    prompt += `
Property Details:
- Address: ${input.property.address}, ${input.property.city}, ${input.property.state}
- Price: ${input.property.price ? `$${input.property.price.toLocaleString()}` : 'TBD'}
- Beds: ${input.property.beds} | Baths: ${input.property.baths} | Sqft: ${input.property.sqft.toLocaleString()}
- Features: ${input.property.features?.join(', ') || 'Not specified'}
`
  }

  if (input.lifeHereData) {
    prompt += `
Life Here Data (use this for authentic local content):
`
    if (input.lifeHereData.score) {
      prompt += `- Life Here Score: ${input.lifeHereData.score}/100 (${input.lifeHereData.label})\n`
    }
    if (input.lifeHereData.dining?.length) {
      prompt += `- Top Dining: ${input.lifeHereData.dining.slice(0, 3).map(d => `${d.name} (${d.cuisine})`).join(', ')}\n`
    }
    if (input.lifeHereData.commute) {
      const c = input.lifeHereData.commute
      prompt += `- Commute: ${c.beach ? `${c.beach} min to beach` : ''} ${c.airport ? `${c.airport} min to airport` : ''}\n`
    }
    if (input.lifeHereData.highlights?.length) {
      prompt += `- Highlights: ${input.lifeHereData.highlights.slice(0, 3).join(', ')}\n`
    }
  }

  if (input.agentName) {
    prompt += `\nAgent: ${input.agentName}\n`
  }

  if (input.customPrompt) {
    prompt += `\nAdditional Instructions: ${input.customPrompt}\n`
  }

  prompt += `
Return ONLY the JSON object, no markdown or explanation.`

  return prompt
}

// =====================
// SKILL DEFINITION
// =====================

export const generateCarouselContentSkill: SkillDefinition<CarouselContentInput, CarouselContentOutput> = {
  id: 'generate-carousel-content',
  name: 'Generate Carousel Content',
  description: 'Generate AI-powered slide content for Instagram carousels',
  category: 'generate',
  version: '1.0.0',
  provider: 'anthropic',

  inputSchema: {
    type: 'object',
    properties: {
      storyType: {
        type: 'string',
        enum: [
          'just_listed', 'just_sold', 'open_house', 'price_reduction',
          'coming_soon', 'neighborhood_guide', 'local_favorites', 'lifestyle',
          'market_update', 'agent_spotlight', 'testimonial', 'tips_advice',
        ],
      },
      property: { type: 'object' },
      neighborhood: { type: 'object' },
      lifeHereData: { type: 'object' },
      agentName: { type: 'string' },
      slideCount: { type: 'number' },
      tone: { type: 'string' },
      customPrompt: { type: 'string' },
    },
    required: ['storyType'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      storyType: { type: 'string' },
      slides: { type: 'array' },
      theme: { type: 'string' },
      targetAudience: { type: 'string' },
    },
    required: ['storyType', 'slides', 'theme', 'targetAudience'],
  },

  defaultConfig: {
    timeout: 30000,
    retries: 2,
  },

  validate: (input: CarouselContentInput): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!input.storyType) {
      errors.push({
        field: 'storyType',
        message: 'Story type is required',
        code: 'REQUIRED',
      })
    }

    if (input.slideCount && (input.slideCount < 2 || input.slideCount > 10)) {
      errors.push({
        field: 'slideCount',
        message: 'Slide count must be between 2 and 10',
        code: 'INVALID_RANGE',
      })
    }

    return errors
  },

  execute: async (input, context): Promise<SkillResult<CarouselContentOutput>> => {
    const startTime = Date.now()

    try {
      const systemPrompt = buildSystemPrompt()
      const userPrompt = buildUserPrompt(input)

      const response = await generateWithClaude(userPrompt, {
        systemPrompt,
        maxTokens: 2000,
        temperature: 0.7,
      })

      // Parse JSON response
      let parsed: { slides: SlideContent[]; theme: string; targetAudience: string }
      try {
        parsed = parseJsonResponse(response.content)
      } catch {
        return {
          success: false,
          error: 'Failed to parse AI response as JSON',
          errorCode: 'PARSE_ERROR',
          metadata: { executionTimeMs: Date.now() - startTime },
        }
      }

      // Validate structure
      if (!parsed.slides || !Array.isArray(parsed.slides)) {
        return {
          success: false,
          error: 'Invalid response structure: missing slides array',
          errorCode: 'INVALID_RESPONSE',
          metadata: { executionTimeMs: Date.now() - startTime },
        }
      }

      // Validate and normalize slides to ensure:
      // - Exactly the requested number of slides
      // - No duplicate headlines
      // - Character limits enforced
      // - Sequential position values
      const expectedSlideCount = input.slideCount || 7
      const normalizedSlides = validateAndNormalizeSlides(parsed.slides, expectedSlideCount)

      // Track if we had to modify the output
      const wasModified = normalizedSlides.length !== parsed.slides.length ||
        normalizedSlides.some((s, i) => s.headline !== parsed.slides[i]?.headline)

      return {
        success: true,
        data: {
          storyType: input.storyType,
          slides: normalizedSlides,
          theme: parsed.theme || 'professional',
          targetAudience: parsed.targetAudience || 'general',
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
          provider: 'anthropic',
          tokensUsed: response.tokensUsed,
          warnings: wasModified
            ? ['AI output was normalized (slide count, character limits, or duplicates adjusted)']
            : undefined,
        },
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Unknown error'

      return {
        success: false,
        error: message,
        errorCode: 'GENERATION_ERROR',
        metadata: { executionTimeMs: Date.now() - startTime },
      }
    }
  },

  estimateCost: async (input: CarouselContentInput): Promise<number> => {
    const slideCount = input.slideCount || 7
    // Estimated tokens: ~200 input + ~100 per slide output
    const estimatedTokens = 200 + (slideCount * 100)
    // Claude pricing: ~$0.003 per 1K tokens (output)
    return (estimatedTokens / 1000) * 0.003
  },
}

export default generateCarouselContentSkill
