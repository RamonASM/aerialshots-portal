/**
 * Video Creator Expert Agent
 *
 * Orchestrates video skills to create real estate marketing videos:
 * - Slideshow from listing photos
 * - Motion effects (Ken Burns)
 * - Audio overlay with background music
 */

import { registerAgent } from '../../registry'
import { executeSkill } from '@/lib/skills/executor'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import type {
  SlideshowInput,
  SlideshowOutput,
  MotionInput,
  MotionOutput,
  AudioOverlayInput,
} from '@/lib/skills/video/types'

interface VideoCreatorInput {
  listingId: string
  photos: string[]
  videoType: 'slideshow' | 'motion' | 'social_reel'
  aspectRatio?: '16:9' | '9:16' | '1:1'
  duration?: number
  transition?: 'fade' | 'kenburns'
  musicUrl?: string
  musicVolume?: number
  outputFormat?: 'mp4' | 'webm'
}

interface VideoCreatorOutput {
  videoPath: string
  videoUrl?: string
  thumbnailPath?: string
  durationSeconds: number
  fileSize: number
  type: string
  photoCount: number
}

const VIDEO_CREATOR_PROMPT = `You are a video creation expert for real estate marketing.
You create engaging property videos that showcase listings effectively.

Video types:
- **slideshow**: Multiple photos with transitions and music
- **motion**: Single hero photo with subtle Ken Burns effect
- **social_reel**: Vertical 9:16 video optimized for Instagram/TikTok

Best practices:
- Use Ken Burns effect for luxury properties
- Keep videos under 60 seconds for social media
- Match music tempo to property style
- Lead with the best exterior shot
- End with a call to action frame`

/**
 * Create slideshow video from listing photos
 */
async function createSlideshow(
  photos: string[],
  options: {
    aspectRatio: '16:9' | '9:16' | '1:1'
    transition: 'fade' | 'kenburns'
    musicUrl?: string
    musicVolume?: number
    outputFormat: 'mp4' | 'webm'
  }
): Promise<VideoCreatorOutput> {
  const photoDuration = options.aspectRatio === '9:16' ? 2 : 3 // Faster for social

  const result = await executeSkill<SlideshowInput>({
    skillId: 'video-slideshow',
    input: {
      photos,
      aspectRatio: options.aspectRatio,
      photoDuration,
      transition: options.transition,
      transitionDuration: 0.5,
      outputFormat: options.outputFormat,
      musicUrl: options.musicUrl,
      musicVolume: options.musicVolume ?? 0.5,
    },
    skipLogging: true,
  })

  if (!result.success) {
    throw new Error(result.error || 'Slideshow creation failed')
  }

  const data = result.data as SlideshowOutput

  return {
    videoPath: data.videoPath,
    videoUrl: data.videoUrl,
    thumbnailPath: data.thumbnailPath,
    durationSeconds: data.durationSeconds,
    fileSize: data.fileSize,
    type: 'slideshow',
    photoCount: photos.length,
  }
}

/**
 * Create motion video from single photo
 */
async function createMotion(
  photo: string,
  options: {
    duration: number
    motionType: 'zoom_in' | 'zoom_out' | 'kenburns'
    outputFormat: 'mp4' | 'webm'
  }
): Promise<VideoCreatorOutput> {
  const result = await executeSkill<MotionInput>({
    skillId: 'video-motion',
    input: {
      imageUrl: photo,
      motionType: options.motionType,
      duration: options.duration,
      zoomFactor: 1.2,
      outputFormat: options.outputFormat,
    },
    skipLogging: true,
  })

  if (!result.success) {
    throw new Error(result.error || 'Motion video creation failed')
  }

  const data = result.data as MotionOutput

  return {
    videoPath: data.videoPath,
    videoUrl: data.videoUrl,
    thumbnailPath: data.thumbnailPath,
    durationSeconds: data.durationSeconds,
    fileSize: data.fileSize,
    type: 'motion',
    photoCount: 1,
  }
}

/**
 * Create social reel (vertical slideshow with music)
 */
async function createSocialReel(
  photos: string[],
  options: {
    musicUrl?: string
    outputFormat: 'mp4' | 'webm'
  }
): Promise<VideoCreatorOutput> {
  // Select top 5-8 photos for a 15-20 second reel
  const selectedPhotos = photos.slice(0, 8)

  const result = await executeSkill<SlideshowInput>({
    skillId: 'video-slideshow',
    input: {
      photos: selectedPhotos,
      aspectRatio: '9:16',
      photoDuration: 2,
      transition: 'kenburns',
      transitionDuration: 0.3,
      outputFormat: options.outputFormat,
      musicUrl: options.musicUrl,
      musicVolume: 0.7, // Higher for social
    },
    skipLogging: true,
  })

  if (!result.success) {
    throw new Error(result.error || 'Social reel creation failed')
  }

  const data = result.data as SlideshowOutput

  return {
    videoPath: data.videoPath,
    videoUrl: data.videoUrl,
    thumbnailPath: data.thumbnailPath,
    durationSeconds: data.durationSeconds,
    fileSize: data.fileSize,
    type: 'social_reel',
    photoCount: selectedPhotos.length,
  }
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
    photos,
    videoType,
    aspectRatio = '16:9',
    duration = 5,
    transition = 'kenburns',
    musicUrl,
    musicVolume,
    outputFormat = 'mp4',
  } = input as unknown as VideoCreatorInput

  if (!listingId) {
    return {
      success: false,
      error: 'listing_id is required',
      errorCode: 'MISSING_LISTING_ID',
    }
  }

  if (!photos || photos.length === 0) {
    return {
      success: false,
      error: 'At least one photo is required',
      errorCode: 'MISSING_PHOTOS',
    }
  }

  try {
    let output: VideoCreatorOutput

    switch (videoType) {
      case 'slideshow':
        output = await createSlideshow(photos, {
          aspectRatio,
          transition,
          musicUrl,
          musicVolume,
          outputFormat,
        })
        break

      case 'motion':
        output = await createMotion(photos[0], {
          duration,
          motionType: 'kenburns',
          outputFormat,
        })
        break

      case 'social_reel':
        output = await createSocialReel(photos, {
          musicUrl,
          outputFormat,
        })
        break

      default:
        return {
          success: false,
          error: `Unknown video type: ${videoType}`,
          errorCode: 'INVALID_VIDEO_TYPE',
        }
    }

    return {
      success: true,
      output: {
        ...output,
        listingId,
        videoType,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Video creation failed',
      errorCode: 'VIDEO_CREATION_FAILED',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'video-creator',
  name: 'Video Creator',
  description: 'Creates real estate marketing videos from listing photos using slideshow, motion, and audio skills',
  category: 'content',
  executionMode: 'async',
  systemPrompt: VIDEO_CREATOR_PROMPT,
  config: {
    timeout: 300000, // 5 minutes for video processing
  },
  execute,
})

export { createSlideshow, createMotion, createSocialReel }
