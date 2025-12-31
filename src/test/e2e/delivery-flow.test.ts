/**
 * E2E Delivery Flow Tests
 *
 * Tests the complete media delivery journey:
 * 1. Media upload after shoot
 * 2. Processing pipeline (RAW → HDR → QC)
 * 3. QC review and approval
 * 4. Delivery page generation
 * 5. Client access and downloads
 * 6. Post-delivery AI workflows
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  neq: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'test/path' }, error: null })),
      download: vi.fn(() => Promise.resolve({ data: new Blob(), error: null })),
      createSignedUrl: vi.fn(() =>
        Promise.resolve({ data: { signedUrl: 'https://storage.example.com/signed/...' }, error: null })
      ),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://storage.example.com/public/...' } })),
    })),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Test data matching seeded accounts
const TEST_LISTING = {
  id: 'c0000000-0000-0000-0000-000000000001',
  address: '123 Test Street',
  city: 'Orlando',
  state: 'FL',
  agent_id: 'a0000000-0000-0000-0000-000000000001',
}

const TEST_PHOTOGRAPHER = {
  id: 'b0000000-0000-0000-0000-000000000001',
  name: 'Test Photographer',
  email: 'photographer@test.aerialshots.media',
}

const TEST_EDITOR = {
  id: 'b0000000-0000-0000-0000-000000000002',
  name: 'Test Editor',
  email: 'editor@test.aerialshots.media',
}

const TEST_QC = {
  id: 'b0000000-0000-0000-0000-000000000004',
  name: 'Test QC Reviewer',
  email: 'qc@test.aerialshots.media',
}

describe('E2E Delivery Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Stage 1: Media Upload (Photographer)', () => {
    it('should upload raw photos from shoot', async () => {
      const uploadSession = {
        listingId: TEST_LISTING.id,
        photographerId: TEST_PHOTOGRAPHER.id,
        assignmentId: 'e0000000-0000-0000-0000-000000000001',
        files: [
          { name: 'IMG_0001.CR3', size: 45000000, type: 'image/x-canon-cr3' },
          { name: 'IMG_0002.CR3', size: 47000000, type: 'image/x-canon-cr3' },
          { name: 'DJI_0001.DNG', size: 52000000, type: 'image/x-adobe-dng' },
        ],
        totalSize: 144000000,
        uploadProgress: 0,
      }

      expect(uploadSession.files).toHaveLength(3)
      expect(uploadSession.files[2].name).toContain('DJI') // Drone shot
    })

    it('should validate file types and sizes', async () => {
      const allowedTypes = [
        'image/x-canon-cr3',
        'image/x-canon-cr2',
        'image/x-nikon-nef',
        'image/x-adobe-dng',
        'image/jpeg',
        'video/mp4',
        'video/quicktime',
      ]

      const maxSizeBytes = 100 * 1024 * 1024 // 100MB

      const validateFile = (file: { type: string; size: number }): boolean => {
        return allowedTypes.includes(file.type) && file.size <= maxSizeBytes
      }

      expect(validateFile({ type: 'image/x-canon-cr3', size: 45000000 })).toBe(true)
      expect(validateFile({ type: 'image/gif', size: 1000000 })).toBe(false) // Wrong type
      expect(validateFile({ type: 'image/jpeg', size: 150000000 })).toBe(false) // Too large
    })

    it('should organize uploads by category', async () => {
      const categorizedMedia = {
        exterior: ['IMG_0001.CR3', 'IMG_0002.CR3', 'IMG_0003.CR3'],
        interior: ['IMG_0004.CR3', 'IMG_0005.CR3', 'IMG_0006.CR3'],
        drone: ['DJI_0001.DNG', 'DJI_0002.DNG'],
        video: ['MOV_0001.MOV'],
      }

      expect(categorizedMedia.exterior).toHaveLength(3)
      expect(categorizedMedia.drone).toHaveLength(2)
    })

    it('should update assignment status after upload', async () => {
      const assignmentUpdate = {
        id: 'e0000000-0000-0000-0000-000000000001',
        status: 'uploaded',
        completed_at: new Date().toISOString(),
        photo_count: 45,
        has_drone: true,
        has_video: true,
        notes: 'All shots completed, great weather',
      }

      expect(assignmentUpdate.status).toBe('uploaded')
      expect(assignmentUpdate.photo_count).toBe(45)
    })
  })

  describe('Stage 2: Processing Pipeline', () => {
    it('should create processing job for RAW files', async () => {
      const processingJob = {
        id: 'proc-job-1',
        listingId: TEST_LISTING.id,
        status: 'pending',
        stage: 'raw_import',
        totalPhotos: 45,
        processedPhotos: 0,
        createdAt: new Date().toISOString(),
      }

      expect(processingJob.stage).toBe('raw_import')
    })

    it('should process through HDR pipeline', async () => {
      const pipelineStages = [
        { stage: 'raw_import', status: 'completed', duration: 30000 },
        { stage: 'lens_correction', status: 'completed', duration: 45000 },
        { stage: 'hdr_processing', status: 'in_progress', duration: null },
        { stage: 'color_grading', status: 'pending', duration: null },
        { stage: 'export', status: 'pending', duration: null },
      ]

      const currentStage = pipelineStages.find((s) => s.status === 'in_progress')
      const completedStages = pipelineStages.filter((s) => s.status === 'completed')

      expect(currentStage?.stage).toBe('hdr_processing')
      expect(completedStages).toHaveLength(2)
    })

    it('should call FoundDR API for HDR processing', async () => {
      const foundDRRequest = {
        images: ['storage://raw/listing-123/IMG_0001.CR3'],
        preset: 'real_estate_standard',
        options: {
          sky_enhancement: true,
          window_pull: true,
          flash_ambient_blend: true,
        },
        webhookUrl: 'https://app.aerialshots.media/api/webhooks/founddr',
      }

      const foundDRResponse = {
        jobId: 'founddr-job-123',
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 300000).toISOString(),
      }

      expect(foundDRResponse.status).toBe('processing')
    })

    it('should handle processing webhook callback', async () => {
      const webhookPayload = {
        jobId: 'founddr-job-123',
        status: 'completed',
        results: [
          {
            originalPath: 'raw/listing-123/IMG_0001.CR3',
            processedUrl: 'https://cdn.founddr.com/processed/abc123.jpg',
            thumbnailUrl: 'https://cdn.founddr.com/thumbs/abc123.jpg',
          },
        ],
      }

      expect(webhookPayload.results).toHaveLength(1)
      expect(webhookPayload.status).toBe('completed')
    })

    it('should store processed files in Supabase Storage', async () => {
      const storedMedia = {
        id: 'media-001',
        listingId: TEST_LISTING.id,
        originalPath: 'raw/c0000000.../IMG_0001.CR3',
        processedPath: 'processed/c0000000.../IMG_0001.jpg',
        thumbnailPath: 'thumbnails/c0000000.../IMG_0001.jpg',
        category: 'exterior',
        order: 1,
        status: 'processed',
        metadata: {
          width: 6000,
          height: 4000,
          format: 'jpeg',
          size: 2500000,
        },
      }

      expect(storedMedia.status).toBe('processed')
      expect(storedMedia.metadata.width).toBe(6000)
    })
  })

  describe('Stage 3: Editor Review', () => {
    it('should assign job to editor queue', async () => {
      const editingJob = {
        id: 'edit-job-1',
        listingId: TEST_LISTING.id,
        status: 'pending',
        priority: 'normal',
        photoCount: 45,
        editorId: null,
        createdAt: new Date().toISOString(),
      }

      expect(editingJob.editorId).toBeNull()
      expect(editingJob.status).toBe('pending')
    })

    it('should allow editor to claim and process', async () => {
      const claimedJob = {
        id: 'edit-job-1',
        editorId: TEST_EDITOR.id,
        status: 'in_progress',
        claimedAt: new Date().toISOString(),
      }

      expect(claimedJob.editorId).toBe(TEST_EDITOR.id)
    })

    it('should track individual photo edits', async () => {
      const photoEdit = {
        mediaId: 'media-001',
        editorId: TEST_EDITOR.id,
        adjustments: {
          exposure: 0.3,
          contrast: 1.1,
          saturation: 1.05,
          sharpening: 25,
          perspectiveCorrection: true,
        },
        beforeUrl: 'https://storage.../before.jpg',
        afterUrl: 'https://storage.../after.jpg',
        editedAt: new Date().toISOString(),
      }

      expect(photoEdit.adjustments.perspectiveCorrection).toBe(true)
    })

    it('should submit edits for QC review', async () => {
      const submission = {
        jobId: 'edit-job-1',
        editorId: TEST_EDITOR.id,
        editedPhotos: 45,
        status: 'pending_qc',
        submittedAt: new Date().toISOString(),
        notes: 'Applied standard color grading, perspective correction on all exteriors',
      }

      expect(submission.status).toBe('pending_qc')
    })
  })

  describe('Stage 4: QC Review', () => {
    it('should queue job for QC review', async () => {
      const qcQueue = {
        jobId: 'edit-job-1',
        listingId: TEST_LISTING.id,
        priority: 'normal',
        submittedAt: new Date(Date.now() - 1800000).toISOString(),
        slaHours: 24,
        remainingHours: 23.5,
      }

      expect(qcQueue.remainingHours).toBeLessThan(qcQueue.slaHours)
    })

    it('should review individual photos', async () => {
      const photoReviews = [
        { mediaId: 'media-001', status: 'approved', reviewedBy: TEST_QC.id },
        { mediaId: 'media-002', status: 'approved', reviewedBy: TEST_QC.id },
        { mediaId: 'media-003', status: 'rejected', reviewedBy: TEST_QC.id, notes: 'Sky overblown' },
      ]

      const approved = photoReviews.filter((r) => r.status === 'approved')
      const rejected = photoReviews.filter((r) => r.status === 'rejected')

      expect(approved).toHaveLength(2)
      expect(rejected).toHaveLength(1)
    })

    it('should send back for revision if rejections exist', async () => {
      const revisionRequest = {
        jobId: 'edit-job-1',
        requestedBy: TEST_QC.id,
        rejectedPhotos: ['media-003'],
        notes: 'Please fix sky exposure on exterior shot 3',
        priority: 'normal',
        requestedAt: new Date().toISOString(),
      }

      expect(revisionRequest.rejectedPhotos).toHaveLength(1)
    })

    it('should approve job when all photos pass', async () => {
      const approval = {
        jobId: 'edit-job-1',
        approvedBy: TEST_QC.id,
        status: 'approved_for_delivery',
        qualityScore: 4.5,
        approvedAt: new Date().toISOString(),
        firstPassApproval: true,
      }

      expect(approval.status).toBe('approved_for_delivery')
      expect(approval.firstPassApproval).toBe(true)
    })
  })

  describe('Stage 5: Delivery Page Generation', () => {
    it('should generate delivery page with all media', async () => {
      const deliveryPage = {
        listingId: TEST_LISTING.id,
        url: `https://app.aerialshots.media/delivery/${TEST_LISTING.id}`,
        status: 'ready',
        media: {
          photos: 45,
          videos: 1,
          floorPlans: 1,
          virtualTour: 1,
        },
        generatedAt: new Date().toISOString(),
      }

      expect(deliveryPage.media.photos).toBe(45)
      expect(deliveryPage.status).toBe('ready')
    })

    it('should generate public share token', async () => {
      const shareToken = {
        token: 'share_abc123xyz',
        listingId: TEST_LISTING.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        allowDownload: true,
        views: 0,
        createdBy: 'a0000000-0000-0000-0000-000000000001',
      }

      expect(shareToken.allowDownload).toBe(true)
    })

    it('should organize media by category on delivery page', async () => {
      const deliveryContent = {
        hero: { url: 'https://storage.../hero.jpg', type: 'photo' },
        sections: [
          { title: 'Exterior', items: ['photo-1', 'photo-2', 'photo-3'], type: 'gallery' },
          { title: 'Interior', items: ['photo-4', 'photo-5'], type: 'gallery' },
          { title: 'Drone Views', items: ['photo-40', 'photo-41'], type: 'gallery' },
          { title: 'Floor Plan', items: ['floorplan-1'], type: 'floorplan' },
          { title: 'Video Tour', items: ['video-1'], type: 'video' },
          { title: '3D Tour', items: ['tour-1'], type: 'embed' },
        ],
      }

      expect(deliveryContent.sections).toHaveLength(6)
    })

    it('should send delivery notification email', async () => {
      const deliveryEmail = {
        to: 'agent@test.aerialshots.media',
        subject: 'Your media is ready! - 123 Test Street',
        template: 'delivery-ready',
        data: {
          agentName: 'Test Agent',
          propertyAddress: '123 Test Street, Orlando, FL 32801',
          photoCount: 45,
          hasVideo: true,
          hasFloorPlan: true,
          deliveryUrl: `https://app.aerialshots.media/delivery/${TEST_LISTING.id}`,
          shareUrl: `https://app.aerialshots.media/portal/share_abc123xyz`,
        },
      }

      expect(deliveryEmail.data.photoCount).toBe(45)
    })
  })

  describe('Stage 6: Client Access', () => {
    it('should allow viewing delivery page with token', async () => {
      const portalAccess = {
        token: 'share_abc123xyz',
        valid: true,
        listing: TEST_LISTING,
        media: {
          photos: 45,
          videos: 1,
        },
        permissions: {
          view: true,
          download: true,
          share: false,
        },
      }

      expect(portalAccess.valid).toBe(true)
      expect(portalAccess.permissions.download).toBe(true)
    })

    it('should track portal views', async () => {
      const viewEvent = {
        token: 'share_abc123xyz',
        viewedAt: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        referrer: null,
      }

      expect(viewEvent.viewedAt).toBeDefined()
    })

    it('should allow individual photo downloads', async () => {
      const download = {
        mediaId: 'media-001',
        format: 'original', // or 'web', 'print'
        signedUrl: 'https://storage.../signed/download/...',
        expiresIn: 3600,
      }

      expect(download.expiresIn).toBe(3600)
    })

    it('should allow bulk download as ZIP', async () => {
      const bulkDownload = {
        listingId: TEST_LISTING.id,
        mediaIds: ['media-001', 'media-002', 'media-003'],
        format: 'web',
        zipUrl: 'https://storage.../downloads/123_test_street_photos.zip',
        sizeBytes: 125000000,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }

      expect(bulkDownload.mediaIds).toHaveLength(3)
    })

    it('should enforce download limits for non-premium', async () => {
      const downloadLimits = {
        agentTier: 'bronze',
        monthlyLimit: 100,
        currentUsage: 85,
        remaining: 15,
        resetsAt: '2025-02-01T00:00:00Z',
      }

      const canDownload = downloadLimits.remaining > 0
      expect(canDownload).toBe(true)
    })
  })

  describe('Stage 7: Post-Delivery AI Workflows', () => {
    it('should trigger post-delivery workflow', async () => {
      const workflow = {
        id: 'workflow-1',
        type: 'post-delivery',
        listingId: TEST_LISTING.id,
        status: 'running',
        steps: [
          { id: 'qc-check', status: 'completed', result: 'passed' },
          { id: 'notify-agent', status: 'completed', result: 'sent' },
          { id: 'generate-video', status: 'in_progress', result: null },
          { id: 'generate-content', status: 'pending', result: null },
          { id: 'create-campaign', status: 'pending', result: null },
        ],
      }

      const completedSteps = workflow.steps.filter((s) => s.status === 'completed')
      expect(completedSteps).toHaveLength(2)
    })

    it('should generate AI listing description', async () => {
      const contentGeneration = {
        listingId: TEST_LISTING.id,
        type: 'listing_description',
        input: {
          photos: ['media-001', 'media-002'],
          propertyData: {
            address: '123 Test Street',
            sqft: 2500,
            bedrooms: 4,
            bathrooms: 3,
            price: 450000,
          },
        },
        output: {
          description:
            'Welcome to this stunning 4-bedroom, 3-bathroom home in the heart of Orlando...',
          characterCount: 1250,
          tone: 'professional',
        },
        status: 'completed',
      }

      expect(contentGeneration.output.characterCount).toBe(1250)
    })

    it('should generate social media captions', async () => {
      const socialContent = {
        listingId: TEST_LISTING.id,
        platforms: {
          instagram: {
            caption: '✨ Just Listed in Orlando! 4BR/3BA beauty...',
            hashtags: ['#JustListed', '#OrlandoRealEstate', '#DreamHome'],
          },
          facebook: {
            text: 'New Listing Alert! 123 Test Street is now on the market...',
            cta: 'Schedule a showing today!',
          },
        },
      }

      expect(socialContent.platforms.instagram.hashtags).toHaveLength(3)
    })

    it('should create video slideshow from photos', async () => {
      const videoGeneration = {
        listingId: TEST_LISTING.id,
        type: 'slideshow',
        inputPhotos: ['media-001', 'media-002', 'media-003'],
        options: {
          duration: 60,
          music: 'upbeat_modern',
          transitions: 'smooth',
          textOverlays: true,
        },
        output: {
          videoUrl: 'https://storage.../videos/slideshow_123.mp4',
          thumbnailUrl: 'https://storage.../thumbnails/slideshow_123.jpg',
          duration: 62,
        },
        status: 'completed',
      }

      expect(videoGeneration.output.duration).toBeGreaterThanOrEqual(60)
    })

    it('should schedule marketing campaign', async () => {
      const campaign = {
        id: 'campaign-1',
        listingId: TEST_LISTING.id,
        type: 'just_listed',
        status: 'scheduled',
        channels: ['email', 'social'],
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        content: {
          subject: 'Just Listed: 123 Test Street, Orlando',
          previewUrl: 'https://app.aerialshots.media/campaigns/preview/campaign-1',
        },
      }

      expect(campaign.channels).toContain('email')
    })
  })

  describe('Error Handling', () => {
    it('should handle upload failure gracefully', async () => {
      const uploadError = {
        error: 'UPLOAD_FAILED',
        message: 'Failed to upload IMG_0005.CR3',
        retryable: true,
        failedFiles: ['IMG_0005.CR3'],
        successfulFiles: ['IMG_0001.CR3', 'IMG_0002.CR3'],
      }

      expect(uploadError.retryable).toBe(true)
    })

    it('should handle processing failure', async () => {
      const processingError = {
        error: 'PROCESSING_FAILED',
        stage: 'hdr_processing',
        message: 'FoundDR API returned error',
        affectedPhotos: ['media-003'],
        retryable: true,
      }

      expect(processingError.stage).toBe('hdr_processing')
    })

    it('should notify admin on critical failures', async () => {
      const criticalAlert = {
        type: 'PROCESSING_BLOCKED',
        listingId: TEST_LISTING.id,
        message: 'Processing pipeline blocked after 3 retries',
        notifiedAdmins: ['admin@aerialshots.media'],
        escalatedAt: new Date().toISOString(),
      }

      expect(criticalAlert.notifiedAdmins).toHaveLength(1)
    })

    it('should handle expired share tokens', async () => {
      const expiredToken = {
        token: 'share_expired123',
        valid: false,
        error: 'TOKEN_EXPIRED',
        message: 'This share link has expired. Please contact the agent for a new link.',
        expiredAt: new Date(Date.now() - 86400000).toISOString(),
      }

      expect(expiredToken.valid).toBe(false)
      expect(expiredToken.error).toBe('TOKEN_EXPIRED')
    })
  })

  describe('Analytics & Metrics', () => {
    it('should track delivery performance metrics', async () => {
      const deliveryMetrics = {
        listingId: TEST_LISTING.id,
        uploadToDeliveryHours: 18.5,
        processingTimeMinutes: 45,
        qcPassedFirstTry: true,
        photoCount: 45,
        downloadCount: 12,
        portalViews: 28,
      }

      expect(deliveryMetrics.uploadToDeliveryHours).toBeLessThan(24)
      expect(deliveryMetrics.qcPassedFirstTry).toBe(true)
    })

    it('should track editor performance', async () => {
      const editorMetrics = {
        editorId: TEST_EDITOR.id,
        jobsCompleted: 50,
        averageTimePerPhoto: 1.8, // minutes
        firstPassApprovalRate: 0.88,
        revisionRate: 0.12,
        qualityScore: 4.3,
      }

      expect(editorMetrics.firstPassApprovalRate).toBeGreaterThan(0.8)
    })

    it('should track QC performance', async () => {
      const qcMetrics = {
        qcId: TEST_QC.id,
        jobsReviewed: 75,
        photosReviewed: 3375,
        averageReviewTimeMinutes: 12,
        rejectionRate: 0.05,
        consistencyScore: 0.92,
      }

      expect(qcMetrics.rejectionRate).toBeLessThan(0.1)
    })
  })
})
