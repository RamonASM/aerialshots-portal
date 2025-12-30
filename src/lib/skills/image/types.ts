/**
 * Image Skills Types
 *
 * Type definitions for Gemini-powered image skills.
 */

/**
 * Room types for staging and analysis
 */
export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'master_bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'dining_room'
  | 'office'
  | 'nursery'
  | 'basement'
  | 'garage'
  | 'patio'
  | 'exterior'
  | 'other'

/**
 * Staging styles for virtual staging
 */
export type StagingStyle =
  | 'modern'
  | 'contemporary'
  | 'traditional'
  | 'minimalist'
  | 'scandinavian'
  | 'coastal'
  | 'farmhouse'
  | 'industrial'
  | 'luxury'
  | 'mid_century'

/**
 * Image generate input
 */
export interface ImageGenerateInput {
  prompt: string
  sourceImage?: string        // Base64 or URL for image-to-image
  width?: number
  height?: number
  style?: StagingStyle
  roomType?: RoomType
  quality?: 'standard' | 'hd'
}

/**
 * Image generate output
 */
export interface ImageGenerateOutput {
  imageUrl: string
  imageBase64?: string
  width: number
  height: number
  provider: string
  model: string
  processingTimeMs: number
}

/**
 * Detected object in an image
 */
export interface DetectedObject {
  label: string
  confidence: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Image analyze input
 */
export interface ImageAnalyzeInput {
  imageUrl: string            // URL or base64
  analysisType: 'room' | 'objects' | 'quality' | 'staging_readiness' | 'all'
}

/**
 * Image analyze output
 */
export interface ImageAnalyzeOutput {
  roomType?: RoomType
  roomConfidence?: number
  objects?: DetectedObject[]
  hasFurniture?: boolean
  isEmpty?: boolean
  suggestedStyle?: StagingStyle
  qualityScore?: number       // 0-100
  qualityIssues?: string[]
  brightness?: 'dark' | 'normal' | 'bright'
  isExterior?: boolean
  stagingReady?: boolean
  stagingRecommendations?: string[]
}

/**
 * Image inpaint input
 */
export interface ImageInpaintInput {
  imageUrl: string            // URL or base64
  maskUrl?: string            // Optional mask image
  objectsToRemove?: string[]  // Objects to auto-detect and remove
  prompt?: string             // What to fill the area with
  removeAllFurniture?: boolean
}

/**
 * Image inpaint output
 */
export interface ImageInpaintOutput {
  imageUrl: string
  imageBase64?: string
  objectsRemoved: string[]
  processingTimeMs: number
}

/**
 * Twilight conversion input
 */
export interface TwilightInput {
  imageUrl: string            // Daytime exterior photo
  style?: 'warm' | 'cool' | 'dramatic'
  intensity?: 'subtle' | 'moderate' | 'strong'
}

/**
 * Twilight conversion output
 */
export interface TwilightOutput {
  imageUrl: string
  imageBase64?: string
  processingTimeMs: number
}

/**
 * Sky replacement input
 */
export interface SkyReplaceInput {
  imageUrl: string
  skyType?: 'blue_clear' | 'blue_clouds' | 'sunset' | 'dramatic'
}

/**
 * Sky replacement output
 */
export interface SkyReplaceOutput {
  imageUrl: string
  imageBase64?: string
  processingTimeMs: number
}
