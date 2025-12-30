/**
 * Email Copy Skill
 *
 * Uses Claude to generate professional real estate marketing emails
 * for various purposes (just listed, open house, price reduction, etc.).
 */

import type { SkillDefinition, SkillResult } from '../types'
import type {
  EmailCopyInput,
  EmailCopyOutput,
  EmailType,
  PropertyData,
} from './types'
import { generateWithClaude, parseJsonResponse } from './claude-provider'

/**
 * System prompt for email copy
 */
const SYSTEM_PROMPT = `You are an expert real estate email copywriter who creates professional marketing emails that drive engagement and responses.
Your emails are:
- Professional yet personable
- Clear with strong subject lines and CTAs
- Formatted for readability (short paragraphs, bullet points where appropriate)
- Compliant with CAN-SPAM and Fair Housing guidelines
- Free of spammy words that trigger email filters

Subject line best practices:
- Keep under 50 characters when possible
- Create curiosity or urgency
- Include property detail or neighborhood when relevant
- Avoid ALL CAPS and excessive punctuation

Always return valid JSON as specified.`

/**
 * Get email type instructions
 */
function getEmailTypeInstructions(emailType: EmailType): string {
  switch (emailType) {
    case 'just_listed':
      return 'Announce a new listing. Focus on first impression and key features that make it special.'
    case 'open_house':
      return 'Invite to an open house event. Include date, time, and what makes this a must-see.'
    case 'price_reduction':
      return 'Announce a price reduction. Create urgency but avoid desperate tone.'
    case 'under_contract':
      return 'Announce the property is under contract. Use FOMO to generate leads for similar properties.'
    case 'just_sold':
      return 'Celebrate a sale. Highlight success and invite readers who want similar results.'
    case 'market_update':
      return 'Share market insights and trends. Position as expert and generate engagement.'
    case 'newsletter':
      return 'General newsletter content. Mix of value, updates, and soft CTAs.'
    default:
      return 'Create engaging real estate marketing content.'
  }
}

/**
 * Get recipient type instructions
 */
function getRecipientInstructions(recipientType: EmailCopyInput['recipientType']): string {
  switch (recipientType) {
    case 'sphere':
      return 'Writing to your personal network (friends, family, past connections). Warm and personal tone.'
    case 'leads':
      return 'Writing to potential clients who have shown interest. Helpful and informative tone.'
    case 'past_clients':
      return 'Writing to people you\'ve worked with before. Familiar and appreciative tone.'
    case 'general':
    default:
      return 'Writing to a general audience. Professional and approachable tone.'
  }
}

/**
 * Build the prompt for email copy
 */
function buildEmailPrompt(input: EmailCopyInput): string {
  const {
    property,
    emailType,
    recipientType = 'general',
    agentName,
    agentBrokerage,
    eventDate,
    eventTime,
  } = input

  const emailTypeInstructions = getEmailTypeInstructions(emailType)
  const recipientInstructions = getRecipientInstructions(recipientType)

  let prompt = `Generate a ${emailType.replace(/_/g, ' ')} email for this property:

**Property Details:**
- Address: ${property.address}, ${property.city}, ${property.state}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Square Feet: ${property.sqft.toLocaleString()}
${property.price ? `- Price: $${property.price.toLocaleString()}` : ''}
${property.features?.length ? `- Key Features: ${property.features.join(', ')}` : ''}
${property.neighborhood ? `- Neighborhood: ${property.neighborhood}` : ''}
${property.mlsNumber ? `- MLS#: ${property.mlsNumber}` : ''}

**Agent:**
- Name: ${agentName}
${agentBrokerage ? `- Brokerage: ${agentBrokerage}` : ''}
${property.agentPhone ? `- Phone: ${property.agentPhone}` : ''}

**Email Type:** ${emailType.replace(/_/g, ' ')}
${emailTypeInstructions}

**Recipient Type:** ${recipientType}
${recipientInstructions}

${eventDate ? `**Event Date:** ${eventDate}` : ''}
${eventTime ? `**Event Time:** ${eventTime}` : ''}

${input.customInstructions ? `**Additional Instructions:** ${input.customInstructions}` : ''}

Return as JSON:
{
  "subject": "Email subject line (under 50 chars preferred)",
  "previewText": "Preview text shown in inbox (50-90 chars)",
  "body": "Full email body in HTML format with <p>, <ul>, <li> tags as appropriate",
  "callToAction": "The main CTA text (e.g., 'Schedule a Showing')"
}`

  return prompt
}

/**
 * Generate email copy
 */
async function generateEmail(
  input: EmailCopyInput
): Promise<EmailCopyOutput> {
  const prompt = buildEmailPrompt(input)

  const response = await generateWithClaude(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 1200,
    temperature: 0.6, // Slightly lower for more consistent professional tone
  })

  const parsed = parseJsonResponse<{
    subject: string
    previewText: string
    body: string
    callToAction: string
  }>(response.content)

  return {
    subject: parsed.subject,
    previewText: parsed.previewText,
    body: parsed.body,
    callToAction: parsed.callToAction,
    emailType: input.emailType,
  }
}

/**
 * Generate multiple email variations
 */
async function generateEmailVariations(
  input: EmailCopyInput,
  count: number = 3
): Promise<EmailCopyOutput[]> {
  const variations = await Promise.all(
    Array.from({ length: count }, () => generateEmail(input))
  )
  return variations
}

/**
 * Email Copy Skill Definition
 */
export const emailCopySkill: SkillDefinition<EmailCopyInput, EmailCopyOutput> = {
  id: 'email-copy',
  name: 'Email Copy',
  description: 'Generate professional real estate marketing emails for various purposes',
  category: 'generate',
  version: '1.0.0',
  provider: 'anthropic',

  inputSchema: {
    type: 'object',
    properties: {
      property: {
        type: 'object',
        description: 'Property details for the email',
        required: ['address', 'city', 'state', 'beds', 'baths', 'sqft'],
      },
      emailType: {
        type: 'string',
        enum: ['just_listed', 'open_house', 'price_reduction', 'under_contract', 'just_sold', 'market_update', 'newsletter'],
      },
      recipientType: {
        type: 'string',
        enum: ['sphere', 'leads', 'past_clients', 'general'],
      },
      agentName: { type: 'string' },
      agentBrokerage: { type: 'string' },
      eventDate: { type: 'string' },
      eventTime: { type: 'string' },
      customInstructions: { type: 'string' },
    },
    required: ['property', 'emailType', 'agentName'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      subject: { type: 'string' },
      previewText: { type: 'string' },
      body: { type: 'string' },
      callToAction: { type: 'string' },
      emailType: { type: 'string' },
    },
    required: ['subject', 'previewText', 'body', 'callToAction', 'emailType'],
  },

  defaultConfig: {
    timeout: 30000,
    retries: 2,
  },

  validate: (input: EmailCopyInput) => {
    const errors = []
    if (!input.property) {
      errors.push({ field: 'property', message: 'Property data is required', code: 'REQUIRED' })
      return errors
    }
    if (!input.emailType) {
      errors.push({ field: 'emailType', message: 'Email type is required', code: 'REQUIRED' })
    }
    if (!input.agentName) {
      errors.push({ field: 'agentName', message: 'Agent name is required', code: 'REQUIRED' })
    }
    const validTypes: EmailType[] = ['just_listed', 'open_house', 'price_reduction', 'under_contract', 'just_sold', 'market_update', 'newsletter']
    if (input.emailType && !validTypes.includes(input.emailType)) {
      errors.push({ field: 'emailType', message: 'Invalid email type', code: 'INVALID' })
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
    // Validate open house has date/time
    if (input.emailType === 'open_house' && (!input.eventDate || !input.eventTime)) {
      errors.push({
        field: 'eventDate',
        message: 'Event date and time required for open house emails',
        code: 'REQUIRED'
      })
    }
    return errors
  },

  execute: async (input, context): Promise<SkillResult<EmailCopyOutput>> => {
    const startTime = Date.now()

    try {
      const output = await generateEmail(input)

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

  estimateCost: async (input: EmailCopyInput) => {
    // Claude Haiku: ~$0.00025 per 1K input tokens, $0.00125 per 1K output tokens
    // Average email generation: ~500 input tokens, ~400 output tokens
    return 0.0006
  },
}

export { generateEmailVariations }
export default emailCopySkill
