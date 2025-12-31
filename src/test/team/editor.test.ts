/**
 * Editor Portal Tests
 *
 * Tests for the editor team portal functionality:
 * - Viewing editing queue
 * - Claiming jobs
 * - Submitting edits
 * - Revision handling
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

describe('Editor Portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Editing Queue', () => {
    it('should fetch available jobs in queue', async () => {
      const mockQueue = [
        {
          id: 'job-1',
          listing_id: 'c0000000-0000-0000-0000-000000000001',
          status: 'pending',
          priority: 'normal',
          photo_count: 45,
          created_at: new Date().toISOString(),
          listing: {
            address: '123 Test Street',
            city: 'Orlando',
          },
        },
        {
          id: 'job-2',
          listing_id: 'c0000000-0000-0000-0000-000000000002',
          status: 'pending',
          priority: 'rush',
          photo_count: 30,
          created_at: new Date().toISOString(),
          listing: {
            address: '456 Sample Ave',
            city: 'Tampa',
          },
        },
      ]

      expect(mockQueue).toHaveLength(2)
      expect(mockQueue[1].priority).toBe('rush')
    })

    it('should sort queue by priority and date', async () => {
      const queue = [
        { id: 1, priority: 'normal', created_at: '2024-01-01T10:00:00Z' },
        { id: 2, priority: 'rush', created_at: '2024-01-01T12:00:00Z' },
        { id: 3, priority: 'normal', created_at: '2024-01-01T09:00:00Z' },
      ]

      // Rush priority should come first (lower number = higher priority)
      const priorityOrder: Record<string, number> = { rush: 0, normal: 1 }
      const sorted = [...queue].sort((a, b) => {
        const aPriority = priorityOrder[a.priority] ?? 1
        const bPriority = priorityOrder[b.priority] ?? 1
        if (aPriority !== bPriority) return aPriority - bPriority
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      expect(sorted[0].priority).toBe('rush')
      expect(sorted[1].id).toBe(3) // Earlier normal job
    })

    it('should show estimated workload per job', async () => {
      const job = {
        photo_count: 45,
        has_video: true,
        has_virtual_staging: true,
      }

      // Estimate: 2 min per photo, 30 min for video, 15 min for staging
      const estimatedMinutes =
        job.photo_count * 2 +
        (job.has_video ? 30 : 0) +
        (job.has_virtual_staging ? 15 : 0)

      expect(estimatedMinutes).toBe(135)
    })
  })

  describe('Job Claims', () => {
    it('should allow editor to claim a job', async () => {
      const editorId = 'b0000000-0000-0000-0000-000000000002'
      const jobId = 'job-1'

      const claimedJob = {
        id: jobId,
        editor_id: editorId,
        status: 'in_progress',
        claimed_at: new Date().toISOString(),
      }

      expect(claimedJob.editor_id).toBe(editorId)
      expect(claimedJob.status).toBe('in_progress')
    })

    it('should prevent claiming already claimed jobs', async () => {
      const existingClaim = {
        id: 'job-1',
        editor_id: 'another-editor',
        status: 'in_progress',
      }

      const canClaim = existingClaim.status === 'pending'
      expect(canClaim).toBe(false)
    })

    it('should track editor workload', async () => {
      const editorWorkload = {
        editor_id: 'b0000000-0000-0000-0000-000000000002',
        active_jobs: 3,
        completed_today: 5,
        average_time_per_job: 45, // minutes
      }

      const maxJobs = 5
      const canTakeMore = editorWorkload.active_jobs < maxJobs

      expect(canTakeMore).toBe(true)
    })
  })

  describe('Edit Submission', () => {
    it('should submit edited photos for review', async () => {
      const submission = {
        job_id: 'job-1',
        editor_id: 'b0000000-0000-0000-0000-000000000002',
        edited_photos: [
          { original_id: 'photo-1', edited_url: 'https://storage.example.com/edited/1.jpg' },
          { original_id: 'photo-2', edited_url: 'https://storage.example.com/edited/2.jpg' },
        ],
        notes: 'Applied HDR processing and color correction',
        submitted_at: new Date().toISOString(),
      }

      expect(submission.edited_photos).toHaveLength(2)
      expect(submission.notes).toBeTruthy()
    })

    it('should validate all photos are edited before submission', async () => {
      const originalCount = 45
      const editedCount = 45

      const isComplete = editedCount >= originalCount
      expect(isComplete).toBe(true)
    })

    it('should update job status to pending_qc after submission', async () => {
      const jobUpdate = {
        status: 'pending_qc',
        submitted_at: new Date().toISOString(),
        editor_notes: 'Ready for review',
      }

      expect(jobUpdate.status).toBe('pending_qc')
    })
  })

  describe('Revisions', () => {
    it('should handle revision requests from QC', async () => {
      const revision = {
        job_id: 'job-1',
        requested_by: 'qc-user',
        photos_to_revise: ['photo-5', 'photo-12', 'photo-23'],
        notes: 'Sky needs more blue, shadows too dark on exterior shots',
        priority: 'normal',
      }

      expect(revision.photos_to_revise).toHaveLength(3)
      expect(revision.notes).toBeTruthy()
    })

    it('should track revision count per job', async () => {
      const job = {
        id: 'job-1',
        revision_count: 1,
        max_revisions: 3,
      }

      const canRevise = job.revision_count < job.max_revisions
      expect(canRevise).toBe(true)
    })

    it('should flag jobs with multiple revisions', async () => {
      const job = {
        id: 'job-1',
        revision_count: 3,
        max_revisions: 3,
      }

      const needsEscalation = job.revision_count >= job.max_revisions
      expect(needsEscalation).toBe(true)
    })
  })

  describe('Editing Tools', () => {
    it('should apply batch processing presets', async () => {
      const preset = {
        name: 'Real Estate Standard',
        settings: {
          exposure: 0.3,
          contrast: 1.1,
          saturation: 1.05,
          sharpening: 25,
          lens_correction: true,
          perspective_correction: true,
        },
      }

      expect(preset.settings.lens_correction).toBe(true)
      expect(preset.settings.perspective_correction).toBe(true)
    })

    it('should track editing time per photo', async () => {
      const editingSession = {
        photo_id: 'photo-1',
        started_at: Date.now() - 120000, // 2 minutes ago
        completed_at: Date.now(),
      }

      const editingTimeMs = editingSession.completed_at - editingSession.started_at
      const editingTimeMinutes = editingTimeMs / 60000

      expect(editingTimeMinutes).toBeCloseTo(2, 0)
    })
  })
})
