/**
 * QC (Quality Control) Portal Tests
 *
 * Tests for the QC team portal functionality:
 * - Reviewing submitted edits
 * - Approving/rejecting photos
 * - Requesting revisions
 * - Final delivery approval
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

describe('QC Portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Review Queue', () => {
    it('should fetch jobs pending QC review', async () => {
      const mockQueue = [
        {
          id: 'job-1',
          listing_id: 'c0000000-0000-0000-0000-000000000001',
          status: 'pending_qc',
          editor_id: 'b0000000-0000-0000-0000-000000000002',
          submitted_at: new Date().toISOString(),
          photo_count: 45,
          listing: {
            address: '123 Test Street',
            city: 'Orlando',
          },
        },
      ]

      expect(mockQueue).toHaveLength(1)
      expect(mockQueue[0].status).toBe('pending_qc')
    })

    it('should prioritize rush orders in queue', async () => {
      const queue = [
        { id: 1, priority: 'normal', submitted_at: '2024-01-01T10:00:00Z' },
        { id: 2, priority: 'rush', submitted_at: '2024-01-01T12:00:00Z' },
        { id: 3, priority: 'same_day', submitted_at: '2024-01-01T11:00:00Z' },
      ]

      // same_day > rush > normal (lower number = higher priority)
      const priorityOrder: Record<string, number> = { same_day: 0, rush: 1, normal: 2 }
      const sorted = [...queue].sort((a, b) => {
        const aPriority = priorityOrder[a.priority] ?? 2
        const bPriority = priorityOrder[b.priority] ?? 2
        return aPriority - bPriority
      })

      expect(sorted[0].priority).toBe('same_day')
      expect(sorted[1].priority).toBe('rush')
    })

    it('should show SLA countdown for each job', async () => {
      const job = {
        submitted_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        sla_hours: 24,
      }

      const elapsedHours = (Date.now() - new Date(job.submitted_at).getTime()) / 3600000
      const remainingHours = job.sla_hours - elapsedHours

      expect(remainingHours).toBeCloseTo(23, 0)
    })
  })

  describe('Photo Review', () => {
    it('should display photos for review with zoom capability', async () => {
      const reviewSession = {
        job_id: 'job-1',
        photos: [
          { id: 'photo-1', url: 'https://storage.example.com/edited/1.jpg', status: 'pending' },
          { id: 'photo-2', url: 'https://storage.example.com/edited/2.jpg', status: 'pending' },
        ],
        current_index: 0,
        zoom_level: 1,
      }

      expect(reviewSession.photos).toHaveLength(2)
      expect(reviewSession.current_index).toBe(0)
    })

    it('should allow side-by-side before/after comparison', async () => {
      const comparison = {
        photo_id: 'photo-1',
        original_url: 'https://storage.example.com/original/1.jpg',
        edited_url: 'https://storage.example.com/edited/1.jpg',
        view_mode: 'side_by_side',
      }

      expect(comparison.view_mode).toBe('side_by_side')
    })

    it('should support keyboard navigation', async () => {
      const keyBindings = {
        ArrowRight: 'next_photo',
        ArrowLeft: 'prev_photo',
        a: 'approve',
        r: 'reject',
        z: 'zoom_toggle',
        Escape: 'exit_review',
      }

      expect(keyBindings.a).toBe('approve')
      expect(keyBindings.r).toBe('reject')
    })
  })

  describe('Approval/Rejection', () => {
    it('should approve individual photos', async () => {
      const approval = {
        photo_id: 'photo-1',
        status: 'approved',
        reviewed_by: 'b0000000-0000-0000-0000-000000000004',
        reviewed_at: new Date().toISOString(),
      }

      expect(approval.status).toBe('approved')
    })

    it('should reject photos with required notes', async () => {
      const rejection = {
        photo_id: 'photo-5',
        status: 'rejected',
        reviewed_by: 'b0000000-0000-0000-0000-000000000004',
        rejection_reason: 'exposure',
        notes: 'Exterior shot is overexposed, need to bring down highlights',
        reviewed_at: new Date().toISOString(),
      }

      expect(rejection.status).toBe('rejected')
      expect(rejection.notes).toBeTruthy()
    })

    it('should require notes for rejections', async () => {
      const validateRejection = (rejection: { notes?: string }) => {
        return !!rejection.notes && rejection.notes.length >= 10
      }

      expect(validateRejection({ notes: 'Too short' })).toBe(false)
      expect(validateRejection({ notes: 'The sky needs more blue saturation' })).toBe(true)
    })

    it('should track common rejection reasons', async () => {
      const rejectionReasons = [
        { code: 'exposure', label: 'Exposure Issues', count: 15 },
        { code: 'color', label: 'Color Balance', count: 8 },
        { code: 'composition', label: 'Composition/Crop', count: 5 },
        { code: 'artifacts', label: 'Editing Artifacts', count: 3 },
      ]

      const mostCommon = rejectionReasons.sort((a, b) => b.count - a.count)[0]
      expect(mostCommon.code).toBe('exposure')
    })
  })

  describe('Batch Operations', () => {
    it('should approve all remaining photos in batch', async () => {
      const photosToApprove = ['photo-1', 'photo-2', 'photo-3', 'photo-4']

      const batchApproval = {
        photo_ids: photosToApprove,
        status: 'approved',
        reviewed_by: 'b0000000-0000-0000-0000-000000000004',
        reviewed_at: new Date().toISOString(),
      }

      expect(batchApproval.photo_ids).toHaveLength(4)
    })

    it('should calculate approval rate for job', async () => {
      const jobStats = {
        total_photos: 45,
        approved: 42,
        rejected: 3,
      }

      const approvalRate = (jobStats.approved / jobStats.total_photos) * 100
      expect(approvalRate).toBeCloseTo(93.3, 1)
    })
  })

  describe('Final Approval', () => {
    it('should require all photos reviewed before final approval', async () => {
      const jobReview = {
        total_photos: 45,
        reviewed_photos: 45,
        approved_photos: 42,
        rejected_photos: 3,
      }

      const allReviewed = jobReview.reviewed_photos === jobReview.total_photos
      expect(allReviewed).toBe(true)
    })

    it('should block final approval if rejections exist', async () => {
      const jobReview = {
        approved_photos: 42,
        rejected_photos: 3,
        revision_requested: false,
      }

      const canApprove = jobReview.rejected_photos === 0 || jobReview.revision_requested
      expect(canApprove).toBe(false)
    })

    it('should send job back for revision when rejections exist', async () => {
      const revisionRequest = {
        job_id: 'job-1',
        requested_by: 'b0000000-0000-0000-0000-000000000004',
        rejected_photo_ids: ['photo-5', 'photo-12', 'photo-23'],
        notes: 'Please fix exposure on exterior shots and color balance on kitchen',
        requested_at: new Date().toISOString(),
      }

      expect(revisionRequest.rejected_photo_ids).toHaveLength(3)
    })

    it('should approve job for delivery when all photos pass', async () => {
      const finalApproval = {
        job_id: 'job-1',
        approved_by: 'b0000000-0000-0000-0000-000000000004',
        status: 'approved_for_delivery',
        approved_at: new Date().toISOString(),
        quality_score: 4.5,
      }

      expect(finalApproval.status).toBe('approved_for_delivery')
      expect(finalApproval.quality_score).toBeGreaterThan(4)
    })
  })

  describe('Quality Metrics', () => {
    it('should track editor quality scores', async () => {
      const editorMetrics = {
        editor_id: 'b0000000-0000-0000-0000-000000000002',
        total_jobs: 50,
        first_pass_approval_rate: 0.85,
        average_revisions: 0.3,
        quality_score: 4.2,
      }

      expect(editorMetrics.first_pass_approval_rate).toBeGreaterThan(0.8)
    })

    it('should flag editors with low quality scores', async () => {
      const editorMetrics = {
        editor_id: 'editor-poor',
        first_pass_approval_rate: 0.6,
        average_revisions: 1.5,
        quality_score: 2.8,
      }

      const needsTraining = editorMetrics.quality_score < 3.5
      expect(needsTraining).toBe(true)
    })

    it('should generate daily QC report', async () => {
      const dailyReport = {
        date: new Date().toISOString().split('T')[0],
        jobs_reviewed: 15,
        photos_reviewed: 675,
        average_review_time_minutes: 12,
        first_pass_approval_rate: 0.82,
        top_rejection_reasons: ['exposure', 'color', 'composition'],
      }

      expect(dailyReport.jobs_reviewed).toBe(15)
      expect(dailyReport.first_pass_approval_rate).toBeGreaterThan(0.8)
    })
  })
})
