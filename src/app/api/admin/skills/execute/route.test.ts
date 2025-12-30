/**
 * Skill Execute API Route Tests
 *
 * TDD tests for POST /api/admin/skills/execute
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Create mock function at module level
const mockExecuteSkill = vi.fn()

// Mock the auth middleware
vi.mock('@/lib/api/middleware/require-staff', () => ({
  requireStaff: vi.fn(async () => ({
    id: 'staff-123',
    email: 'admin@aerialshots.media',
    role: 'admin',
  })),
}))

// Mock the skill execution service with a proper class
vi.mock('@/lib/skills/execution-service', () => ({
  SkillExecutionService: class MockSkillExecutionService {
    executeSkill = mockExecuteSkill
  },
}))

describe('POST /api/admin/skills/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute a skill successfully', async () => {
    mockExecuteSkill.mockResolvedValueOnce({
      success: true,
      execution_id: 'exec-123',
      output: { result: 'Analyzed image successfully' },
      execution_time_ms: 1500,
    })

    const request = new NextRequest('http://localhost/api/admin/skills/execute', {
      method: 'POST',
      body: JSON.stringify({
        skill_id: 'image-analyze',
        input: { imageUrl: 'https://example.com/photo.jpg' },
        listing_id: 'listing-123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.execution_id).toBe('exec-123')
    expect(data.output).toBeDefined()
  })

  it('should return 400 for missing skill_id', async () => {
    const request = new NextRequest('http://localhost/api/admin/skills/execute', {
      method: 'POST',
      body: JSON.stringify({
        input: { imageUrl: 'https://example.com/photo.jpg' },
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('skill_id')
  })

  it('should handle skill execution failure', async () => {
    mockExecuteSkill.mockResolvedValueOnce({
      success: false,
      execution_id: 'exec-456',
      error: 'Skill execution failed: API rate limit exceeded',
    })

    const request = new NextRequest('http://localhost/api/admin/skills/execute', {
      method: 'POST',
      body: JSON.stringify({
        skill_id: 'content-generate',
        input: { listingId: 'listing-789' },
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200) // Returns 200 with success: false
    expect(data.success).toBe(false)
    expect(data.error).toContain('rate limit')
  })

  it('should pass listing_id to execution service', async () => {
    mockExecuteSkill.mockResolvedValueOnce({
      success: true,
      execution_id: 'exec-789',
      output: {},
    })

    const request = new NextRequest('http://localhost/api/admin/skills/execute', {
      method: 'POST',
      body: JSON.stringify({
        skill_id: 'video-slideshow',
        input: { photos: ['url1', 'url2'] },
        listing_id: 'listing-specific',
      }),
    })

    await POST(request)

    expect(mockExecuteSkill).toHaveBeenCalledWith(
      'video-slideshow',
      { photos: ['url1', 'url2'] },
      expect.objectContaining({
        listing_id: 'listing-specific',
        triggered_by: 'admin@aerialshots.media',
        trigger_source: 'manual',
      })
    )
  })
})
