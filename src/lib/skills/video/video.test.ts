/**
 * Video Skills Tests
 *
 * Tests for FFmpeg-powered video generation skills:
 * - Slideshow
 * - Motion
 * - Audio Overlay
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeSkill } from '../executor'
import { registerSkill, clearRegistry } from '../registry'
import { slideshowSkill } from './slideshow'
import { motionSkill } from './motion'
import { audioOverlaySkill } from './audio'
import type { SlideshowInput, MotionInput, AudioOverlayInput } from './types'

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  }),
}))

// Mock the FFmpeg provider
const mockCheckFFmpegInstalled = vi.fn()
const mockDownloadToTemp = vi.fn()
const mockCleanupTempFile = vi.fn()
const mockGetTempFilePath = vi.fn()
const mockGetResolution = vi.fn()
const mockGetVideoMetadata = vi.fn()
const mockGetFileSize = vi.fn()
const mockCreateKenBurnsSlideshow = vi.fn()
const mockCreateFadeSlideshow = vi.fn()
const mockAddAudioToVideo = vi.fn()
const mockApplyMotionEffect = vi.fn()

vi.mock('./ffmpeg-provider', () => ({
  checkFFmpegInstalled: () => mockCheckFFmpegInstalled(),
  downloadToTemp: (...args: unknown[]) => mockDownloadToTemp(...args),
  cleanupTempFile: (...args: unknown[]) => mockCleanupTempFile(...args),
  getTempFilePath: (...args: unknown[]) => mockGetTempFilePath(...args),
  getResolution: (...args: unknown[]) => mockGetResolution(...args),
  getVideoMetadata: (...args: unknown[]) => mockGetVideoMetadata(...args),
  getFileSize: (...args: unknown[]) => mockGetFileSize(...args),
  createKenBurnsSlideshow: (...args: unknown[]) => mockCreateKenBurnsSlideshow(...args),
  createFadeSlideshow: (...args: unknown[]) => mockCreateFadeSlideshow(...args),
  addAudioToVideo: (...args: unknown[]) => mockAddAudioToVideo(...args),
  applyMotionEffect: (...args: unknown[]) => mockApplyMotionEffect(...args),
}))

// Mock fs for audio skill
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  default: {
    existsSync: vi.fn(() => true),
  },
}))

describe('Video Skills', () => {
  beforeEach(() => {
    clearRegistry()
    vi.clearAllMocks()

    // Default mock implementations
    mockCheckFFmpegInstalled.mockResolvedValue(true)
    mockDownloadToTemp.mockImplementation(async (url: string) => `/tmp/test_${Date.now()}.jpg`)
    mockCleanupTempFile.mockImplementation(() => undefined)
    mockGetTempFilePath.mockImplementation((ext: string) => `/tmp/output_${Date.now()}.${ext}`)
    mockGetResolution.mockReturnValue({ width: 1920, height: 1080 })
    mockGetVideoMetadata.mockResolvedValue({
      duration: 15,
      width: 1920,
      height: 1080,
      format: 'mp4',
      size: 5000000,
    })
    mockGetFileSize.mockReturnValue(5000000)
    mockCreateKenBurnsSlideshow.mockResolvedValue(undefined)
    mockCreateFadeSlideshow.mockResolvedValue(undefined)
    mockAddAudioToVideo.mockResolvedValue(undefined)
    mockApplyMotionEffect.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================
  // SLIDESHOW SKILL TESTS
  // ===========================================
  describe('Slideshow Skill', () => {
    beforeEach(() => {
      registerSkill(slideshowSkill)
    })

    it('should register with correct metadata', () => {
      expect(slideshowSkill.id).toBe('video-slideshow')
      expect(slideshowSkill.category).toBe('generate')
      expect(slideshowSkill.provider).toBe('ffmpeg')
    })

    it('should validate required fields', () => {
      const errors = slideshowSkill.validate!({} as SlideshowInput)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.field === 'photos')).toBe(true)
    })

    it('should validate empty photos array', () => {
      const errors = slideshowSkill.validate!({
        photos: [],
        aspectRatio: '16:9',
        photoDuration: 3,
        transition: 'fade',
        outputFormat: 'mp4',
      } as SlideshowInput)
      expect(errors.some(e => e.field === 'photos' && e.code === 'INVALID')).toBe(true)
    })

    it('should validate max photos limit', () => {
      const photos = Array(101).fill('https://example.com/photo.jpg')
      const errors = slideshowSkill.validate!({
        photos,
        aspectRatio: '16:9',
        photoDuration: 3,
        transition: 'fade',
        outputFormat: 'mp4',
      } as SlideshowInput)
      expect(errors.some(e => e.message.includes('Maximum 100'))).toBe(true)
    })

    it('should validate aspect ratio', () => {
      const errors = slideshowSkill.validate!({
        photos: ['https://example.com/photo.jpg'],
        aspectRatio: 'invalid' as SlideshowInput['aspectRatio'],
        photoDuration: 3,
        transition: 'fade',
        outputFormat: 'mp4',
      } as SlideshowInput)
      expect(errors.some(e => e.field === 'aspectRatio')).toBe(true)
    })

    it('should validate photo duration range', () => {
      const errors = slideshowSkill.validate!({
        photos: ['https://example.com/photo.jpg'],
        aspectRatio: '16:9',
        transition: 'fade',
        outputFormat: 'mp4',
        photoDuration: 60, // Too long
      } as SlideshowInput)
      expect(errors.some(e => e.field === 'photoDuration')).toBe(true)
    })

    it('should generate a slideshow with fade transition', async () => {
      const result = await executeSkill({
        skillId: 'video-slideshow',
        input: {
          photos: [
            'https://example.com/photo1.jpg',
            'https://example.com/photo2.jpg',
            'https://example.com/photo3.jpg',
          ],
          aspectRatio: '16:9',
          photoDuration: 3,
          transition: 'fade',
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as { videoPath: string; photoCount: number; durationSeconds: number }
      expect(data.videoPath).toBeDefined()
      expect(data.photoCount).toBe(3)
      expect(data.durationSeconds).toBeGreaterThan(0)
      expect(mockCreateFadeSlideshow).toHaveBeenCalled()
    })

    it('should generate a slideshow with kenburns transition', async () => {
      const result = await executeSkill({
        skillId: 'video-slideshow',
        input: {
          photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
          aspectRatio: '9:16',
          photoDuration: 5,
          transition: 'kenburns',
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(mockCreateKenBurnsSlideshow).toHaveBeenCalled()
    })

    it('should add music to slideshow', async () => {
      const result = await executeSkill({
        skillId: 'video-slideshow',
        input: {
          photos: ['https://example.com/photo1.jpg'],
          aspectRatio: '16:9',
          transition: 'fade',
          outputFormat: 'mp4',
          musicUrl: 'https://example.com/music.mp3',
          musicVolume: 0.7,
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(mockAddAudioToVideo).toHaveBeenCalled()
    })

    it('should handle FFmpeg not available', async () => {
      mockCheckFFmpegInstalled.mockResolvedValue(false)

      const result = await executeSkill({
        skillId: 'video-slideshow',
        input: {
          photos: ['https://example.com/photo1.jpg'],
          aspectRatio: '16:9',
          transition: 'fade',
          outputFormat: 'mp4',
        },
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('FFMPEG_NOT_AVAILABLE')
    })

    it('should handle download errors', async () => {
      mockDownloadToTemp.mockRejectedValue(new Error('Failed to download: network error'))

      const result = await executeSkill({
        skillId: 'video-slideshow',
        input: {
          photos: ['https://example.com/photo1.jpg'],
          aspectRatio: '16:9',
          transition: 'fade',
          outputFormat: 'mp4',
        },
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('IMAGE_FETCH_ERROR')
    })

    it('should estimate cost based on duration', async () => {
      const cost = await slideshowSkill.estimateCost!({
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
        aspectRatio: '16:9',
        transition: 'fade',
        outputFormat: 'mp4',
        photoDuration: 5,
      })
      // 3 photos * 5 seconds * $0.001 = $0.015
      expect(cost).toBe(0.015)
    })

    it('should clean up temp files after processing', async () => {
      await executeSkill({
        skillId: 'video-slideshow',
        input: {
          photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
          aspectRatio: '16:9',
          transition: 'fade',
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(mockCleanupTempFile).toHaveBeenCalled()
    })
  })

  // ===========================================
  // MOTION SKILL TESTS
  // ===========================================
  describe('Motion Skill', () => {
    beforeEach(() => {
      registerSkill(motionSkill)
    })

    it('should register with correct metadata', () => {
      expect(motionSkill.id).toBe('video-motion')
      expect(motionSkill.category).toBe('generate')
      expect(motionSkill.provider).toBe('ffmpeg')
    })

    it('should validate required fields', () => {
      const errors = motionSkill.validate!({} as MotionInput)
      expect(errors.some(e => e.field === 'imageUrl')).toBe(true)
      expect(errors.some(e => e.field === 'motionType')).toBe(true)
    })

    it('should validate motion type', () => {
      const errors = motionSkill.validate!({
        imageUrl: 'https://example.com/image.jpg',
        motionType: 'invalid' as MotionInput['motionType'],
        duration: 5,
        outputFormat: 'mp4',
      } as MotionInput)
      expect(errors.some(e => e.field === 'motionType')).toBe(true)
    })

    it('should validate duration range', () => {
      const errors = motionSkill.validate!({
        imageUrl: 'https://example.com/image.jpg',
        motionType: 'zoom_in',
        outputFormat: 'mp4',
        duration: 60, // Too long
      } as MotionInput)
      expect(errors.some(e => e.field === 'duration')).toBe(true)
    })

    it('should validate zoom factor range', () => {
      const errors = motionSkill.validate!({
        imageUrl: 'https://example.com/image.jpg',
        motionType: 'zoom_in',
        duration: 5,
        outputFormat: 'mp4',
        zoomFactor: 3.0, // Too high
      } as MotionInput)
      expect(errors.some(e => e.field === 'zoomFactor')).toBe(true)
    })

    it('should generate zoom in motion', async () => {
      const result = await executeSkill({
        skillId: 'video-motion',
        input: {
          imageUrl: 'https://example.com/image.jpg',
          motionType: 'zoom_in',
          duration: 5,
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as { videoPath: string; durationSeconds: number }
      expect(data.videoPath).toBeDefined()
      expect(data.durationSeconds).toBeGreaterThan(0)
      expect(mockApplyMotionEffect).toHaveBeenCalled()
    })

    it('should generate zoom out motion', async () => {
      await executeSkill({
        skillId: 'video-motion',
        input: {
          imageUrl: 'https://example.com/image.jpg',
          motionType: 'zoom_out',
          duration: 5,
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(mockApplyMotionEffect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ motionType: 'zoom_out' })
      )
    })

    it('should generate pan left motion', async () => {
      await executeSkill({
        skillId: 'video-motion',
        input: {
          imageUrl: 'https://example.com/image.jpg',
          motionType: 'pan_left',
          duration: 3,
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(mockApplyMotionEffect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ motionType: 'pan_left' })
      )
    })

    it('should generate kenburns motion', async () => {
      await executeSkill({
        skillId: 'video-motion',
        input: {
          imageUrl: 'https://example.com/image.jpg',
          motionType: 'kenburns',
          duration: 8,
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(mockApplyMotionEffect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ motionType: 'kenburns' })
      )
    })

    it('should apply custom zoom factor', async () => {
      await executeSkill({
        skillId: 'video-motion',
        input: {
          imageUrl: 'https://example.com/image.jpg',
          motionType: 'zoom_in',
          duration: 5,
          zoomFactor: 1.5,
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(mockApplyMotionEffect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ zoomFactor: 1.5 })
      )
    })

    it('should handle FFmpeg not available', async () => {
      mockCheckFFmpegInstalled.mockResolvedValue(false)

      const result = await executeSkill({
        skillId: 'video-motion',
        input: {
          imageUrl: 'https://example.com/image.jpg',
          motionType: 'zoom_in',
          outputFormat: 'mp4',
        },
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('FFMPEG_NOT_AVAILABLE')
    })

    it('should estimate cost based on duration', async () => {
      const cost = await motionSkill.estimateCost!({
        imageUrl: 'https://example.com/image.jpg',
        motionType: 'zoom_in',
        duration: 10,
        outputFormat: 'mp4',
      })
      expect(cost).toBe(0.01)
    })
  })

  // ===========================================
  // AUDIO OVERLAY SKILL TESTS
  // ===========================================
  describe('Audio Overlay Skill', () => {
    beforeEach(() => {
      registerSkill(audioOverlaySkill)
    })

    it('should register with correct metadata', () => {
      expect(audioOverlaySkill.id).toBe('video-audio')
      expect(audioOverlaySkill.category).toBe('transform')
      expect(audioOverlaySkill.provider).toBe('ffmpeg')
    })

    it('should validate required fields', () => {
      const errors = audioOverlaySkill.validate!({} as AudioOverlayInput)
      expect(errors.some(e => e.field === 'videoPath')).toBe(true)
      expect(errors.some(e => e.field === 'audioUrl')).toBe(true)
    })

    it('should validate volume range', () => {
      const errors = audioOverlaySkill.validate!({
        videoPath: '/path/to/video.mp4',
        audioUrl: 'https://example.com/music.mp3',
        outputFormat: 'mp4',
        volume: 1.5, // Too high
      } as AudioOverlayInput)
      expect(errors.some(e => e.field === 'volume')).toBe(true)
    })

    it('should validate fade values', () => {
      const errors = audioOverlaySkill.validate!({
        videoPath: '/path/to/video.mp4',
        audioUrl: 'https://example.com/music.mp3',
        outputFormat: 'mp4',
        fadeIn: -1, // Negative
      } as AudioOverlayInput)
      expect(errors.some(e => e.field === 'fadeIn')).toBe(true)
    })

    it('should add audio to video', async () => {
      const result = await executeSkill({
        skillId: 'video-audio',
        input: {
          videoPath: '/path/to/video.mp4',
          audioUrl: 'https://example.com/music.mp3',
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as { videoPath: string; hasAudio: boolean }
      expect(data.videoPath).toBeDefined()
      expect(data.hasAudio).toBe(true)
      expect(mockAddAudioToVideo).toHaveBeenCalled()
    })

    it('should apply volume setting', async () => {
      await executeSkill({
        skillId: 'video-audio',
        input: {
          videoPath: '/path/to/video.mp4',
          audioUrl: 'https://example.com/music.mp3',
          outputFormat: 'mp4',
          volume: 0.3,
        },
        skipLogging: true,
      })

      expect(mockAddAudioToVideo).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ volume: 0.3 })
      )
    })

    it('should apply fade settings', async () => {
      await executeSkill({
        skillId: 'video-audio',
        input: {
          videoPath: '/path/to/video.mp4',
          audioUrl: 'https://example.com/music.mp3',
          outputFormat: 'mp4',
          fadeIn: 2,
          fadeOut: 3,
        },
        skipLogging: true,
      })

      expect(mockAddAudioToVideo).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ fadeIn: 2, fadeOut: 3 })
      )
    })

    it('should handle loop option', async () => {
      await executeSkill({
        skillId: 'video-audio',
        input: {
          videoPath: '/path/to/video.mp4',
          audioUrl: 'https://example.com/music.mp3',
          outputFormat: 'mp4',
          loop: true,
        },
        skipLogging: true,
      })

      expect(mockAddAudioToVideo).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ loop: true })
      )
    })

    it('should handle FFmpeg not available', async () => {
      mockCheckFFmpegInstalled.mockResolvedValue(false)

      const result = await executeSkill({
        skillId: 'video-audio',
        input: {
          videoPath: '/path/to/video.mp4',
          audioUrl: 'https://example.com/music.mp3',
          outputFormat: 'mp4',
        },
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('FFMPEG_NOT_AVAILABLE')
    })

    it('should estimate cost', async () => {
      const cost = await audioOverlaySkill.estimateCost!({
        videoPath: '/path/to/video.mp4',
        audioUrl: 'https://example.com/music.mp3',
        outputFormat: 'mp4',
      })
      expect(cost).toBe(0.002)
    })
  })

  // ===========================================
  // INTEGRATION TESTS
  // ===========================================
  describe('Video Skills Integration', () => {
    beforeEach(() => {
      registerSkill(slideshowSkill)
      registerSkill(motionSkill)
      registerSkill(audioOverlaySkill)
    })

    it('should register all three skills', () => {
      expect(slideshowSkill.id).toBe('video-slideshow')
      expect(motionSkill.id).toBe('video-motion')
      expect(audioOverlaySkill.id).toBe('video-audio')
    })

    it('should include provider metadata in results', async () => {
      const result = await executeSkill({
        skillId: 'video-slideshow',
        input: {
          photos: ['https://example.com/photo.jpg'],
          aspectRatio: '16:9',
          transition: 'fade',
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(result.metadata.provider).toBe('ffmpeg')
    })

    it('should handle validation errors before processing', async () => {
      const result = await executeSkill({
        skillId: 'video-slideshow',
        input: {
          photos: [],
          aspectRatio: '16:9',
          transition: 'fade',
          outputFormat: 'mp4',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_ERROR')
      // FFmpeg should not be called for validation errors
      expect(mockCreateFadeSlideshow).not.toHaveBeenCalled()
    })
  })
})
