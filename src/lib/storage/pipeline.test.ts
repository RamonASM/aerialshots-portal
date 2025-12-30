/**
 * Media Pipeline Tests
 *
 * TDD tests for the media processing pipeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PIPELINE_BUCKETS,
  generatePipelinePath,
  MediaPipelineService,
  createMediaPipeline,
} from './pipeline'

// Create mock storage bucket
const createMockBucket = () => ({
  upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
  copy: vi.fn().mockResolvedValue({ data: { path: 'new-path' }, error: null }),
  remove: vi.fn().mockResolvedValue({ data: null, error: null }),
  list: vi.fn().mockResolvedValue({ data: [], error: null }),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file' } })),
  createSignedUrl: vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://test.com/signed' },
    error: null,
  }),
  createSignedUploadUrl: vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://test.com/upload', path: 'upload-path', token: 'abc' },
    error: null,
  }),
})

const mockBucket = createMockBucket()

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => mockBucket),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

describe('Pipeline Constants', () => {
  describe('PIPELINE_BUCKETS', () => {
    it('should have all pipeline stages', () => {
      expect(PIPELINE_BUCKETS.raw).toBe('asm-raw-uploads')
      expect(PIPELINE_BUCKETS.processing).toBe('asm-processing')
      expect(PIPELINE_BUCKETS.qc).toBe('asm-qc-staging')
      expect(PIPELINE_BUCKETS.final).toBe('asm-media')
    })
  })
})

describe('generatePipelinePath', () => {
  it('should generate path for raw stage', () => {
    const path = generatePipelinePath({
      listingId: 'listing-123',
      stage: 'raw',
      filename: 'photo.jpg',
    })
    expect(path).toMatch(/^listing-123\/raw\/\d+-[a-z0-9]+\.jpg$/)
  })

  it('should generate path for processing stage', () => {
    const path = generatePipelinePath({
      listingId: 'listing-123',
      stage: 'processing',
      filename: 'photo.jpg',
    })
    expect(path).toContain('listing-123/processing/')
  })

  it('should generate path for qc stage', () => {
    const path = generatePipelinePath({
      listingId: 'listing-123',
      stage: 'qc',
      filename: 'photo.jpg',
    })
    expect(path).toContain('listing-123/qc/')
  })

  it('should generate path for final stage', () => {
    const path = generatePipelinePath({
      listingId: 'listing-123',
      stage: 'final',
      filename: 'photo.jpg',
    })
    expect(path).toContain('listing-123/final/')
  })

  it('should include category in path when provided', () => {
    const path = generatePipelinePath({
      listingId: 'listing-123',
      stage: 'raw',
      filename: 'photo.jpg',
      category: 'interior',
    })
    expect(path).toContain('/interior/')
  })

  it('should sanitize listing ID', () => {
    const path = generatePipelinePath({
      listingId: '../malicious/path',
      stage: 'raw',
      filename: 'photo.jpg',
    })
    // Path traversal attempts should be neutralized
    expect(path).not.toContain('..')
    // The listing ID portion should only contain the last safe segment
    expect(path.startsWith('path/')).toBe(true)
    expect(path).toMatch(/^path\/raw\/\d+-[a-z0-9]+\.jpg$/)
  })

  it('should preserve original file extension', () => {
    const jpgPath = generatePipelinePath({
      listingId: 'listing-123',
      stage: 'raw',
      filename: 'photo.JPG',
    })
    expect(jpgPath).toMatch(/\.jpg$/)

    const pngPath = generatePipelinePath({
      listingId: 'listing-123',
      stage: 'raw',
      filename: 'image.PNG',
    })
    expect(pngPath).toMatch(/\.png$/)
  })
})

describe('MediaPipelineService', () => {
  let pipeline: MediaPipelineService

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockBucket.upload.mockResolvedValue({ data: { path: 'test-path' }, error: null })
    mockBucket.copy.mockResolvedValue({ data: { path: 'new-path' }, error: null })
    mockBucket.remove.mockResolvedValue({ data: null, error: null })
    mockBucket.list.mockResolvedValue({ data: [], error: null })
    pipeline = createMediaPipeline()
  })

  describe('ingestRaw', () => {
    it('should upload file to raw bucket', async () => {
      const result = await pipeline.ingestRaw({
        listingId: 'listing-123',
        file: Buffer.from('test'),
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })

      expect(result.success).toBe(true)
      expect(result.path).toBe('test-path')
    })

    it('should handle upload errors', async () => {
      // Check that error handling works
      mockBucket.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Upload failed' },
      })

      const result = await pipeline.ingestRaw({
        listingId: 'listing-123',
        file: Buffer.from('test'),
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed')
    })
  })

  describe('promoteToProcessing', () => {
    it('should move file from raw to processing', async () => {
      const result = await pipeline.promoteToProcessing({
        listingId: 'listing-123',
        rawPath: 'listing-123/raw/12345-abc.jpg',
      })

      expect(result.success).toBe(true)
      expect(result.newPath).toBeDefined()
      expect(result.newPath).toContain('processing')
    })

    it('should require rawPath', async () => {
      const result = await pipeline.promoteToProcessing({
        listingId: 'listing-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('rawPath')
    })
  })

  describe('promoteToQC', () => {
    it('should move file from processing to QC', async () => {
      const result = await pipeline.promoteToQC({
        listingId: 'listing-123',
        processingPath: 'listing-123/processing/12345-abc.jpg',
      })

      expect(result.success).toBe(true)
      expect(result.newPath).toBeDefined()
      expect(result.newPath).toContain('qc')
    })

    it('should require processingPath', async () => {
      const result = await pipeline.promoteToQC({
        listingId: 'listing-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('processingPath')
    })
  })

  describe('promoteToFinal', () => {
    it('should move file from QC to final delivery', async () => {
      const result = await pipeline.promoteToFinal({
        listingId: 'listing-123',
        qcPath: 'listing-123/qc/12345-abc.jpg',
      })

      expect(result.success).toBe(true)
      expect(result.newPath).toBeDefined()
      expect(result.newPath).toContain('final')
      expect(result.publicUrl).toBe('https://test.com/file')
    })

    it('should require qcPath', async () => {
      const result = await pipeline.promoteToFinal({
        listingId: 'listing-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('qcPath')
    })
  })

  describe('rejectFromQC', () => {
    it('should delete file from QC', async () => {
      const result = await pipeline.rejectFromQC({
        listingId: 'listing-123',
        qcPath: 'listing-123/qc/12345-abc.jpg',
        reason: 'Blurry image',
      })

      expect(result.success).toBe(true)
      expect(mockBucket.remove).toHaveBeenCalled()
    })
  })

  describe('getPresignedUploadUrl', () => {
    it('should return presigned URL for direct upload', async () => {
      const result = await pipeline.getPresignedUploadUrl({
        listingId: 'listing-123',
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })

      expect(result.success).toBe(true)
      expect(result.uploadUrl).toBe('https://test.com/upload')
      expect(result.path).toBe('upload-path')
      expect(result.token).toBe('abc')
    })
  })

  describe('getStageContents', () => {
    it('should list files in a pipeline stage', async () => {
      const files = await pipeline.getStageContents({
        listingId: 'listing-123',
        stage: 'raw',
      })

      expect(Array.isArray(files)).toBe(true)
    })
  })

  describe('getPipelineStatus', () => {
    it('should return counts for all stages', async () => {
      const status = await pipeline.getPipelineStatus('listing-123')

      expect(status).toHaveProperty('raw')
      expect(status).toHaveProperty('processing')
      expect(status).toHaveProperty('qc')
      expect(status).toHaveProperty('final')
      expect(typeof status.raw).toBe('number')
    })
  })
})

describe('Factory Function', () => {
  it('should create pipeline instance', () => {
    const pipeline = createMediaPipeline()
    expect(pipeline).toBeInstanceOf(MediaPipelineService)
  })
})
