/**
 * Image Analyze Skill
 *
 * Uses Gemini Vision to analyze real estate images:
 * - Room type detection
 * - Object detection
 * - Quality assessment
 * - Staging readiness
 */

import type { SkillDefinition, SkillResult } from '../types'
import type {
  ImageAnalyzeInput,
  ImageAnalyzeOutput,
  RoomType,
  StagingStyle,
  DetectedObject,
} from './types'
import { imageUrlToBase64, generateWithGemini, parseJsonResponse } from './gemini-provider'

/**
 * System prompt for image analysis
 */
const ANALYSIS_SYSTEM_PROMPT = `You are an expert real estate photography analyst. Analyze the provided image and return a JSON response with the following structure:

{
  "roomType": "living_room" | "bedroom" | "master_bedroom" | "bathroom" | "kitchen" | "dining_room" | "office" | "nursery" | "basement" | "garage" | "patio" | "exterior" | "other",
  "roomConfidence": 0.0-1.0,
  "objects": [{"label": "string", "confidence": 0.0-1.0}],
  "hasFurniture": boolean,
  "isEmpty": boolean,
  "suggestedStyle": "modern" | "contemporary" | "traditional" | "minimalist" | "scandinavian" | "coastal" | "farmhouse" | "industrial" | "luxury" | "mid_century",
  "qualityScore": 0-100,
  "qualityIssues": ["string"],
  "brightness": "dark" | "normal" | "bright",
  "isExterior": boolean,
  "stagingReady": boolean,
  "stagingRecommendations": ["string"]
}

For real estate photos:
- Identify room type from architecture and fixtures
- List visible furniture and objects
- Assess photo quality (exposure, focus, composition)
- Determine if room is empty (ready for virtual staging)
- Suggest appropriate staging style based on architecture`

/**
 * Execute image analysis with Gemini Vision
 */
async function analyzeWithGemini(
  imageUrl: string,
  analysisType: ImageAnalyzeInput['analysisType']
): Promise<ImageAnalyzeOutput> {
  // Convert image to base64
  const imageData = await imageUrlToBase64(imageUrl)

  // Build analysis prompt based on type
  let analysisPrompt = ANALYSIS_SYSTEM_PROMPT
  if (analysisType === 'room') {
    analysisPrompt += '\n\nFocus only on: roomType, roomConfidence, isExterior'
  } else if (analysisType === 'objects') {
    analysisPrompt += '\n\nFocus only on: objects, hasFurniture, isEmpty'
  } else if (analysisType === 'quality') {
    analysisPrompt += '\n\nFocus only on: qualityScore, qualityIssues, brightness'
  } else if (analysisType === 'staging_readiness') {
    analysisPrompt += '\n\nFocus only on: isEmpty, stagingReady, stagingRecommendations, suggestedStyle'
  }

  // Call Gemini with the image
  const response = await generateWithGemini(analysisPrompt, imageData)

  // Parse JSON from response
  const parsed = parseJsonResponse<Record<string, unknown>>(response)

  return {
    roomType: parsed.roomType as RoomType,
    roomConfidence: parsed.roomConfidence as number,
    objects: parsed.objects as DetectedObject[],
    hasFurniture: parsed.hasFurniture as boolean,
    isEmpty: parsed.isEmpty as boolean,
    suggestedStyle: parsed.suggestedStyle as StagingStyle,
    qualityScore: parsed.qualityScore as number,
    qualityIssues: parsed.qualityIssues as string[],
    brightness: parsed.brightness as 'dark' | 'normal' | 'bright',
    isExterior: parsed.isExterior as boolean,
    stagingReady: parsed.stagingReady as boolean,
    stagingRecommendations: parsed.stagingRecommendations as string[],
  }
}

/**
 * Image Analyze Skill Definition
 */
export const imageAnalyzeSkill: SkillDefinition<ImageAnalyzeInput, ImageAnalyzeOutput> = {
  id: 'image-analyze',
  name: 'Image Analyze',
  description: 'Analyze real estate images using Gemini Vision for room type, objects, quality, and staging readiness',
  category: 'data',
  version: '1.0.0',
  provider: 'gemini',

  inputSchema: {
    type: 'object',
    properties: {
      imageUrl: { type: 'string', description: 'URL or base64 of the image to analyze' },
      analysisType: {
        type: 'string',
        enum: ['room', 'objects', 'quality', 'staging_readiness', 'all'],
        description: 'Type of analysis to perform',
      },
    },
    required: ['imageUrl', 'analysisType'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      roomType: { type: 'string' },
      roomConfidence: { type: 'number' },
      objects: { type: 'array' },
      hasFurniture: { type: 'boolean' },
      isEmpty: { type: 'boolean' },
      suggestedStyle: { type: 'string' },
      qualityScore: { type: 'number' },
      qualityIssues: { type: 'array' },
      brightness: { type: 'string' },
      isExterior: { type: 'boolean' },
      stagingReady: { type: 'boolean' },
      stagingRecommendations: { type: 'array' },
    },
  },

  defaultConfig: {
    timeout: 30000,
    retries: 2,
  },

  validate: (input: ImageAnalyzeInput) => {
    const errors = []
    if (!input.imageUrl) {
      errors.push({ field: 'imageUrl', message: 'Image URL is required', code: 'REQUIRED' })
    }
    if (!input.analysisType) {
      errors.push({ field: 'analysisType', message: 'Analysis type is required', code: 'REQUIRED' })
    }
    const validTypes = ['room', 'objects', 'quality', 'staging_readiness', 'all']
    if (input.analysisType && !validTypes.includes(input.analysisType)) {
      errors.push({ field: 'analysisType', message: 'Invalid analysis type', code: 'INVALID' })
    }
    return errors
  },

  execute: async (input, context): Promise<SkillResult<ImageAnalyzeOutput>> => {
    const startTime = Date.now()

    try {
      const output = await analyzeWithGemini(input.imageUrl, input.analysisType)

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

      // Determine error code
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
}

export default imageAnalyzeSkill
