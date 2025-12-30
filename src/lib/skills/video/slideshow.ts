/**
 * Slideshow Skill
 *
 * Creates video slideshows from a series of images using FFmpeg.
 * Supports multiple aspect ratios and transition effects.
 */

import type { SkillDefinition, SkillResult } from '../types'
import type { SlideshowInput, SlideshowOutput, SlideshowPhoto } from './types'
import {
  checkFFmpegInstalled,
  downloadToTemp,
  cleanupTempFile,
  getTempFilePath,
  getResolution,
  getVideoMetadata,
  getFileSize,
  createKenBurnsSlideshow,
  createFadeSlideshow,
  addAudioToVideo,
} from './ffmpeg-provider'

/**
 * Normalize photo input to SlideshowPhoto array
 */
function normalizePhotos(photos: SlideshowPhoto[] | string[]): SlideshowPhoto[] {
  return photos.map((photo) => {
    if (typeof photo === 'string') {
      return { url: photo }
    }
    return photo
  })
}

/**
 * Generate slideshow video from photos
 */
async function generateSlideshow(input: SlideshowInput): Promise<SlideshowOutput> {
  // Check FFmpeg availability
  const ffmpegAvailable = await checkFFmpegInstalled()
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not installed or not available in PATH')
  }

  const photos = normalizePhotos(input.photos)
  if (photos.length === 0) {
    throw new Error('At least one photo is required')
  }

  const resolution = getResolution(input.aspectRatio)
  const photoDuration = input.photoDuration || 3
  const transitionDuration = input.transitionDuration || 0.5
  const outputFormat = input.outputFormat || 'mp4'

  // Download all photos to temp storage
  const downloadedPaths: string[] = []
  try {
    for (const photo of photos) {
      const localPath = await downloadToTemp(photo.url)
      downloadedPaths.push(localPath)
    }

    // Generate output path
    const outputPath = input.outputPath || getTempFilePath(outputFormat)

    // Create slideshow based on transition type
    if (input.transition === 'kenburns') {
      await createKenBurnsSlideshow(downloadedPaths, outputPath, {
        duration: photoDuration,
        resolution,
        transitionDuration,
      })
    } else {
      // Default to fade for other transitions
      await createFadeSlideshow(downloadedPaths, outputPath, {
        duration: photoDuration,
        resolution,
        transitionDuration,
      })
    }

    // Add music if provided
    let finalOutputPath = outputPath
    if (input.musicUrl) {
      const musicPath = await downloadToTemp(input.musicUrl)
      const withMusicPath = getTempFilePath(outputFormat)

      try {
        const videoMeta = await getVideoMetadata(outputPath)
        await addAudioToVideo(outputPath, musicPath, withMusicPath, {
          volume: input.musicVolume || 0.5,
          fadeIn: 1,
          fadeOut: 2,
          loop: true,
          videoDuration: videoMeta.duration,
        })

        // Clean up original video without music
        cleanupTempFile(outputPath)
        finalOutputPath = withMusicPath
      } finally {
        cleanupTempFile(musicPath)
      }
    }

    // Get final video metadata
    const metadata = await getVideoMetadata(finalOutputPath)
    const fileSize = getFileSize(finalOutputPath)

    return {
      videoPath: finalOutputPath,
      durationSeconds: metadata.duration,
      fileSize,
      photoCount: photos.length,
      resolution: {
        width: metadata.width,
        height: metadata.height,
      },
    }
  } finally {
    // Clean up downloaded photos
    downloadedPaths.forEach(cleanupTempFile)
  }
}

/**
 * Slideshow Skill Definition
 */
export const slideshowSkill: SkillDefinition<SlideshowInput, SlideshowOutput> = {
  id: 'video-slideshow',
  name: 'Video Slideshow',
  description: 'Create video slideshows from images with transitions and music',
  category: 'generate',
  version: '1.0.0',
  provider: 'ffmpeg',

  inputSchema: {
    type: 'object',
    properties: {
      photos: {
        type: 'array',
        description: 'Array of photo URLs',
        items: {
          type: 'string',
          description: 'Photo URL',
        },
      },
      aspectRatio: {
        type: 'string',
        enum: ['16:9', '9:16', '1:1', '4:3'],
      },
      photoDuration: { type: 'number', description: 'Duration per photo in seconds' },
      transition: {
        type: 'string',
        enum: ['fade', 'slide', 'zoom', 'kenburns', 'none'],
      },
      transitionDuration: { type: 'number' },
      outputFormat: { type: 'string', enum: ['mp4', 'webm', 'mov'] },
      musicUrl: { type: 'string' },
      musicVolume: { type: 'number' },
    },
    required: ['photos', 'aspectRatio', 'transition', 'outputFormat'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      videoPath: { type: 'string' },
      videoUrl: { type: 'string' },
      thumbnailPath: { type: 'string' },
      durationSeconds: { type: 'number' },
      fileSize: { type: 'number' },
      photoCount: { type: 'number' },
      resolution: {
        type: 'object',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
        },
      },
    },
    required: ['videoPath', 'durationSeconds', 'fileSize', 'photoCount', 'resolution'],
  },

  defaultConfig: {
    timeout: 300000, // 5 minutes for video processing
    retries: 1,
  },

  validate: (input: SlideshowInput) => {
    const errors = []

    if (!input.photos || !Array.isArray(input.photos)) {
      errors.push({ field: 'photos', message: 'Photos array is required', code: 'REQUIRED' })
      return errors
    }

    if (input.photos.length === 0) {
      errors.push({ field: 'photos', message: 'At least one photo is required', code: 'INVALID' })
    }

    if (input.photos.length > 100) {
      errors.push({ field: 'photos', message: 'Maximum 100 photos allowed', code: 'INVALID' })
    }

    if (!input.aspectRatio) {
      errors.push({ field: 'aspectRatio', message: 'Aspect ratio is required', code: 'REQUIRED' })
    }

    const validRatios = ['16:9', '9:16', '1:1', '4:3']
    if (input.aspectRatio && !validRatios.includes(input.aspectRatio)) {
      errors.push({ field: 'aspectRatio', message: 'Invalid aspect ratio', code: 'INVALID' })
    }

    if (!input.transition) {
      errors.push({ field: 'transition', message: 'Transition type is required', code: 'REQUIRED' })
    }

    if (!input.outputFormat) {
      errors.push({ field: 'outputFormat', message: 'Output format is required', code: 'REQUIRED' })
    }

    if (input.photoDuration && (input.photoDuration < 1 || input.photoDuration > 30)) {
      errors.push({ field: 'photoDuration', message: 'Photo duration must be 1-30 seconds', code: 'INVALID' })
    }

    if (input.musicVolume && (input.musicVolume < 0 || input.musicVolume > 1)) {
      errors.push({ field: 'musicVolume', message: 'Music volume must be 0-1', code: 'INVALID' })
    }

    return errors
  },

  execute: async (input, context): Promise<SkillResult<SlideshowOutput>> => {
    const startTime = Date.now()

    try {
      const output = await generateSlideshow(input)

      return {
        success: true,
        data: output,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          provider: 'ffmpeg',
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      let errorCode = 'EXECUTION_ERROR'
      if (message.includes('not installed') || message.includes('not available')) {
        errorCode = 'FFMPEG_NOT_AVAILABLE'
      } else if (message.includes('Failed to download')) {
        errorCode = 'IMAGE_FETCH_ERROR'
      } else if (message.includes('timeout')) {
        errorCode = 'PROCESSING_TIMEOUT'
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

  estimateCost: async (input: SlideshowInput) => {
    // FFmpeg is free (self-hosted), but estimate compute cost
    // ~$0.001 per second of output video
    const photoCount = input.photos?.length || 0
    const duration = photoCount * (input.photoDuration || 3)
    return duration * 0.001
  },
}

export default slideshowSkill
