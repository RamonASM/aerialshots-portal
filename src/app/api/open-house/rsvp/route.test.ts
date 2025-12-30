/**
 * Open House RSVP API Tests
 *
 * Tests for open house RSVP endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from './route'
import { NextRequest } from 'next/server'

// Create chainable mock
function createChainableMock(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'single', 'insert', 'update']

  methods.forEach(method => {
    chain[method] = vi.fn(() => chain)
  })

  // Override single to return the final result
  chain.single = vi.fn(() => finalResult)

  return chain
}

let mockFromResult: ReturnType<typeof createChainableMock>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => mockFromResult),
  })),
}))

describe('POST /api/open-house/rsvp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromResult = createChainableMock({ data: null, error: null })
  })

  it('should return 400 for invalid request body', async () => {
    const request = new NextRequest('http://localhost/api/open-house/rsvp', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required fields
        name: 'John Doe',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid request')
  })

  it('should return 400 for invalid email', async () => {
    const request = new NextRequest('http://localhost/api/open-house/rsvp', {
      method: 'POST',
      body: JSON.stringify({
        openHouseId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'not-an-email',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid request')
  })

  it('should return 404 for non-existent open house', async () => {
    mockFromResult = createChainableMock({ data: null, error: { code: 'PGRST116' } })

    const request = new NextRequest('http://localhost/api/open-house/rsvp', {
      method: 'POST',
      body: JSON.stringify({
        openHouseId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        partySize: 2,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('not found')
  })

  it('should return 400 for cancelled open house', async () => {
    mockFromResult = createChainableMock({
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'cancelled',
        event_date: '2099-12-31',
      },
      error: null,
    })

    const request = new NextRequest('http://localhost/api/open-house/rsvp', {
      method: 'POST',
      body: JSON.stringify({
        openHouseId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('no longer accepting')
  })

  it('should return 400 for past open house', async () => {
    mockFromResult = createChainableMock({
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'scheduled',
        event_date: '2020-01-01', // Past date
      },
      error: null,
    })

    const request = new NextRequest('http://localhost/api/open-house/rsvp', {
      method: 'POST',
      body: JSON.stringify({
        openHouseId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('already occurred')
  })

  it('should enforce party size limits', async () => {
    const request = new NextRequest('http://localhost/api/open-house/rsvp', {
      method: 'POST',
      body: JSON.stringify({
        openHouseId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        partySize: 15, // Over limit of 10
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid request')
  })
})

describe('GET /api/open-house/rsvp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromResult = createChainableMock({ data: null, error: null })
  })

  it('should return 400 for missing parameters', async () => {
    const request = new NextRequest('http://localhost/api/open-house/rsvp')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required parameters')
  })

  it('should return registered false if no RSVP found', async () => {
    mockFromResult = createChainableMock({ data: null, error: { code: 'PGRST116' } })

    const request = new NextRequest(
      'http://localhost/api/open-house/rsvp?openHouseId=123e4567-e89b-12d3-a456-426614174000&email=john@example.com'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.registered).toBe(false)
  })

  it('should return RSVP details if found', async () => {
    mockFromResult = createChainableMock({
      data: {
        id: 'rsvp-123',
        status: 'confirmed',
        party_size: 2,
        created_at: '2024-01-15T10:00:00Z',
      },
      error: null,
    })

    const request = new NextRequest(
      'http://localhost/api/open-house/rsvp?openHouseId=123e4567-e89b-12d3-a456-426614174000&email=john@example.com'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.registered).toBe(true)
    expect(data.status).toBe('confirmed')
    expect(data.partySize).toBe(2)
  })
})
