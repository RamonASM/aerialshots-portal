/**
 * Social Caption Skill
 *
 * Uses Claude to generate engaging social media captions
 * optimized for different platforms (Instagram, TikTok, Facebook, etc.).
 */

import type { SkillDefinition, SkillResult } from '../types'
import type {
  SocialCaptionInput,
  SocialCaptionOutput,
  SocialCaptionsOutput,
  SocialPlatform,
  PropertyData,
} from './types'
import { generateWithClaude, parseJsonResponse } from './claude-provider'

/**
 * System prompt for social media captions
 */
const SYSTEM_PROMPT = `You are an expert real estate social media manager who creates engaging captions that drive engagement.
Your captions are:
- Platform-optimized (character limits, hashtag usage, tone)
- Engaging with strong hooks
- Action-oriented with clear CTAs
- Compliant with Fair Housing guidelines
- Free of spammy tactics or false urgency

Platform guidelines:
- Instagram: 2200 char max, 30 hashtags max, use line breaks, emojis encouraged
- Instagram Story: Short, punchy, 1-2 sentences, minimal hashtags
- Facebook: More conversational, can be longer, fewer hashtags (3-5)
- LinkedIn: Professional tone, industry insights, minimal emojis
- Twitter/X: 280 char limit, 2-3 hashtags max, punchy
- TikTok: Trendy, casual, hook in first line, 3-5 hashtags

Always return valid JSON as specified.`

/**
 * Get platform-specific character limits and guidelines
 */
function getPlatformConfig(platform: SocialPlatform): {
  maxChars: number
  maxHashtags: number
  tone: string
} {
  switch (platform) {
    case 'instagram':
      return { maxChars: 2200, maxHashtags: 30, tone: 'engaging and visual' }
    case 'instagram_story':
      return { maxChars: 200, maxHashtags: 5, tone: 'quick and punchy' }
    case 'facebook':
      return { maxChars: 5000, maxHashtags: 5, tone: 'conversational and friendly' }
    case 'linkedin':
      return { maxChars: 3000, maxHashtags: 5, tone: 'professional and informative' }
    case 'twitter':
      return { maxChars: 280, maxHashtags: 3, tone: 'concise and punchy' }
    case 'tiktok':
      return { maxChars: 2200, maxHashtags: 5, tone: 'trendy and casual' }
    default:
      return { maxChars: 500, maxHashtags: 10, tone: 'engaging' }
  }
}

/**
 * Get tone instructions based on requested tone
 */
function getToneInstructions(tone: SocialCaptionInput['tone']): string {
  switch (tone) {
    case 'engaging':
      return 'Create excitement and curiosity. Use questions or surprising facts.'
    case 'informative':
      return 'Focus on key features and facts. Educational but not boring.'
    case 'urgent':
      return 'Emphasize limited availability or competitive market. Use action words.'
    case 'celebratory':
      return 'Share excitement about the listing or milestone. Positive energy.'
    default:
      return 'Balance information with engagement.'
  }
}

/**
 * Build the prompt for social caption
 */
function buildCaptionPrompt(input: SocialCaptionInput): string {
  const { property, platform, tone = 'engaging', includeHashtags = true, includeEmoji = true } = input
  const config = getPlatformConfig(platform)
  const toneInstructions = getToneInstructions(tone)

  let prompt = `Generate a ${platform.replace('_', ' ')} caption for this property:

**Property Details:**
- Address: ${property.address}, ${property.city}, ${property.state}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Square Feet: ${property.sqft.toLocaleString()}
${property.price ? `- Price: $${property.price.toLocaleString()}` : ''}
${property.features?.length ? `- Key Features: ${property.features.join(', ')}` : ''}
${property.neighborhood ? `- Neighborhood: ${property.neighborhood}` : ''}
${property.agentName ? `- Agent: ${property.agentName}` : ''}

**Platform:** ${platform}
- Max characters: ${config.maxChars}
- Tone: ${config.tone}
${toneInstructions}

**Requirements:**
${includeEmoji ? '- Include relevant emojis' : '- Do NOT include emojis'}
${includeHashtags ? `- Include up to ${config.maxHashtags} relevant hashtags` : '- Do NOT include hashtags'}
${input.customInstructions ? `- Additional: ${input.customInstructions}` : ''}

Return as JSON:
{
  "caption": "The full caption text including hashtags if requested",
  "hashtags": ["hashtag1", "hashtag2"]
}`

  return prompt
}

/**
 * Generate a single social caption
 */
async function generateCaption(
  input: SocialCaptionInput
): Promise<SocialCaptionOutput> {
  const prompt = buildCaptionPrompt(input)

  const response = await generateWithClaude(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 600,
    temperature: 0.8, // Slightly higher for creativity
  })

  const parsed = parseJsonResponse<{ caption: string; hashtags: string[] }>(response.content)

  return {
    caption: parsed.caption,
    platform: input.platform,
    hashtags: parsed.hashtags || [],
    characterCount: parsed.caption.length,
  }
}

/**
 * Generate captions for multiple platforms
 */
async function generateMultipleCaptions(
  property: PropertyData,
  platforms: SocialPlatform[] = ['instagram', 'facebook', 'tiktok']
): Promise<SocialCaptionsOutput> {
  const captions = await Promise.all(
    platforms.map((platform) =>
      generateCaption({
        property,
        platform,
        tone: 'engaging',
        includeHashtags: true,
        includeEmoji: true,
      })
    )
  )

  const captionsRecord = {} as Record<SocialPlatform, SocialCaptionOutput>
  platforms.forEach((platform, index) => {
    captionsRecord[platform] = captions[index]
  })

  return {
    captions: captionsRecord,
    property,
  }
}

/**
 * Social Caption Skill Definition
 */
export const socialCaptionSkill: SkillDefinition<SocialCaptionInput, SocialCaptionOutput> = {
  id: 'social-caption',
  name: 'Social Caption',
  description: 'Generate engaging social media captions optimized for different platforms',
  category: 'generate',
  version: '1.0.0',
  provider: 'anthropic',

  inputSchema: {
    type: 'object',
    properties: {
      property: {
        type: 'object',
        description: 'Property details for the caption',
        required: ['address', 'city', 'state', 'beds', 'baths', 'sqft'],
      },
      platform: {
        type: 'string',
        enum: ['instagram', 'instagram_story', 'facebook', 'linkedin', 'twitter', 'tiktok'],
      },
      tone: { type: 'string', enum: ['engaging', 'informative', 'urgent', 'celebratory'] },
      includeHashtags: { type: 'boolean' },
      includeEmoji: { type: 'boolean' },
      customInstructions: { type: 'string' },
    },
    required: ['property', 'platform'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      caption: { type: 'string' },
      platform: { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
      characterCount: { type: 'number' },
    },
    required: ['caption', 'platform', 'characterCount'],
  },

  defaultConfig: {
    timeout: 20000,
    retries: 2,
  },

  validate: (input: SocialCaptionInput) => {
    const errors = []
    if (!input.property) {
      errors.push({ field: 'property', message: 'Property data is required', code: 'REQUIRED' })
      return errors
    }
    if (!input.platform) {
      errors.push({ field: 'platform', message: 'Platform is required', code: 'REQUIRED' })
    }
    const validPlatforms: SocialPlatform[] = ['instagram', 'instagram_story', 'facebook', 'linkedin', 'twitter', 'tiktok']
    if (input.platform && !validPlatforms.includes(input.platform)) {
      errors.push({ field: 'platform', message: 'Invalid platform', code: 'INVALID' })
    }
    if (!input.property.address) {
      errors.push({ field: 'property.address', message: 'Address is required', code: 'REQUIRED' })
    }
    if (!input.property.city) {
      errors.push({ field: 'property.city', message: 'City is required', code: 'REQUIRED' })
    }
    if (!input.property.state) {
      errors.push({ field: 'property.state', message: 'State is required', code: 'REQUIRED' })
    }
    return errors
  },

  execute: async (input, context): Promise<SkillResult<SocialCaptionOutput>> => {
    const startTime = Date.now()

    try {
      const output = await generateCaption(input)

      return {
        success: true,
        data: output,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          provider: 'anthropic',
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      let errorCode = 'EXECUTION_ERROR'
      if (message.includes('API key') || message.includes('ANTHROPIC_API_KEY')) {
        errorCode = 'INVALID_API_KEY'
      } else if (message.includes('Rate limited') || message.includes('429')) {
        errorCode = 'RATE_LIMITED'
      }

      return {
        success: false,
        error: message,
        errorCode,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      }
    }
  },

  estimateCost: async (input: SocialCaptionInput) => {
    // Claude Haiku: ~$0.00025 per 1K input tokens, $0.00125 per 1K output tokens
    // Average caption generation: ~400 input tokens, ~200 output tokens
    return 0.0004
  },
}

export { generateMultipleCaptions }
export default socialCaptionSkill
