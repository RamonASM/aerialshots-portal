/**
 * Video Skills Types
 *
 * Type definitions for FFmpeg-powered video generation skills.
 */

/**
 * Aspect ratio for video output
 */
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3'

/**
 * Transition type between photos
 */
export type TransitionType = 'fade' | 'slide' | 'zoom' | 'kenburns' | 'none'

/**
 * Motion effect type
 */
export type MotionType = 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'kenburns'

/**
 * Output video format
 */
export type VideoFormat = 'mp4' | 'webm' | 'mov'

/**
 * Audio fade type
 */
export type AudioFade = 'in' | 'out' | 'both' | 'none'

/**
 * Photo/image input for slideshow
 */
export interface SlideshowPhoto {
  url: string
  duration?: number  // Override default duration for this photo
  caption?: string   // Optional caption to overlay
}

/**
 * Slideshow skill input
 */
export interface SlideshowInput {
  photos: SlideshowPhoto[] | string[]  // URLs or photo objects
  aspectRatio: AspectRatio
  photoDuration: number        // seconds per photo (default: 3)
  transition: TransitionType
  transitionDuration?: number  // seconds (default: 0.5)
  outputFormat: VideoFormat
  musicUrl?: string            // Optional background music
  musicVolume?: number         // 0-1 (default: 0.5)
  outputPath?: string          // Optional custom output path
}

/**
 * Slideshow skill output
 */
export interface SlideshowOutput {
  videoPath: string
  videoUrl?: string    // If uploaded to storage
  thumbnailPath?: string
  durationSeconds: number
  fileSize: number
  photoCount: number
  resolution: {
    width: number
    height: number
  }
}

/**
 * Motion effect input for a single image
 */
export interface MotionInput {
  imageUrl: string
  motionType: MotionType
  duration: number        // seconds (default: 5)
  zoomFactor?: number     // For zoom effects (default: 1.2)
  outputFormat: VideoFormat
  outputPath?: string
}

/**
 * Motion effect output
 */
export interface MotionOutput {
  videoPath: string
  videoUrl?: string
  thumbnailPath?: string
  durationSeconds: number
  fileSize: number
  resolution: {
    width: number
    height: number
  }
}

/**
 * Audio overlay input
 */
export interface AudioOverlayInput {
  videoPath: string
  audioUrl: string
  volume?: number         // 0-1 (default: 0.5)
  fadeIn?: number         // seconds
  fadeOut?: number        // seconds
  startTime?: number      // Start audio at this point (seconds)
  loop?: boolean          // Loop audio to match video length
  outputFormat: VideoFormat
  outputPath?: string
}

/**
 * Audio overlay output
 */
export interface AudioOverlayOutput {
  videoPath: string
  videoUrl?: string
  durationSeconds: number
  fileSize: number
  hasAudio: boolean
}

/**
 * Video encode/transcode input
 */
export interface EncodeInput {
  inputPath: string
  outputFormat: VideoFormat
  aspectRatio?: AspectRatio
  resolution?: {
    width: number
    height: number
  }
  bitrate?: string       // e.g., '5000k'
  fps?: number           // Frames per second
  outputPath?: string
}

/**
 * Video encode output
 */
export interface EncodeOutput {
  videoPath: string
  videoUrl?: string
  durationSeconds: number
  fileSize: number
  resolution: {
    width: number
    height: number
  }
  format: VideoFormat
}

/**
 * Thumbnail generation input
 */
export interface ThumbnailInput {
  videoPath: string
  time?: number          // Time in seconds to capture (default: first frame)
  width?: number
  height?: number
  outputPath?: string
}

/**
 * Thumbnail generation output
 */
export interface ThumbnailOutput {
  thumbnailPath: string
  thumbnailUrl?: string
  width: number
  height: number
  fileSize: number
}

/**
 * Resolution presets based on aspect ratio
 */
export const RESOLUTION_PRESETS: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:3': { width: 1440, height: 1080 },
}

/**
 * FFmpeg processing options
 */
export interface FFmpegOptions {
  timeout?: number       // Processing timeout in ms
  tempDir?: string       // Temp directory for intermediate files
  quality?: 'low' | 'medium' | 'high' | 'max'
  verbose?: boolean      // Enable verbose logging
}
