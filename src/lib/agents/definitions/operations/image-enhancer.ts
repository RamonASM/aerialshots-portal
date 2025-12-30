/**
 * Image Enhancer Expert Agent
 *
 * Orchestrates image skills to enhance real estate photos:
 * - Room/object analysis
 * - Virtual staging
 * - Object removal (inpainting)
 * - Twilight conversion
 */

import { registerAgent } from '../../registry'
import { executeSkill } from '@/lib/skills/executor'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import type {
  ImageAnalyzeInput,
  ImageAnalyzeOutput,
  ImageGenerateInput,
  ImageGenerateOutput,
  ImageInpaintInput,
  ImageInpaintOutput,
} from '@/lib/skills/image/types'

interface ImageEnhancerInput {
  listingId: string
  imageUrl: string
  enhancements: ('analyze' | 'stage' | 'inpaint' | 'twilight')[]
  stagingStyle?: 'modern' | 'traditional' | 'minimalist' | 'luxury'
  inpaintPrompt?: string
  inpaintMask?: string
}

interface ImageEnhancerOutput {
  originalUrl: string
  analysis?: ImageAnalyzeOutput
  stagedUrl?: string
  inpaintedUrl?: string
  twilightUrl?: string
  enhancementsApplied: string[]
}

const IMAGE_ENHANCER_PROMPT = `You are an image enhancement expert for real estate photography.
You analyze and enhance property photos to maximize their marketing impact.

Enhancement capabilities:
- **Analysis**: Detect room type, objects, furniture, and potential issues
- **Virtual Staging**: Add realistic furniture and decor to empty rooms
- **Inpainting**: Remove unwanted objects, declutter, fix imperfections
- **Twilight**: Convert daytime exterior to stunning twilight/dusk scenes

Quality standards:
- Maintain photorealistic results
- Match lighting and perspective
- Preserve architectural details
- Ensure color consistency with other listing photos`

/**
 * Analyze image to detect room type and objects
 */
async function analyzeImage(imageUrl: string): Promise<ImageAnalyzeOutput | null> {
  const result = await executeSkill<ImageAnalyzeInput>({
    skillId: 'image-analyze',
    input: {
      imageUrl,
      analysisType: 'room',
      includeObjects: true,
      includeSuggestions: true,
    },
    skipLogging: true,
  })

  if (result.success && result.data) {
    return result.data as ImageAnalyzeOutput
  }

  return null
}

/**
 * Generate virtual staging for a room
 */
async function stageRoom(
  imageUrl: string,
  roomType: string,
  style: string
): Promise<string | null> {
  const prompt = `Virtual stage this ${roomType} in ${style} style. Add appropriate furniture, decor, and accessories while maintaining photorealistic quality. Keep the walls, floors, and architectural features unchanged.`

  const result = await executeSkill<ImageGenerateInput>({
    skillId: 'image-generate',
    input: {
      prompt,
      sourceImageUrl: imageUrl,
      generationType: 'staging',
      style,
    },
    skipLogging: true,
  })

  if (result.success && result.data) {
    return (result.data as ImageGenerateOutput).imageUrl
  }

  return null
}

/**
 * Remove objects from image using inpainting
 */
async function inpaintImage(
  imageUrl: string,
  prompt: string,
  maskUrl?: string
): Promise<string | null> {
  const result = await executeSkill<ImageInpaintInput>({
    skillId: 'image-inpaint',
    input: {
      imageUrl,
      maskUrl,
      prompt,
      preserveBackground: true,
    },
    skipLogging: true,
  })

  if (result.success && result.data) {
    return (result.data as ImageInpaintOutput).imageUrl
  }

  return null
}

/**
 * Convert daytime exterior to twilight
 */
async function createTwilight(imageUrl: string): Promise<string | null> {
  const prompt = `Transform this daytime exterior photo into a stunning twilight/dusk scene. Add warm interior lights glowing from windows, a beautiful sunset sky with purple and orange hues, and subtle landscape lighting. Maintain photorealism.`

  const result = await executeSkill<ImageGenerateInput>({
    skillId: 'image-generate',
    input: {
      prompt,
      sourceImageUrl: imageUrl,
      generationType: 'twilight',
    },
    skipLogging: true,
  })

  if (result.success && result.data) {
    return (result.data as ImageGenerateOutput).imageUrl
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
    imageUrl,
    enhancements,
    stagingStyle = 'modern',
    inpaintPrompt = 'Remove unwanted objects and clutter',
    inpaintMask,
  } = input as unknown as ImageEnhancerInput

  if (!listingId) {
    return {
      success: false,
      error: 'listing_id is required',
      errorCode: 'MISSING_LISTING_ID',
    }
  }

  if (!imageUrl) {
    return {
      success: false,
      error: 'image_url is required',
      errorCode: 'MISSING_IMAGE_URL',
    }
  }

  if (!enhancements || enhancements.length === 0) {
    return {
      success: false,
      error: 'At least one enhancement type is required',
      errorCode: 'MISSING_ENHANCEMENTS',
    }
  }

  try {
    const output: ImageEnhancerOutput = {
      originalUrl: imageUrl,
      enhancementsApplied: [],
    }

    // Start with analysis if requested (useful for other enhancements)
    let analysis: ImageAnalyzeOutput | null = null
    if (enhancements.includes('analyze')) {
      analysis = await analyzeImage(imageUrl)
      if (analysis) {
        output.analysis = analysis
        output.enhancementsApplied.push('analyze')
      }
    }

    // Virtual staging
    if (enhancements.includes('stage')) {
      // Use analysis to determine room type, or default
      const roomType = analysis?.roomType || 'living room'
      const stagedUrl = await stageRoom(imageUrl, roomType, stagingStyle)
      if (stagedUrl) {
        output.stagedUrl = stagedUrl
        output.enhancementsApplied.push('stage')
      }
    }

    // Inpainting (object removal)
    if (enhancements.includes('inpaint')) {
      const inpaintedUrl = await inpaintImage(imageUrl, inpaintPrompt, inpaintMask)
      if (inpaintedUrl) {
        output.inpaintedUrl = inpaintedUrl
        output.enhancementsApplied.push('inpaint')
      }
    }

    // Twilight conversion
    if (enhancements.includes('twilight')) {
      // Check if this is an exterior image
      const isExterior = analysis?.roomType?.toLowerCase().includes('exterior') ||
                         analysis?.roomType?.toLowerCase().includes('front') ||
                         analysis?.roomType?.toLowerCase().includes('backyard')

      // Create twilight even if we're not sure - AI will handle it
      const twilightUrl = await createTwilight(imageUrl)
      if (twilightUrl) {
        output.twilightUrl = twilightUrl
        output.enhancementsApplied.push('twilight')
      }
    }

    if (output.enhancementsApplied.length === 0) {
      return {
        success: false,
        error: 'No enhancements were successfully applied',
        errorCode: 'NO_ENHANCEMENTS_APPLIED',
      }
    }

    return {
      success: true,
      output: {
        ...output,
        listingId,
        requestedEnhancements: enhancements,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image enhancement failed',
      errorCode: 'IMAGE_ENHANCEMENT_FAILED',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'image-enhancer',
  name: 'Image Enhancer',
  description: 'Enhances real estate photos using AI analysis, staging, inpainting, and twilight conversion',
  category: 'operations',
  executionMode: 'async',
  systemPrompt: IMAGE_ENHANCER_PROMPT,
  config: {
    timeout: 180000, // 3 minutes for multiple AI image operations
  },
  execute,
})

export { analyzeImage, stageRoom, inpaintImage, createTwilight }
