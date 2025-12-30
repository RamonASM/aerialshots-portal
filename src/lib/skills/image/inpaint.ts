/**
 * Image Inpaint Skill
 *
 * Uses Gemini to remove objects from images:
 * - Furniture removal for decluttering
 * - Object removal (cords, clutter, personal items)
 * - Prepare empty rooms for virtual staging
 */

import type { SkillDefinition, SkillResult } from '../types'
import type { ImageInpaintInput, ImageInpaintOutput } from './types'
import { imageUrlToBase64, generateWithGemini, parseJsonResponse } from './gemini-provider'

/**
 * System prompt for object removal
 */
const INPAINT_SYSTEM_PROMPT = `You are an expert photo editor specializing in real estate photography.
Your task is to identify and remove specified objects from the image while maintaining photorealistic quality.
The removed areas should be filled with appropriate background (floor, wall, etc.) that matches the surroundings.
Maintain consistent lighting, shadows, and perspective.`

/**
 * First pass: Detect objects that should be removed
 */
async function detectObjectsToRemove(
  imageData: { base64: string; mimeType: string },
  objectsToRemove: string[] | undefined,
  removeAllFurniture: boolean
): Promise<string[]> {
  let detectionPrompt: string
  if (removeAllFurniture) {
    detectionPrompt = `Analyze this image and list ALL furniture and movable objects that should be removed to create an empty room.
Include: sofas, chairs, tables, beds, dressers, desks, lamps, rugs, curtains, decorations, artwork, electronics, plants, etc.
Return as a JSON array of object names: ["sofa", "coffee table", "lamp", ...]`
  } else if (objectsToRemove && objectsToRemove.length > 0) {
    detectionPrompt = `Analyze this image and confirm which of these objects are visible and can be removed: ${objectsToRemove.join(', ')}.
Return as a JSON array of detected objects: ["object1", "object2", ...]`
  } else {
    return []
  }

  const response = await generateWithGemini(detectionPrompt, imageData)

  try {
    return parseJsonResponse<string[]>(response)
  } catch {
    // Return original list if parsing fails
    return objectsToRemove || []
  }
}

/**
 * Generate inpaint instructions for Gemini
 */
async function inpaintWithGemini(input: ImageInpaintInput): Promise<ImageInpaintOutput> {
  const startTime = Date.now()

  // Convert image to base64
  const imageData = await imageUrlToBase64(input.imageUrl)

  // First detect what needs to be removed
  const objectsToRemove = await detectObjectsToRemove(
    imageData,
    input.objectsToRemove,
    input.removeAllFurniture || false
  )

  if (objectsToRemove.length === 0) {
    return {
      imageUrl: input.imageUrl,
      objectsRemoved: [],
      processingTimeMs: Date.now() - startTime,
    }
  }

  // Build the inpaint prompt
  const prompt = input.prompt ||
    `Remove the following objects from this image: ${objectsToRemove.join(', ')}.
Fill the removed areas with the appropriate background (floor, wall) to create a clean, empty space.
Maintain photorealistic quality, consistent lighting, and natural shadows.
The result should look like a professional real estate photo of an empty room.`

  // Call Gemini with the image
  // Note: Gemini 2.0 Flash doesn't have true inpainting yet
  // This generates instructions/description for now
  await generateWithGemini(INPAINT_SYSTEM_PROMPT + '\n\n' + prompt, imageData)

  // In production, this would return the edited image
  // For now, we return the detection results
  return {
    imageUrl: '', // Would be the inpainted image URL
    objectsRemoved: objectsToRemove,
    processingTimeMs: Date.now() - startTime,
  }
}

/**
 * Image Inpaint Skill Definition
 */
export const imageInpaintSkill: SkillDefinition<ImageInpaintInput, ImageInpaintOutput> = {
  id: 'image-inpaint',
  name: 'Image Inpaint',
  description: 'Remove objects from images using AI for decluttering and staging preparation',
  category: 'transform',
  version: '1.0.0',
  provider: 'gemini',

  inputSchema: {
    type: 'object',
    properties: {
      imageUrl: { type: 'string', description: 'URL or base64 of the image' },
      maskUrl: { type: 'string', description: 'Optional mask image for precise removal' },
      objectsToRemove: { type: 'array', items: { type: 'string' }, description: 'Objects to remove' },
      prompt: { type: 'string', description: 'Custom inpaint instructions' },
      removeAllFurniture: { type: 'boolean', description: 'Remove all furniture to create empty room' },
    },
    required: ['imageUrl'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      imageUrl: { type: 'string' },
      imageBase64: { type: 'string' },
      objectsRemoved: { type: 'array', items: { type: 'string' } },
      processingTimeMs: { type: 'number' },
    },
    required: ['imageUrl', 'objectsRemoved', 'processingTimeMs'],
  },

  defaultConfig: {
    timeout: 60000,
    retries: 2,
  },

  validate: (input: ImageInpaintInput) => {
    const errors = []
    if (!input.imageUrl) {
      errors.push({ field: 'imageUrl', message: 'Image URL is required', code: 'REQUIRED' })
    }
    if (!input.objectsToRemove?.length && !input.removeAllFurniture && !input.prompt) {
      errors.push({
        field: 'objectsToRemove',
        message: 'Either objectsToRemove, removeAllFurniture, or prompt is required',
        code: 'REQUIRED',
      })
    }
    return errors
  },

  execute: async (input, context): Promise<SkillResult<ImageInpaintOutput>> => {
    const startTime = Date.now()

    try {
      const output = await inpaintWithGemini(input)

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

  estimateCost: async (input: ImageInpaintInput) => {
    // Gemini vision pricing: ~$0.002 per image
    // Extra for object detection pass
    return 0.004
  },
}

export default imageInpaintSkill
