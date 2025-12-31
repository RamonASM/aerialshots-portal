/**
 * Generate Carousel Caption Skill
 *
 * Generates platform-optimized captions for Instagram carousel posts.
 */

import type { SkillDefinition, SkillResult, ValidationError } from '../types'
import type { CarouselCaptionInput, CarouselCaptionOutput, SocialPlatform } from './types'
import { generateWithClaude, parseJsonResponse } from './claude-provider'

// =====================
// CONSTANTS
// =====================

const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  instagram: 2200,
  instagram_story: 150,
  facebook: 500,
  linkedin: 700,
  twitter: 280,
  tiktok: 150,
}

const CTA_TEMPLATES = {
  contact: ['DM for details', 'Link in bio', 'Contact me today', 'Message me'],
  engagement: ['Save this post', 'Share with a friend', 'Double tap if you agree', 'Tag someone who needs this'],
  action: ['Schedule a showing', 'Book your tour', 'Get pre-approved', 'Start your search'],
}

// =====================
// PROMPTS
// =====================

function buildSystemPrompt(platform: SocialPlatform): string {
  const charLimit = PLATFORM_CHAR_LIMITS[platform]

  return `You are an expert real estate social media copywriter specializing in ${platform} captions.
You write captions that drive engagement, tell stories, and convert followers into clients.

Guidelines for ${platform}:
- Character limit: ${charLimit} characters
- Use line breaks for readability
- Start with a hook (question, bold statement, or emoji)
- Include a clear call-to-action
- Match the platform's tone (Instagram is visual/personal, LinkedIn is professional)
${platform === 'instagram' ? '- Use 2-3 emojis strategically' : ''}

Output Format: Return a JSON object with this structure:
{
  "caption": "The full caption text",
  "callToAction": "The specific CTA used",
  "characterCount": 123
}`
}

function buildUserPrompt(input: CarouselCaptionInput): string {
  const tone = input.tone || 'engaging'

  let prompt = `Write a ${tone} caption for a carousel about: ${input.storyType.replace(/_/g, ' ').toUpperCase()}
Platform: ${input.platform}
Tone: ${tone}
Include emoji: ${input.includeEmoji !== false ? 'yes' : 'minimal'}
`

  if (input.property) {
    prompt += `
Property:
- ${input.property.address}, ${input.property.city}
- ${input.property.beds}bd/${input.property.baths}ba, ${input.property.sqft?.toLocaleString()} sqft
${input.property.price ? `- Listed at $${input.property.price.toLocaleString()}` : ''}
`
  }

  if (input.slides && input.slides.length > 0) {
    prompt += `
Carousel slides:
${input.slides.slice(0, 3).map(s => `- Slide ${s.position + 1}: ${s.headline}`).join('\n')}
`
  }

  if (input.agentName) {
    prompt += `\nAgent: ${input.agentName}\n`
  }

  if (input.callToAction) {
    prompt += `\nUse this CTA: ${input.callToAction}\n`
  }

  prompt += `
Return ONLY the JSON object, no markdown or explanation.`

  return prompt
}

// =====================
// FALLBACK GENERATION
// =====================

function generateFallbackCaption(input: CarouselCaptionInput): CarouselCaptionOutput {
  const storyType = input.storyType
  const city = input.property?.city || 'the area'
  const emoji = input.includeEmoji !== false

  let caption = ''
  let cta = 'DM for details!'

  switch (storyType) {
    case 'just_listed':
      caption = `${emoji ? '🏡 ' : ''}Just Listed in ${city}!\n\n`
      if (input.property) {
        caption += `${input.property.beds}bd/${input.property.baths}ba | ${input.property.sqft?.toLocaleString()} sqft\n\n`
      }
      caption += `Swipe to see what makes this home special. ${emoji ? '➡️' : ''}\n\n`
      cta = 'DM me to schedule a private showing!'
      break

    case 'just_sold':
      caption = `${emoji ? '🎉 ' : ''}SOLD in ${city}!\n\n`
      caption += `Another happy homeowner! Congratulations to my clients on their beautiful new home.\n\n`
      cta = 'Ready to be next? Let\'s chat!'
      break

    case 'neighborhood_guide':
      caption = `${emoji ? '📍 ' : ''}Discover ${city}\n\n`
      caption += `Everything you need to know about life in this amazing neighborhood. Swipe through for local favorites!\n\n`
      cta = 'Save this for later!'
      break

    case 'open_house':
      caption = `${emoji ? '🏠 ' : ''}Open House This Weekend!\n\n`
      if (input.property) {
        caption += `📍 ${input.property.address}\n`
      }
      caption += `Come see this beautiful home in person.\n\n`
      cta = 'See you there!'
      break

    default:
      caption = `${emoji ? '✨ ' : ''}New on ${input.platform === 'instagram' ? 'the feed' : 'my page'}!\n\n`
      caption += `Swipe through to learn more about real estate in ${city}.\n\n`
      cta = 'Follow for more!'
  }

  caption += cta

  if (input.agentName) {
    caption += `\n\n- ${input.agentName}`
  }

  return {
    caption,
    callToAction: cta,
    characterCount: caption.length,
    platform: input.platform,
  }
}

// =====================
// SKILL DEFINITION
// =====================

export const generateCarouselCaptionSkill: SkillDefinition<CarouselCaptionInput, CarouselCaptionOutput> = {
  id: 'generate-carousel-caption',
  name: 'Generate Carousel Caption',
  description: 'Generate platform-optimized captions for carousel posts',
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
      slides: { type: 'array' },
      agentName: { type: 'string' },
      platform: {
        type: 'string',
        enum: ['instagram', 'instagram_story', 'facebook', 'linkedin', 'twitter', 'tiktok'],
      },
      tone: { type: 'string' },
      includeEmoji: { type: 'boolean' },
      callToAction: { type: 'string' },
    },
    required: ['storyType', 'platform'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      caption: { type: 'string' },
      callToAction: { type: 'string' },
      characterCount: { type: 'number' },
      platform: { type: 'string' },
    },
    required: ['caption', 'callToAction', 'characterCount', 'platform'],
  },

  defaultConfig: {
    timeout: 20000,
    retries: 1,
  },

  validate: (input: CarouselCaptionInput): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!input.storyType) {
      errors.push({
        field: 'storyType',
        message: 'Story type is required',
        code: 'REQUIRED',
      })
    }

    if (!input.platform) {
      errors.push({
        field: 'platform',
        message: 'Platform is required',
        code: 'REQUIRED',
      })
    }

    return errors
  },

  execute: async (input, context): Promise<SkillResult<CarouselCaptionOutput>> => {
    const startTime = Date.now()

    try {
      const systemPrompt = buildSystemPrompt(input.platform)
      const userPrompt = buildUserPrompt(input)

      const response = await generateWithClaude(userPrompt, {
        systemPrompt,
        maxTokens: 500,
        temperature: 0.7,
      })

      // Parse JSON response
      let parsed: { caption: string; callToAction: string; characterCount: number }
      try {
        parsed = parseJsonResponse(response.content)
      } catch {
        // Use fallback if parsing fails
        console.warn('[CarouselCaption] Failed to parse AI response, using fallback')
        const fallback = generateFallbackCaption(input)
        return {
          success: true,
          data: fallback,
          metadata: {
            executionTimeMs: Date.now() - startTime,
            warnings: ['Used fallback caption due to parse error'],
          },
        }
      }

      // Ensure character count is accurate
      const actualCharCount = parsed.caption.length
      const charLimit = PLATFORM_CHAR_LIMITS[input.platform]

      // Truncate if needed
      let finalCaption = parsed.caption
      if (actualCharCount > charLimit) {
        finalCaption = parsed.caption.slice(0, charLimit - 3) + '...'
      }

      return {
        success: true,
        data: {
          caption: finalCaption,
          callToAction: parsed.callToAction || 'DM for details!',
          characterCount: finalCaption.length,
          platform: input.platform,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
          provider: 'anthropic',
          tokensUsed: response.tokensUsed,
        },
      }
    } catch (error) {
      // Use fallback on any error
      if (error instanceof Error) {
        console.warn('[CarouselCaption] AI error, using fallback:', error.message)
      }

      const fallback = generateFallbackCaption(input)
      return {
        success: true,
        data: fallback,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          warnings: ['Used fallback caption due to AI error'],
        },
      }
    }
  },

  estimateCost: async (): Promise<number> => {
    // Estimated ~200 tokens output
    return 0.0006
  },
}

export default generateCarouselCaptionSkill
