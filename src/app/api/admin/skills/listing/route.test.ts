/**
 * Listing Skills API Route Tests
 *
 * TDD tests for GET /api/admin/skills/listing?listing_id=xxx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Create mock functions at module level
const mockGetListingSkillOutputs = vi.fn()
const mockListSkillExecutions = vi.fn()

// Mock auth
vi.mock('@/lib/api/middleware/require-staff', () => ({
  requireStaff: vi.fn(async () => ({
    id: 'staff-123',
    email: 'admin@aerialshots.media',
  })),
}))

// Mock execution service
vi.mock('@/lib/skills/execution-service', () => ({
  getListingSkillOutputs: (...args: unknown[]) => mockGetListingSkillOutputs(...args),
  listSkillExecutions: (...args: unknown[]) => mockListSkillExecutions(...args),
}))

describe('GET /api/admin/skills/listing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return skill outputs for a listing', async () => {
    mockGetListingSkillOutputs.mockResolvedValueOnce([
      {
        id: 'output-1',
        skill_id: 'content-generate',
        output_type: 'description',
        output_data: { text: 'Beautiful home...' },
        status: 'completed',
      },
    ])
    mockListSkillExecutions.mockResolvedValueOnce([])

    const url = new URL('http://localhost/api/admin/skills/listing?listing_id=listing-123')
    const request = new NextRequest(url)

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.outputs).toHaveLength(1)
    expect(data.outputs[0].skill_id).toBe('content-generate')
  })

  it('should return 400 for missing listing_id', async () => {
    const url = new URL('http://localhost/api/admin/skills/listing')
    const request = new NextRequest(url)

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('listing_id')
  })

  it('should include recent executions', async () => {
    mockGetListingSkillOutputs.mockResolvedValueOnce([])
    mockListSkillExecutions.mockResolvedValueOnce([
      {
        id: 'exec-1',
        skill_id: 'image-analyze',
        status: 'running',
        started_at: new Date().toISOString(),
      },
    ])

    const url = new URL('http://localhost/api/admin/skills/listing?listing_id=listing-456')
    const request = new NextRequest(url)

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.executions).toHaveLength(1)
    expect(data.executions[0].status).toBe('running')
  })
})
