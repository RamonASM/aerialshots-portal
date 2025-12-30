/**
 * Content Writer Expert Agent
 *
 * Orchestrates content skills to generate real estate marketing copy:
 * - Listing descriptions (multiple styles)
 * - Social media captions (multi-platform)
 * - Marketing emails
 */

import { registerAgent } from '../../registry'
import { executeSkill } from '@/lib/skills/executor'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import type {
  PropertyData,
  NeighborhoodData,
  ContentStyle,
  SocialPlatform,
  EmailType,
  ListingDescriptionOutput,
  SocialCaptionOutput,
  EmailCopyOutput,
} from '@/lib/skills/content/types'

interface ContentWriterInput {
  listingId: string
  property: PropertyData
  neighborhood?: NeighborhoodData
  contentTypes: ('description' | 'social' | 'email')[]
  descriptionStyles?: ContentStyle[]
  socialPlatforms?: SocialPlatform[]
  emailType?: EmailType
  agentName?: string
  customInstructions?: string
}

interface ContentWriterOutput {
  descriptions: ListingDescriptionOutput[]
  socialCaptions: SocialCaptionOutput[]
  email?: EmailCopyOutput
  generatedAt: string
}

const CONTENT_WRITER_PROMPT = `You are an expert real estate copywriter and marketing specialist.
You create compelling, accurate, and engaging content for property listings.

Your content is:
- Accurate and truthful (never exaggerate or mislead)
- Engaging and emotionally resonant
- Optimized for the target platform
- Free of clichés and spammy language
- Compliant with Fair Housing guidelines

Writing styles:
- **Professional**: Polished, business-appropriate, fact-focused
- **Warm**: Friendly, inviting, lifestyle-oriented
- **Luxury**: Sophisticated, aspirational, exclusive

Platform optimization:
- Instagram: Visual, emoji-friendly, hashtag-rich
- Facebook: Conversational, shareable
- LinkedIn: Professional, market insights
- TikTok: Trendy, hook-first, casual`

/**
 * Generate listing descriptions in multiple styles
 */
async function generateDescriptions(
  property: PropertyData,
  neighborhood: NeighborhoodData | undefined,
  styles: ContentStyle[]
): Promise<ListingDescriptionOutput[]> {
  const descriptions: ListingDescriptionOutput[] = []

  for (const style of styles) {
    const result = await executeSkill({
      skillId: 'listing-description',
      input: {
        property,
        neighborhood,
        style,
        length: 'medium',
        includeCallToAction: true,
      },
      skipLogging: true,
    })

    if (result.success && result.data) {
      descriptions.push(result.data as ListingDescriptionOutput)
    }
  }

  return descriptions
}

/**
 * Generate social media captions for multiple platforms
 */
async function generateSocialCaptions(
  property: PropertyData,
  platforms: SocialPlatform[]
): Promise<SocialCaptionOutput[]> {
  const captions: SocialCaptionOutput[] = []

  for (const platform of platforms) {
    const result = await executeSkill({
      skillId: 'social-caption',
      input: {
        property,
        platform,
        tone: 'engaging',
        includeHashtags: true,
        includeEmoji: platform !== 'linkedin',
      },
      skipLogging: true,
    })

    if (result.success && result.data) {
      captions.push(result.data as SocialCaptionOutput)
    }
  }

  return captions
}

/**
 * Generate marketing email
 */
async function generateEmail(
  property: PropertyData,
  emailType: EmailType,
  agentName: string
): Promise<EmailCopyOutput | null> {
  const result = await executeSkill({
    skillId: 'email-copy',
    input: {
      property,
      emailType,
      agentName,
      recipientType: 'general',
    },
    skipLogging: true,
  })

  if (result.success && result.data) {
    return result.data as EmailCopyOutput
  }

  return null
}

/**
 * Main agent execution function
 */
async function execute(
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const { input } = context

  const {
    listingId,
    property,
    neighborhood,
    contentTypes,
    descriptionStyles = ['professional', 'warm', 'luxury'],
    socialPlatforms = ['instagram', 'facebook', 'tiktok'],
    emailType = 'just_listed',
    agentName = 'Your Agent',
  } = input as unknown as ContentWriterInput

  if (!listingId) {
    return {
      success: false,
      error: 'listing_id is required',
      errorCode: 'MISSING_LISTING_ID',
    }
  }

  if (!property) {
    return {
      success: false,
      error: 'property data is required',
      errorCode: 'MISSING_PROPERTY',
    }
  }

  if (!contentTypes || contentTypes.length === 0) {
    return {
      success: false,
      error: 'At least one content type is required',
      errorCode: 'MISSING_CONTENT_TYPES',
    }
  }

  try {
    const output: ContentWriterOutput = {
      descriptions: [],
      socialCaptions: [],
      generatedAt: new Date().toISOString(),
    }

    // Generate descriptions if requested
    if (contentTypes.includes('description')) {
      output.descriptions = await generateDescriptions(
        property,
        neighborhood,
        descriptionStyles
      )
    }

    // Generate social captions if requested
    if (contentTypes.includes('social')) {
      output.socialCaptions = await generateSocialCaptions(
        property,
        socialPlatforms
      )
    }

    // Generate email if requested
    if (contentTypes.includes('email')) {
      const email = await generateEmail(property, emailType, agentName)
      if (email) {
        output.email = email
      }
    }

    // Calculate total content generated
    const totalItems =
      output.descriptions.length +
      output.socialCaptions.length +
      (output.email ? 1 : 0)

    if (totalItems === 0) {
      return {
        success: false,
        error: 'No content was generated',
        errorCode: 'NO_CONTENT_GENERATED',
      }
    }

    return {
      success: true,
      output: {
        ...output,
        listingId,
        totalItemsGenerated: totalItems,
        contentTypes,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Content generation failed',
      errorCode: 'CONTENT_GENERATION_FAILED',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'content-writer',
  name: 'Content Writer',
  description: 'Generates real estate marketing content including descriptions, social captions, and emails',
  category: 'content',
  executionMode: 'async',
  systemPrompt: CONTENT_WRITER_PROMPT,
  config: {
    maxTokens: 2000,
    temperature: 0.7,
    timeout: 120000, // 2 minutes for multiple API calls
  },
  execute,
})

export { generateDescriptions, generateSocialCaptions, generateEmail }
