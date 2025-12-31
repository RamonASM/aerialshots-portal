/**
 * Google Gemini provider for virtual staging
 * Uses Gemini's image generation/editing capabilities via Imagen 3
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { integrationLogger, formatError } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'gemini-staging' })

interface GeminiStagingParams {
  imageUrl: string
  prompt: string
  roomType: string
  style: string
}

interface GeminiStagingResult {
  success: boolean
  imageUrl?: string
  imageBase64?: string
  processingTime?: number
  error?: string
  provider: 'gemini'
  status: 'success' | 'error' | 'not_configured'
}

// Initialize Gemini client lazily
let genAI: GoogleGenerativeAI | null = null

function getGeminiClient(): GoogleGenerativeAI | null {
  if (!process.env.GOOGLE_AI_API_KEY) {
    return null
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  }
  return genAI
}

/**
 * Fetch image and convert to base64 for Gemini API
 */
async function imageToBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  return {
    data: base64,
    mimeType: contentType,
  }
}

/**
 * Generate staged image using Google Gemini
 *
 * Uses Gemini's vision capabilities to analyze the room and
 * describe what staging would look like. For actual image generation,
 * this integrates with Gemini's image generation (Imagen 3) when available.
 */
export async function generateWithGemini(
  params: GeminiStagingParams
): Promise<GeminiStagingResult> {
  const startTime = Date.now()

  try {
    // Validate API key
    const client = getGeminiClient()
    if (!client) {
      return {
        success: false,
        error: 'GOOGLE_AI_API_KEY not configured. Add it to your environment variables.',
        provider: 'gemini',
        status: 'not_configured',
      }
    }

    // Get the vision model for image analysis
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // Convert the input image to base64
    const imageData = await imageToBase64(params.imageUrl)

    // Create the staging prompt
    const stagingPrompt = buildGeminiPrompt({
      roomType: params.roomType,
      style: params.style,
    })

    // For image generation, we need to use the imagen model
    // gemini-2.0-flash-exp supports image generation
    const imagenModel = client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        // @ts-expect-error - responseModalities is available for image generation
        responseModalities: ['image', 'text'],
      },
    })

    // Generate the staged image
    const result = await imagenModel.generateContent([
      {
        inlineData: imageData,
      },
      {
        text: `${stagingPrompt}

Based on this empty room image, generate a new image showing the same room but virtually staged with beautiful, realistic furniture and decor in ${params.style} style.

The staging should:
- Keep the exact same room structure, walls, floors, and windows
- Add appropriate furniture for a ${params.roomType}
- Use photorealistic quality with proper lighting and shadows
- Match the perspective and lighting of the original photo`,
      },
    ])

    const response = result.response
    const processingTime = Date.now() - startTime

    // Check if we got an image in the response
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          // Check for inline image data
          if ('inlineData' in part && part.inlineData) {
            return {
              success: true,
              imageBase64: part.inlineData.data,
              processingTime,
              provider: 'gemini',
              status: 'success',
            }
          }
        }
      }
    }

    // If no image was generated, return an error with the text response if available
    const textResponse = response.text?.() || 'No image generated'
    return {
      success: false,
      error: `Image generation not available: ${textResponse.substring(0, 200)}`,
      processingTime,
      provider: 'gemini',
      status: 'error',
    }
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Error generating staged image')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
      provider: 'gemini',
      status: 'error',
    }
  }
}

/**
 * Build a staging prompt for Gemini
 */
export function buildGeminiPrompt(params: {
  roomType: string
  style: string
  removeExisting?: boolean
  furnitureItems?: string[]
  placementHints?: string[]
}): string {
  let prompt = `You are a professional virtual stager. Transform this empty ${params.roomType}
into a beautifully staged space using ${params.style} style furniture and decor.

Guidelines:
- Maintain photorealistic quality
- Ensure proper lighting and realistic shadows
- Keep the original room structure, walls, windows, and floors intact
- Add appropriate furniture that fits the scale of the room
`

  if (params.removeExisting) {
    prompt += `\nFirst, remove any existing furniture before adding new items.`
  }

  if (params.furnitureItems?.length) {
    prompt += `\nInclude these furniture items: ${params.furnitureItems.join(', ')}`
  }

  if (params.placementHints?.length) {
    prompt += `\nPlacement notes: ${params.placementHints.join('. ')}`
  }

  return prompt
}

/**
 * Estimate processing time based on image complexity
 */
export function estimateProcessingTime(params: {
  removeExisting?: boolean
  furnitureCount?: number
}): number {
  let baseTime = 10000 // 10 seconds base

  if (params.removeExisting) {
    baseTime += 5000 // +5 seconds for object removal
  }

  if (params.furnitureCount && params.furnitureCount > 5) {
    baseTime += (params.furnitureCount - 5) * 1000 // +1 second per extra item
  }

  return baseTime
}
