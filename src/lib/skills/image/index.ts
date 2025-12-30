/**
 * Image Skills
 *
 * Gemini-powered skills for image analysis and manipulation.
 */

// Types
export type {
  RoomType,
  StagingStyle,
  ImageGenerateInput,
  ImageGenerateOutput,
  ImageAnalyzeInput,
  ImageAnalyzeOutput,
  ImageInpaintInput,
  ImageInpaintOutput,
  TwilightInput,
  TwilightOutput,
  SkyReplaceInput,
  SkyReplaceOutput,
  DetectedObject,
} from './types'

// Skills
export { imageAnalyzeSkill } from './analyze'
export { imageGenerateSkill } from './generate'
export { imageInpaintSkill } from './inpaint'

// Re-export for convenience
import { imageAnalyzeSkill } from './analyze'
import { imageGenerateSkill } from './generate'
import { imageInpaintSkill } from './inpaint'

/**
 * All image skills for bulk registration
 */
export const imageSkills = [
  imageAnalyzeSkill,
  imageGenerateSkill,
  imageInpaintSkill,
]
