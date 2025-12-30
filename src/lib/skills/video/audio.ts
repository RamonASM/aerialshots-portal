/**
 * Audio Overlay Skill
 *
 * Adds audio/music to existing video files using FFmpeg.
 */

import type { SkillDefinition, SkillResult } from '../types'
import type { AudioOverlayInput, AudioOverlayOutput } from './types'
import {
  checkFFmpegInstalled,
  downloadToTemp,
  cleanupTempFile,
  getTempFilePath,
  getVideoMetadata,
  getFileSize,
  addAudioToVideo,
} from './ffmpeg-provider'
import * as fs from 'fs'

/**
 * Add audio overlay to video
 */
async function addAudioOverlay(input: AudioOverlayInput): Promise<AudioOverlayOutput> {
  // Check FFmpeg availability
  const ffmpegAvailable = await checkFFmpegInstalled()
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not installed or not available in PATH')
  }

  const volume = input.volume ?? 0.5
  const fadeIn = input.fadeIn ?? 1
  const fadeOut = input.fadeOut ?? 2
  const loop = input.loop ?? true
  const outputFormat = input.outputFormat || 'mp4'

  // Check if video path is local or URL
  let videoPath = input.videoPath
  let shouldCleanupVideo = false

  if (input.videoPath.startsWith('http')) {
    videoPath = await downloadToTemp(input.videoPath)
    shouldCleanupVideo = true
  } else if (!fs.existsSync(input.videoPath)) {
    throw new Error(`Video file not found: ${input.videoPath}`)
  }

  // Download audio
  const audioPath = await downloadToTemp(input.audioUrl)

  try {
    // Get video duration for fade out timing
    const videoMeta = await getVideoMetadata(videoPath)

    // Generate output path
    const outputPath = input.outputPath || getTempFilePath(outputFormat)

    // Add audio to video
    await addAudioToVideo(videoPath, audioPath, outputPath, {
      volume,
      fadeIn,
      fadeOut,
      loop,
      videoDuration: videoMeta.duration,
    })

    // Get output metadata
    const outputMeta = await getVideoMetadata(outputPath)
    const fileSize = getFileSize(outputPath)

    return {
      videoPath: outputPath,
      durationSeconds: outputMeta.duration,
      fileSize,
      hasAudio: true,
    }
  } finally {
    // Clean up downloaded files
    cleanupTempFile(audioPath)
    if (shouldCleanupVideo) {
      cleanupTempFile(videoPath)
    }
  }
}

/**
 * Audio Overlay Skill Definition
 */
export const audioOverlaySkill: SkillDefinition<AudioOverlayInput, AudioOverlayOutput> = {
  id: 'video-audio',
  name: 'Video Audio Overlay',
  description: 'Add background music or audio to a video file',
  category: 'transform',
  version: '1.0.0',
  provider: 'ffmpeg',

  inputSchema: {
    type: 'object',
    properties: {
      videoPath: { type: 'string', description: 'Path or URL to the source video' },
      audioUrl: { type: 'string', description: 'URL of the audio file to overlay' },
      volume: { type: 'number', description: 'Audio volume (0-1, default: 0.5)' },
      fadeIn: { type: 'number', description: 'Fade in duration in seconds' },
      fadeOut: { type: 'number', description: 'Fade out duration in seconds' },
      startTime: { type: 'number', description: 'Start audio at this time (seconds)' },
      loop: { type: 'boolean', description: 'Loop audio to match video length' },
      outputFormat: { type: 'string', enum: ['mp4', 'webm', 'mov'] },
    },
    required: ['videoPath', 'audioUrl', 'outputFormat'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      videoPath: { type: 'string' },
      videoUrl: { type: 'string' },
      durationSeconds: { type: 'number' },
      fileSize: { type: 'number' },
      hasAudio: { type: 'boolean' },
    },
    required: ['videoPath', 'durationSeconds', 'fileSize', 'hasAudio'],
  },

  defaultConfig: {
    timeout: 180000, // 3 minutes
    retries: 1,
  },

  validate: (input: AudioOverlayInput) => {
    const errors = []

    if (!input.videoPath) {
      errors.push({ field: 'videoPath', message: 'Video path is required', code: 'REQUIRED' })
    }

    if (!input.audioUrl) {
      errors.push({ field: 'audioUrl', message: 'Audio URL is required', code: 'REQUIRED' })
    }

    if (!input.outputFormat) {
      errors.push({ field: 'outputFormat', message: 'Output format is required', code: 'REQUIRED' })
    }

    if (input.volume !== undefined && (input.volume < 0 || input.volume > 1)) {
      errors.push({ field: 'volume', message: 'Volume must be 0-1', code: 'INVALID' })
    }

    if (input.fadeIn !== undefined && input.fadeIn < 0) {
      errors.push({ field: 'fadeIn', message: 'Fade in must be non-negative', code: 'INVALID' })
    }

    if (input.fadeOut !== undefined && input.fadeOut < 0) {
      errors.push({ field: 'fadeOut', message: 'Fade out must be non-negative', code: 'INVALID' })
    }

    return errors
  },

  execute: async (input, context): Promise<SkillResult<AudioOverlayOutput>> => {
    const startTime = Date.now()

    try {
      const output = await addAudioOverlay(input)

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
        errorCode = 'AUDIO_FETCH_ERROR'
      } else if (message.includes('not found')) {
        errorCode = 'VIDEO_NOT_FOUND'
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

  estimateCost: async (input: AudioOverlayInput) => {
    // FFmpeg is free, minimal compute cost
    return 0.002
  },
}

export default audioOverlaySkill
