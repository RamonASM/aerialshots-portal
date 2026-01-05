/**
 * ASM Media Storage Service Tests
 *
 * Tests for native media storage replacing Aryeo CDN.
 * Uses Supabase Storage with organized bucket structure.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock functions need to be defined before the vi.mock call
const mockUpload = vi.fn()
const mockRemove = vi.fn()
const mockGetPublicUrl = vi.fn()
const mockCreateSignedUrl = vi.fn()
const mockList = vi.fn()
const mockDownload = vi.fn()
const mockMove = vi.fn()
const mockCopy = vi.fn()
const mockCreateSignedUrls = vi.fn()
const mockFrom = vi.fn(() => ({
  upload: mockUpload,
  remove: mockRemove,
  getPublicUrl: mockGetPublicUrl,
  createSignedUrl: mockCreateSignedUrl,
  createSignedUrls: mockCreateSignedUrls,
  list: mockList,
  download: mockDownload,
  move: mockMove,
  copy: mockCopy,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: mockFrom,
    },
  }),
}))

// Import after mock is set up
import {
  MediaStorageService,
  type MediaUploadOptions,
  type MediaType,
  getMediaBucket,
  generateStoragePath,
  getPublicUrl,
  validateMediaFile,
} from './media'

describe('Media Storage Service', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('getMediaBucket', () => {
    it('should return photos bucket for photo type', () => {
      expect(getMediaBucket('photo')).toBe('listing-photos')
    })

    it('should return videos bucket for video type', () => {
      expect(getMediaBucket('video')).toBe('listing-videos')
    })

    it('should return floor-plans bucket for floor_plan type', () => {
      expect(getMediaBucket('floor_plan')).toBe('floor-plans')
    })

    it('should return documents bucket for document type', () => {
      expect(getMediaBucket('document')).toBe('listing-documents')
    })

    it('should return virtual-staging bucket for virtual_staging type', () => {
      expect(getMediaBucket('virtual_staging')).toBe('virtual-staging')
    })

    it('should return drone bucket for drone type', () => {
      expect(getMediaBucket('drone')).toBe('drone-media')
    })

    it('should return twilight bucket for twilight type', () => {
      expect(getMediaBucket('twilight')).toBe('twilight-photos')
    })

    it('should return default bucket for unknown type', () => {
      expect(getMediaBucket('unknown' as MediaType)).toBe('listing-media')
    })
  })

  describe('generateStoragePath', () => {
    it('should generate path with listing ID', () => {
      const path = generateStoragePath('lst_123', 'photo', 'test.jpg')
      expect(path).toMatch(/^lst_123\/photos\/\d+-[a-z0-9]+\.jpg$/)
    })

    it('should generate path for videos', () => {
      const path = generateStoragePath('lst_456', 'video', 'tour.mp4')
      expect(path).toMatch(/^lst_456\/videos\/\d+-[a-z0-9]+\.mp4$/)
    })

    it('should generate path for floor plans', () => {
      const path = generateStoragePath('lst_789', 'floor_plan', 'plan.pdf')
      expect(path).toMatch(/^lst_789\/floor_plans\/\d+-[a-z0-9]+\.pdf$/)
    })

    it('should preserve file extension', () => {
      const jpgPath = generateStoragePath('lst_1', 'photo', 'image.jpg')
      const pngPath = generateStoragePath('lst_1', 'photo', 'image.png')
      const webpPath = generateStoragePath('lst_1', 'photo', 'image.webp')

      expect(jpgPath).toMatch(/\.jpg$/)
      expect(pngPath).toMatch(/\.png$/)
      expect(webpPath).toMatch(/\.webp$/)
    })

    it('should handle files without extension', () => {
      const path = generateStoragePath('lst_1', 'photo', 'noextension')
      expect(path).toMatch(/\.bin$/)
    })

    it('should include category in path when provided', () => {
      const path = generateStoragePath('lst_123', 'photo', 'kitchen.jpg', 'interior')
      expect(path).toMatch(/^lst_123\/photos\/interior\/\d+-[a-z0-9]+\.jpg$/)
    })
  })

  describe('getPublicUrl', () => {
    it('should construct public URL from bucket and path', () => {
      const url = getPublicUrl('listing-photos', 'lst_123/photos/abc.jpg')
      expect(url).toBe(
        'https://test.supabase.co/storage/v1/object/public/listing-photos/lst_123/photos/abc.jpg'
      )
    })

    it('should handle paths with special characters', () => {
      const url = getPublicUrl('listing-photos', 'lst_123/photos/image (1).jpg')
      expect(url).toContain('lst_123/photos/image (1).jpg')
    })
  })

  describe('validateMediaFile', () => {
    it('should validate photo files', () => {
      const result = validateMediaFile(
        { name: 'test.jpg', type: 'image/jpeg', size: 5 * 1024 * 1024 },
        'photo'
      )
      expect(result.valid).toBe(true)
    })

    it('should reject photos over 50MB', () => {
      const result = validateMediaFile(
        { name: 'large.jpg', type: 'image/jpeg', size: 60 * 1024 * 1024 },
        'photo'
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('50MB')
    })

    it('should validate video files', () => {
      const result = validateMediaFile(
        { name: 'tour.mp4', type: 'video/mp4', size: 500 * 1024 * 1024 },
        'video'
      )
      expect(result.valid).toBe(true)
    })

    it('should reject videos over 2GB', () => {
      const result = validateMediaFile(
        { name: 'large.mp4', type: 'video/mp4', size: 3 * 1024 * 1024 * 1024 },
        'video'
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('2GB')
    })

    it('should reject invalid photo MIME types', () => {
      const result = validateMediaFile(
        { name: 'test.exe', type: 'application/x-msdownload', size: 1024 },
        'photo'
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('type')
    })

    it('should allow HEIC for photos', () => {
      const result = validateMediaFile(
        { name: 'iphone.heic', type: 'image/heic', size: 10 * 1024 * 1024 },
        'photo'
      )
      expect(result.valid).toBe(true)
    })

    it('should allow PDFs for floor plans', () => {
      const result = validateMediaFile(
        { name: 'floor.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 },
        'floor_plan'
      )
      expect(result.valid).toBe(true)
    })

    it('should validate document files', () => {
      const result = validateMediaFile(
        { name: 'report.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 },
        'document'
      )
      expect(result.valid).toBe(true)
    })
  })

  describe('MediaStorageService', () => {
    let service: MediaStorageService

    beforeEach(() => {
      service = new MediaStorageService()
    })

    describe('upload', () => {
      it('should upload a photo successfully', async () => {
        mockUpload.mockResolvedValueOnce({
          data: { path: 'lst_123/photos/123-abc.jpg' },
          error: null,
        })
        mockGetPublicUrl.mockReturnValueOnce({
          data: { publicUrl: 'https://cdn.example.com/photo.jpg' },
        })

        const options: MediaUploadOptions = {
          listingId: 'lst_123',
          type: 'photo',
          file: Buffer.from('test image data'),
          filename: 'exterior.jpg',
          contentType: 'image/jpeg',
        }

        const result = await service.upload(options)

        expect(result.success).toBe(true)
        expect(result.media).toBeDefined()
        expect(result.media?.type).toBe('photo')
        expect(result.media?.url).toBeDefined()
        expect(mockFrom).toHaveBeenCalledWith('listing-photos')
      })

      it('should upload a video to videos bucket', async () => {
        mockUpload.mockResolvedValueOnce({
          data: { path: 'lst_123/videos/123-abc.mp4' },
          error: null,
        })
        mockGetPublicUrl.mockReturnValueOnce({
          data: { publicUrl: 'https://cdn.example.com/video.mp4' },
        })

        const options: MediaUploadOptions = {
          listingId: 'lst_123',
          type: 'video',
          file: Buffer.from('test video data'),
          filename: 'tour.mp4',
          contentType: 'video/mp4',
        }

        const result = await service.upload(options)

        expect(result.success).toBe(true)
        expect(mockFrom).toHaveBeenCalledWith('listing-videos')
      })

      it('should include category in path', async () => {
        mockUpload.mockResolvedValueOnce({
          data: { path: 'lst_123/photos/interior/123-abc.jpg' },
          error: null,
        })
        mockGetPublicUrl.mockReturnValueOnce({
          data: { publicUrl: 'https://cdn.example.com/photo.jpg' },
        })

        const options: MediaUploadOptions = {
          listingId: 'lst_123',
          type: 'photo',
          file: Buffer.from('test'),
          filename: 'kitchen.jpg',
          contentType: 'image/jpeg',
          category: 'interior',
        }

        await service.upload(options)

        expect(mockUpload).toHaveBeenCalledWith(
          expect.stringContaining('/interior/'),
          expect.any(Buffer),
          expect.any(Object)
        )
      })

      it('should handle upload errors', async () => {
        mockUpload.mockResolvedValueOnce({
          data: null,
          error: { message: 'Storage quota exceeded' },
        })

        const options: MediaUploadOptions = {
          listingId: 'lst_123',
          type: 'photo',
          file: Buffer.from('test'),
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        }

        const result = await service.upload(options)

        expect(result.success).toBe(false)
        expect(result.error).toContain('quota')
      })

      it('should set correct content type', async () => {
        mockUpload.mockResolvedValueOnce({
          data: { path: 'test.jpg' },
          error: null,
        })
        mockGetPublicUrl.mockReturnValueOnce({
          data: { publicUrl: 'https://cdn.example.com/photo.jpg' },
        })

        await service.upload({
          listingId: 'lst_123',
          type: 'photo',
          file: Buffer.from('test'),
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })

        expect(mockUpload).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Buffer),
          expect.objectContaining({ contentType: 'image/jpeg' })
        )
      })

      it('should store metadata when provided', async () => {
        mockUpload.mockResolvedValueOnce({
          data: { path: 'test.jpg' },
          error: null,
        })
        mockGetPublicUrl.mockReturnValueOnce({
          data: { publicUrl: 'https://cdn.example.com/photo.jpg' },
        })

        const result = await service.upload({
          listingId: 'lst_123',
          type: 'photo',
          file: Buffer.from('test'),
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
          metadata: {
            width: 1920,
            height: 1080,
            camera: 'DJI Mavic 3',
          },
        })

        expect(result.media?.metadata).toEqual({
          width: 1920,
          height: 1080,
          camera: 'DJI Mavic 3',
        })
      })
    })

    describe('uploadFromUrl', () => {
      it('should fetch and upload from URL', async () => {
        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: new Map([['content-type', 'image/jpeg']]),
        })
        global.fetch = mockFetch

        mockUpload.mockResolvedValueOnce({
          data: { path: 'lst_123/photos/123-abc.jpg' },
          error: null,
        })
        mockGetPublicUrl.mockReturnValueOnce({
          data: { publicUrl: 'https://cdn.example.com/photo.jpg' },
        })

        const result = await service.uploadFromUrl({
          listingId: 'lst_123',
          type: 'photo',
          sourceUrl: 'https://aryeo.com/photo.jpg',
          filename: 'migrated.jpg',
        })

        expect(result.success).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith('https://aryeo.com/photo.jpg')
      })

      it('should handle fetch errors', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: false,
          status: 404,
        })

        const result = await service.uploadFromUrl({
          listingId: 'lst_123',
          type: 'photo',
          sourceUrl: 'https://example.com/missing.jpg',
          filename: 'photo.jpg',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('fetch')
      })
    })

    describe('delete', () => {
      it('should delete a file from storage', async () => {
        mockRemove.mockResolvedValueOnce({ error: null })

        const result = await service.delete('listing-photos', 'lst_123/photos/abc.jpg')

        expect(result.success).toBe(true)
        expect(mockFrom).toHaveBeenCalledWith('listing-photos')
        expect(mockRemove).toHaveBeenCalledWith(['lst_123/photos/abc.jpg'])
      })

      it('should handle delete errors', async () => {
        mockRemove.mockResolvedValueOnce({
          error: { message: 'File not found' },
        })

        const result = await service.delete('listing-photos', 'missing.jpg')

        expect(result.success).toBe(false)
        expect(result.error).toContain('not found')
      })
    })

    describe('getSignedUrl', () => {
      it('should generate signed URL for private access', async () => {
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: 'https://cdn.example.com/photo.jpg?token=xyz' },
          error: null,
        })

        const result = await service.getSignedUrl(
          'listing-photos',
          'lst_123/photos/abc.jpg',
          3600
        )

        expect(result).toBe('https://cdn.example.com/photo.jpg?token=xyz')
        expect(mockCreateSignedUrl).toHaveBeenCalledWith('lst_123/photos/abc.jpg', 3600)
      })

      it('should return null on error', async () => {
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: null,
          error: { message: 'Invalid path' },
        })

        const result = await service.getSignedUrl(
          'listing-photos',
          'invalid.jpg',
          3600
        )

        expect(result).toBeNull()
      })
    })

    describe('listByListing', () => {
      it('should list all media for a listing', async () => {
        const mockListLocal = vi.fn().mockResolvedValueOnce({
          data: [
            { name: 'photo1.jpg', metadata: { size: 1024 } },
            { name: 'photo2.jpg', metadata: { size: 2048 } },
          ],
          error: null,
        })
        mockFrom.mockReturnValueOnce({
          upload: mockUpload,
          remove: mockRemove,
          getPublicUrl: mockGetPublicUrl,
          createSignedUrl: mockCreateSignedUrl,
          createSignedUrls: mockCreateSignedUrls,
          list: mockListLocal,
          download: mockDownload,
          move: mockMove,
          copy: mockCopy,
        })

        const result = await service.listByListing('lst_123', 'photo')

        expect(result.length).toBe(2)
        expect(mockListLocal).toHaveBeenCalledWith('lst_123/photos')
      })
    })

    describe('migrateFromAryeo', () => {
      it('should migrate media from Aryeo URL to native storage', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: new Map([['content-type', 'image/jpeg']]),
        })

        mockUpload.mockResolvedValueOnce({
          data: { path: 'lst_123/photos/migrated.jpg' },
          error: null,
        })
        mockGetPublicUrl.mockReturnValueOnce({
          data: { publicUrl: 'https://cdn.asm.com/photo.jpg' },
        })

        const result = await service.migrateFromAryeo({
          listingId: 'lst_123',
          aryeoUrl: 'https://cdn.aryeo.com/photo-abc123.jpg',
          type: 'photo',
        })

        expect(result.success).toBe(true)
        expect(result.newUrl).toBeDefined()
        expect(result.newUrl).not.toContain('aryeo')
      })

      it('should preserve original metadata during migration', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: new Map([['content-type', 'image/jpeg']]),
        })

        mockUpload.mockResolvedValueOnce({
          data: { path: 'test.jpg' },
          error: null,
        })
        mockGetPublicUrl.mockReturnValueOnce({
          data: { publicUrl: 'https://cdn.example.com/photo.jpg' },
        })

        const result = await service.migrateFromAryeo({
          listingId: 'lst_123',
          aryeoUrl: 'https://cdn.aryeo.com/photo.jpg',
          type: 'photo',
          originalMetadata: {
            capturedAt: '2024-01-15',
            photographer: 'John Doe',
          },
        })

        expect(result.success).toBe(true)
        expect(result.metadata).toEqual({
          capturedAt: '2024-01-15',
          photographer: 'John Doe',
          migratedFrom: 'aryeo',
        })
      })
    })
  })

  describe('Bucket Configuration', () => {
    it('should have correct bucket for each media type', () => {
      const buckets: Record<MediaType, string> = {
        photo: 'listing-photos',
        video: 'listing-videos',
        floor_plan: 'floor-plans',
        document: 'listing-documents',
        virtual_staging: 'virtual-staging',
        drone: 'drone-media',
        twilight: 'twilight-photos',
        '3d_tour': '3d-tours',
        matterport: 'matterport-tours',
      }

      for (const [type, expectedBucket] of Object.entries(buckets)) {
        expect(getMediaBucket(type as MediaType)).toBe(expectedBucket)
      }
    })
  })

  describe('File Size Limits', () => {
    const testCases: Array<{ type: MediaType; maxMB: number }> = [
      { type: 'photo', maxMB: 50 },
      { type: 'video', maxMB: 2048 },
      { type: 'floor_plan', maxMB: 100 },
      { type: 'document', maxMB: 50 },
      { type: 'drone', maxMB: 50 },
      { type: 'twilight', maxMB: 50 },
      { type: 'virtual_staging', maxMB: 50 },
    ]

    testCases.forEach(({ type, maxMB }) => {
      it(`should enforce ${maxMB}MB limit for ${type}`, () => {
        const oversizedFile = {
          name: 'large.file',
          type: type === 'video' ? 'video/mp4' : 'image/jpeg',
          size: (maxMB + 1) * 1024 * 1024,
        }

        const result = validateMediaFile(oversizedFile, type)
        expect(result.valid).toBe(false)
      })
    })
  })

  describe('MIME Type Validation', () => {
    describe('photo types', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff']

      validTypes.forEach((mimeType) => {
        it(`should accept ${mimeType} for photos`, () => {
          const result = validateMediaFile(
            { name: 'test', type: mimeType, size: 1024 },
            'photo'
          )
          expect(result.valid).toBe(true)
        })
      })
    })

    describe('video types', () => {
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

      validTypes.forEach((mimeType) => {
        it(`should accept ${mimeType} for videos`, () => {
          const result = validateMediaFile(
            { name: 'test', type: mimeType, size: 1024 },
            'video'
          )
          expect(result.valid).toBe(true)
        })
      })
    })

    describe('floor plan types', () => {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml']

      validTypes.forEach((mimeType) => {
        it(`should accept ${mimeType} for floor plans`, () => {
          const result = validateMediaFile(
            { name: 'test', type: mimeType, size: 1024 },
            'floor_plan'
          )
          expect(result.valid).toBe(true)
        })
      })
    })
  })

  describe('Path Safety', () => {
    it('should not allow path traversal in listing ID', () => {
      const path = generateStoragePath('../../../etc', 'photo', 'passwd')
      expect(path).not.toContain('..')
    })

    it('should sanitize filename', () => {
      const path = generateStoragePath('lst_123', 'photo', '../../../malicious.jpg')
      expect(path).not.toContain('..')
    })

    it('should handle special characters in filename', () => {
      const path = generateStoragePath('lst_123', 'photo', 'photo (1) & copy.jpg')
      expect(path).toMatch(/\.jpg$/)
      expect(path).not.toContain('&')
    })
  })
})
