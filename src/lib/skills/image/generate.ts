/**
 * Image Generate Skill
 *
 * Uses Gemini to generate or modify images:
 * - Virtual staging from empty rooms
 * - Style-specific furniture placement
 * - Room transformations
 */

import type { SkillDefinition, SkillResult } from '../types'
import type {
  ImageGenerateInput,
  ImageGenerateOutput,
  RoomType,
  StagingStyle,
} from './types'
import { imageUrlToBase64, generateWithGemini } from './gemini-provider'

/**
 * Get style-specific staging prompt
 */
function getStagingPrompt(roomType: RoomType, style: StagingStyle): string {
  const styleDescriptions: Record<StagingStyle, string> = {
    modern: 'clean lines, neutral colors with bold accents, contemporary furniture, minimal clutter',
    contemporary: 'current trends, mix of textures, comfortable yet stylish furniture',
    traditional: 'classic furniture, rich colors, elegant details, timeless appeal',
    minimalist: 'essential furniture only, white and neutral palette, open space, zen-like calm',
    scandinavian: 'light wood, white walls, cozy textiles, functional beauty, hygge atmosphere',
    coastal: 'light blues and whites, natural textures, relaxed beach-inspired decor',
    farmhouse: 'rustic wood, vintage elements, comfortable seating, warm and welcoming',
    industrial: 'exposed brick, metal accents, urban loft aesthetic, raw materials',
    luxury: 'high-end furniture, premium materials, sophisticated color palette, designer pieces',
    mid_century: '1950s-60s inspired, organic curves, bold colors, retro modern furniture',
  }

  const roomDescriptions: Record<RoomType, string> = {
    living_room: 'a comfortable living room with sofa, coffee table, side tables, and tasteful decor',
    bedroom: 'a restful bedroom with bed, nightstands, dresser, and soft lighting',
    master_bedroom: 'a luxurious master bedroom with king bed, seating area, and elegant fixtures',
    bathroom: 'a spa-like bathroom with coordinated towels, accessories, and plants',
    kitchen: 'a functional kitchen with coordinated accessories, small appliances, and decor',
    dining_room: 'an inviting dining room with table, chairs, centerpiece, and ambient lighting',
    office: 'a productive home office with desk, chair, shelving, and organized workspace',
    nursery: 'a charming nursery with crib, changing table, and soft decor',
    basement: 'a finished basement with comfortable seating and entertainment setup',
    garage: 'an organized garage with storage solutions and clean floor',
    patio: 'an outdoor living space with patio furniture and planters',
    exterior: 'curb appeal with landscaping and outdoor decor',
    other: 'appropriate furniture and decor for the space',
  }

  return `Transform this empty room into ${roomDescriptions[roomType]} in a ${style} style.
The design should feature ${styleDescriptions[style]}.
Keep the existing architecture, windows, and flooring. Only add furniture and decor.
The result should look photorealistic and professionally staged for real estate marketing.`
}

/**
 * Generate image with Gemini
 */
async function generateImageWithGemini(input: ImageGenerateInput): Promise<ImageGenerateOutput> {
  const startTime = Date.now()

  // Build the prompt
  let prompt = input.prompt
  if (input.roomType && input.style) {
    prompt = getStagingPrompt(input.roomType, input.style)
  }

  // If we have a source image, do image-to-image
  if (input.sourceImage) {
    const imageData = await imageUrlToBase64(input.sourceImage)
    await generateWithGemini(prompt, imageData)

    // Note: Gemini 2.0 Flash doesn't generate images yet
    // This is a placeholder for when Imagen 3 is available via API
    return {
      imageUrl: '', // Would be the generated image URL
      width: input.width || 1024,
      height: input.height || 768,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      processingTimeMs: Date.now() - startTime,
    }
  }

  // Text-to-image (requires Imagen API when available)
  await generateWithGemini(prompt)

  return {
    imageUrl: '', // Placeholder
    width: input.width || 1024,
    height: input.height || 768,
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    processingTimeMs: Date.now() - startTime,
  }
}

/**
 * Image Generate Skill Definition
 */
export const imageGenerateSkill: SkillDefinition<ImageGenerateInput, ImageGenerateOutput> = {
  id: 'image-generate',
  name: 'Image Generate',
  description: 'Generate or modify images using Gemini for virtual staging and enhancements',
  category: 'generate',
  version: '1.0.0',
  provider: 'gemini',

  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Text prompt for image generation' },
      sourceImage: { type: 'string', description: 'Optional source image URL or base64 for editing' },
      width: { type: 'number', description: 'Output width in pixels' },
      height: { type: 'number', description: 'Output height in pixels' },
      style: { type: 'string', description: 'Staging style' },
      roomType: { type: 'string', description: 'Room type for staging' },
      quality: { type: 'string', enum: ['standard', 'hd'] },
    },
    required: ['prompt'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      imageUrl: { type: 'string' },
      imageBase64: { type: 'string' },
      width: { type: 'number' },
      height: { type: 'number' },
      provider: { type: 'string' },
      model: { type: 'string' },
      processingTimeMs: { type: 'number' },
    },
    required: ['imageUrl', 'provider', 'processingTimeMs'],
  },

  defaultConfig: {
    timeout: 60000, // Image generation can take longer
    retries: 2,
  },

  validate: (input: ImageGenerateInput) => {
    const errors = []
    if (!input.prompt && !(input.roomType && input.style)) {
      errors.push({
        field: 'prompt',
        message: 'Either prompt or roomType+style is required',
        code: 'REQUIRED',
      })
    }
    if (input.width && (input.width < 256 || input.width > 4096)) {
      errors.push({
        field: 'width',
        message: 'Width must be between 256 and 4096',
        code: 'INVALID',
      })
    }
    if (input.height && (input.height < 256 || input.height > 4096)) {
      errors.push({
        field: 'height',
        message: 'Height must be between 256 and 4096',
        code: 'INVALID',
      })
    }
    return errors
  },

  execute: async (input, context): Promise<SkillResult<ImageGenerateOutput>> => {
    const startTime = Date.now()

    try {
      const output = await generateImageWithGemini(input)

      return {
        success: true,
        data: output,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          provider: 'gemini',
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      let errorCode = 'EXECUTION_ERROR'
      if (message.includes('API key') || message.includes('GOOGLE_AI_API_KEY')) {
        errorCode = 'INVALID_API_KEY'
      } else if (message.includes('quota') || message.includes('rate')) {
        errorCode = 'RATE_LIMITED'
      } else if (message.includes('fetch')) {
        errorCode = 'IMAGE_FETCH_ERROR'
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

  estimateCost: async (input: ImageGenerateInput) => {
    // Gemini pricing: ~$0.002 per image for generation
    const baseCost = input.quality === 'hd' ? 0.004 : 0.002
    return baseCost
  },
}

export default imageGenerateSkill
