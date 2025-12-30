/**
 * Motion Skill
 *
 * Creates motion videos from a single image using Ken Burns
 * and other zoom/pan effects with FFmpeg.
 */

import type { SkillDefinition, SkillResult } from '../types'
import type { MotionInput, MotionOutput, MotionType } from './types'
import {
  checkFFmpegInstalled,
  downloadToTemp,
  cleanupTempFile,
  getTempFilePath,
  getResolution,
  getVideoMetadata,
  getFileSize,
  applyMotionEffect,
} from './ffmpeg-provider'

/**
 * Generate motion video from single image
 */
async function generateMotion(input: MotionInput): Promise<MotionOutput> {
  // Check FFmpeg availability
  const ffmpegAvailable = await checkFFmpegInstalled()
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not installed or not available in PATH')
  }

  const duration = input.duration || 5
  const zoomFactor = input.zoomFactor || 1.2
  const outputFormat = input.outputFormat || 'mp4'

  // Default to 16:9 resolution for motion effects
  const resolution = { width: 1920, height: 1080 }

  // Download image to temp storage
  const imagePath = await downloadToTemp(input.imageUrl)

  try {
    // Generate output path
    const outputPath = input.outputPath || getTempFilePath(outputFormat)

    // Apply motion effect
    await applyMotionEffect(imagePath, outputPath, {
      motionType: input.motionType,
      duration,
      resolution,
      zoomFactor,
    })

    // Get video metadata
    const metadata = await getVideoMetadata(outputPath)
    const fileSize = getFileSize(outputPath)

    return {
      videoPath: outputPath,
      durationSeconds: metadata.duration,
      fileSize,
      resolution: {
        width: metadata.width,
        height: metadata.height,
      },
    }
  } finally {
    // Clean up downloaded image
    cleanupTempFile(imagePath)
  }
}

/**
 * Motion Skill Definition
 */
export const motionSkill: SkillDefinition<MotionInput, MotionOutput> = {
  id: 'video-motion',
  name: 'Video Motion',
  description: 'Create motion video from a single image with zoom and pan effects',
  category: 'generate',
  version: '1.0.0',
  provider: 'ffmpeg',

  inputSchema: {
    type: 'object',
    properties: {
      imageUrl: { type: 'string', description: 'URL of the source image' },
      motionType: {
        type: 'string',
        enum: ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'kenburns'],
        description: 'Type of motion effect to apply',
      },
      duration: { type: 'number', description: 'Duration of output video in seconds' },
      zoomFactor: { type: 'number', description: 'Zoom factor for zoom effects (default: 1.2)' },
      outputFormat: { type: 'string', enum: ['mp4', 'webm', 'mov'] },
    },
    required: ['imageUrl', 'motionType', 'outputFormat'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      videoPath: { type: 'string' },
      videoUrl: { type: 'string' },
      thumbnailPath: { type: 'string' },
      durationSeconds: { type: 'number' },
      fileSize: { type: 'number' },
      resolution: {
        type: 'object',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
        },
      },
    },
    required: ['videoPath', 'durationSeconds', 'fileSize', 'resolution'],
  },

  defaultConfig: {
    timeout: 120000, // 2 minutes for single image
    retries: 1,
  },

  validate: (input: MotionInput) => {
    const errors = []

    if (!input.imageUrl) {
      errors.push({ field: 'imageUrl', message: 'Image URL is required', code: 'REQUIRED' })
    }

    if (!input.motionType) {
      errors.push({ field: 'motionType', message: 'Motion type is required', code: 'REQUIRED' })
    }

    const validMotionTypes: MotionType[] = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'kenburns']
    if (input.motionType && !validMotionTypes.includes(input.motionType)) {
      errors.push({ field: 'motionType', message: 'Invalid motion type', code: 'INVALID' })
    }

    if (!input.outputFormat) {
      errors.push({ field: 'outputFormat', message: 'Output format is required', code: 'REQUIRED' })
    }

    if (input.duration && (input.duration < 1 || input.duration > 30)) {
      errors.push({ field: 'duration', message: 'Duration must be 1-30 seconds', code: 'INVALID' })
    }

    if (input.zoomFactor && (input.zoomFactor < 1.0 || input.zoomFactor > 2.0)) {
      errors.push({ field: 'zoomFactor', message: 'Zoom factor must be 1.0-2.0', code: 'INVALID' })
    }

    return errors
  },

  execute: async (input, context): Promise<SkillResult<MotionOutput>> => {
    const startTime = Date.now()

    try {
      const output = await generateMotion(input)

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

  estimateCost: async (input: MotionInput) => {
    // FFmpeg is free, estimate compute cost
    const duration = input.duration || 5
    return duration * 0.001
  },
}

export default motionSkill
