/**
 * Listing Description Skill
 *
 * Uses Claude to generate compelling MLS listing descriptions
 * in multiple styles (professional, warm, luxury).
 */

import type { SkillDefinition, SkillResult } from '../types'
import type {
  ListingDescriptionInput,
  ListingDescriptionOutput,
  ListingDescriptionsOutput,
  ContentStyle,
  PropertyData,
} from './types'
import { generateWithClaude, parseJsonResponse } from './claude-provider'

/**
 * System prompt for listing descriptions
 */
const SYSTEM_PROMPT = `You are an expert real estate copywriter who creates compelling MLS listing descriptions.
Your descriptions are:
- Accurate and truthful (never exaggerate or mislead)
- Engaging and emotionally resonant
- Optimized for buyer searches
- Free of clichés like "must see" or "won't last long"
- Compliant with Fair Housing guidelines (no discriminatory language)

Always return valid JSON as specified.`

/**
 * Get length parameters based on preference
 */
function getLengthParams(length: 'short' | 'medium' | 'long' = 'medium'): { minWords: number; maxWords: number } {
  switch (length) {
    case 'short':
      return { minWords: 75, maxWords: 100 }
    case 'medium':
      return { minWords: 150, maxWords: 200 }
    case 'long':
      return { minWords: 250, maxWords: 350 }
  }
}

/**
 * Get style instructions
 */
function getStyleInstructions(style: ContentStyle): string {
  switch (style) {
    case 'professional':
      return 'Use a polished, business-appropriate tone. Focus on facts and features. Ideal for luxury markets.'
    case 'warm':
      return 'Use a friendly, inviting tone. Paint a picture of lifestyle. Ideal for family homes.'
    case 'luxury':
      return 'Use sophisticated, aspirational language. Emphasize exclusivity and premium features.'
    case 'casual':
      return 'Use conversational, approachable language. Feel like a friend recommending a home.'
    case 'formal':
      return 'Use traditional, formal real estate language. Focus on specifications and details.'
    default:
      return 'Use a professional, engaging tone.'
  }
}

/**
 * Build the prompt for a single description
 */
function buildDescriptionPrompt(input: ListingDescriptionInput): string {
  const { property, neighborhood, style = 'professional', length = 'medium', includeCallToAction = true } = input
  const { minWords, maxWords } = getLengthParams(length)
  const styleInstructions = getStyleInstructions(style)

  let prompt = `Generate a listing description for this property:

**Property Details:**
- Address: ${property.address}, ${property.city}, ${property.state}${property.zipCode ? ` ${property.zipCode}` : ''}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Square Feet: ${property.sqft.toLocaleString()}
${property.price ? `- Price: $${property.price.toLocaleString()}` : ''}
${property.yearBuilt ? `- Year Built: ${property.yearBuilt}` : ''}
${property.lotSize ? `- Lot Size: ${property.lotSize}` : ''}
${property.propertyType ? `- Property Type: ${property.propertyType.replace('_', ' ')}` : ''}
${property.features?.length ? `- Key Features: ${property.features.join(', ')}` : ''}
${property.neighborhood ? `- Neighborhood: ${property.neighborhood}` : ''}
${property.schoolDistrict ? `- School District: ${property.schoolDistrict}` : ''}`

  if (neighborhood) {
    prompt += `

**Neighborhood Info:**
- Area: ${neighborhood.name}, ${neighborhood.city}
${neighborhood.walkScore ? `- Walk Score: ${neighborhood.walkScore}` : ''}
${neighborhood.vibe ? `- Vibe: ${neighborhood.vibe}` : ''}
${neighborhood.nearbyPlaces?.length ? `- Nearby: ${neighborhood.nearbyPlaces.join(', ')}` : ''}`
  }

  prompt += `

**Style:** ${style}
${styleInstructions}

**Length:** ${minWords}-${maxWords} words

${includeCallToAction ? '**Include a call to action at the end.**' : ''}
${input.customInstructions ? `**Additional Instructions:** ${input.customInstructions}` : ''}

Return as JSON:
{
  "description": "The listing description text",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"]
}`

  return prompt
}

/**
 * Generate a single listing description
 */
async function generateDescription(
  input: ListingDescriptionInput
): Promise<ListingDescriptionOutput> {
  const prompt = buildDescriptionPrompt(input)

  const response = await generateWithClaude(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 800,
    temperature: 0.7,
  })

  const parsed = parseJsonResponse<{ description: string; highlights: string[] }>(response.content)

  return {
    description: parsed.description,
    style: input.style || 'professional',
    wordCount: parsed.description.split(/\s+/).length,
    highlights: parsed.highlights || [],
  }
}

/**
 * Generate multiple descriptions in different styles
 */
async function generateMultipleDescriptions(
  property: PropertyData,
  neighborhood?: ListingDescriptionInput['neighborhood']
): Promise<ListingDescriptionsOutput> {
  const styles: ContentStyle[] = ['professional', 'warm', 'luxury']

  const descriptions = await Promise.all(
    styles.map((style) =>
      generateDescription({
        property,
        neighborhood,
        style,
        length: 'medium',
        includeCallToAction: true,
      })
    )
  )

  return {
    descriptions,
    property,
  }
}

/**
 * Listing Description Skill Definition
 */
export const listingDescriptionSkill: SkillDefinition<ListingDescriptionInput, ListingDescriptionOutput> = {
  id: 'listing-description',
  name: 'Listing Description',
  description: 'Generate compelling MLS listing descriptions using Claude AI',
  category: 'generate',
  version: '1.0.0',
  provider: 'anthropic',

  inputSchema: {
    type: 'object',
    properties: {
      property: {
        type: 'object',
        description: 'Property details for the listing',
        required: ['address', 'city', 'state', 'beds', 'baths', 'sqft'],
      },
      neighborhood: { type: 'object', description: 'Optional neighborhood data' },
      style: { type: 'string', enum: ['professional', 'warm', 'luxury', 'casual', 'formal'] },
      length: { type: 'string', enum: ['short', 'medium', 'long'] },
      includeCallToAction: { type: 'boolean' },
      customInstructions: { type: 'string' },
    },
    required: ['property'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      description: { type: 'string' },
      style: { type: 'string' },
      wordCount: { type: 'number' },
      highlights: { type: 'array', items: { type: 'string' } },
    },
    required: ['description', 'style', 'wordCount'],
  },

  defaultConfig: {
    timeout: 30000,
    retries: 2,
  },

  validate: (input: ListingDescriptionInput) => {
    const errors = []
    if (!input.property) {
      errors.push({ field: 'property', message: 'Property data is required', code: 'REQUIRED' })
      return errors
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
    if (!input.property.beds || input.property.beds < 0) {
      errors.push({ field: 'property.beds', message: 'Valid bedroom count is required', code: 'INVALID' })
    }
    if (!input.property.baths || input.property.baths < 0) {
      errors.push({ field: 'property.baths', message: 'Valid bathroom count is required', code: 'INVALID' })
    }
    if (!input.property.sqft || input.property.sqft < 0) {
      errors.push({ field: 'property.sqft', message: 'Valid square footage is required', code: 'INVALID' })
    }
    return errors
  },

  execute: async (input, context): Promise<SkillResult<ListingDescriptionOutput>> => {
    const startTime = Date.now()

    try {
      const output = await generateDescription(input)

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

  estimateCost: async (input: ListingDescriptionInput) => {
    // Claude Haiku: ~$0.00025 per 1K input tokens, $0.00125 per 1K output tokens
    // Average description generation: ~500 input tokens, ~300 output tokens
    return 0.0005
  },
}

export { generateMultipleDescriptions }
export default listingDescriptionSkill
