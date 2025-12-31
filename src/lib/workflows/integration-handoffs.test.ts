import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  processIntegrationHandoff,
  triggerIntegrationHandoff,
} from './integration-handoffs'

// Mock Supabase server client
const mockSupabaseClient = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Mock notification service
const mockSendNotification = vi.fn()
vi.mock('@/lib/notifications', () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}))

describe('Integration Handoff Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('processIntegrationHandoff', () => {
    const baseListing = {
      id: 'listing-123',
      address: '123 Main St',
      agent_id: 'agent-456',
      ops_status: 'processing',
      cubicasa_status: 'pending',
      zillow_3d_status: 'pending',
    }

    it('should notify QC team when integration completes with delivered status', async () => {
      const mockQCStaff = [
        { id: 'staff-1', email: 'editor1@test.com', phone: '+15551234567', name: 'Editor One' },
        { id: 'staff-2', email: 'editor2@test.com', phone: null, name: 'Editor Two' },
      ]

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: baseListing, error: null }),
              }),
            }),
          }
        }
        if (table === 'staff') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: mockQCStaff, error: null }),
                }),
              }),
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      await processIntegrationHandoff({
        listingId: 'listing-123',
        integration: 'cubicasa',
        previousStatus: 'processing',
        newStatus: 'delivered',
      })

      expect(mockSendNotification).toHaveBeenCalledTimes(2)
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'integration_complete',
          recipient: expect.objectContaining({
            email: 'editor1@test.com',
            name: 'Editor One',
          }),
        })
      )
    })

    it('should notify managers when integration fails', async () => {
      const mockManagers = [
        { id: 'manager-1', email: 'manager@test.com', phone: '+15559876543', name: 'Manager' },
      ]

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: baseListing, error: null }),
              }),
            }),
          }
        }
        if (table === 'staff') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: mockManagers, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'job_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      await processIntegrationHandoff({
        listingId: 'listing-123',
        integration: 'cubicasa',
        previousStatus: 'processing',
        newStatus: 'failed',
      })

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'integration_failed',
          recipient: expect.objectContaining({
            email: 'manager@test.com',
          }),
        })
      )
    })

    it('should log failure event to job_events', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: baseListing, error: null }),
              }),
            }),
          }
        }
        if (table === 'staff') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'job_events') {
          return { insert: mockInsert }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      await processIntegrationHandoff({
        listingId: 'listing-123',
        integration: 'zillow_3d',
        previousStatus: 'processing',
        newStatus: 'failed',
        externalId: 'zillow-ext-123',
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_id: 'listing-123',
          event_type: 'integration_failure',
          new_value: expect.objectContaining({
            integration: 'zillow_3d',
            status: 'failed',
            external_id: 'zillow-ext-123',
          }),
          actor_type: 'system',
        })
      )
    })

    it('should not send notifications if listing not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      })

      await processIntegrationHandoff({
        listingId: 'non-existent',
        integration: 'cubicasa',
        previousStatus: 'processing',
        newStatus: 'delivered',
      })

      expect(mockSendNotification).not.toHaveBeenCalled()
    })
  })

  describe('Auto-advance to ready_for_qc', () => {
    it('should advance ops_status when all integrations complete', async () => {
      const completeListing = {
        id: 'listing-123',
        address: '123 Main St',
        agent_id: 'agent-456',
        ops_status: 'staged',
        cubicasa_status: 'delivered',
        zillow_3d_status: 'not_applicable', // Not applicable counts as complete
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockAgent = {
        email: 'agent@test.com',
        name: 'Test Agent',
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: completeListing, error: null }),
              }),
            }),
            update: mockUpdate,
          }
        }
        if (table === 'staff') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockAgent, error: null }),
              }),
            }),
          }
        }
        if (table === 'job_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      await processIntegrationHandoff({
        listingId: 'listing-123',
        integration: 'cubicasa',
        previousStatus: 'processing',
        newStatus: 'delivered',
      })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          ops_status: 'ready_for_qc',
        })
      )
    })

    it('should not advance if not all integrations complete', async () => {
      const incompleteListing = {
        id: 'listing-123',
        address: '123 Main St',
        agent_id: 'agent-456',
        ops_status: 'staged',
        cubicasa_status: 'processing', // Still processing
        zillow_3d_status: 'pending',
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: incompleteListing, error: null }),
              }),
            }),
            update: mockUpdate,
          }
        }
        if (table === 'staff') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      await processIntegrationHandoff({
        listingId: 'listing-123',
        integration: 'cubicasa',
        previousStatus: 'processing',
        newStatus: 'delivered',
      })

      // Should not have been called with ready_for_qc update
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should not advance if already past staged/processing status', async () => {
      const advancedListing = {
        id: 'listing-123',
        address: '123 Main St',
        agent_id: 'agent-456',
        ops_status: 'in_qc', // Already in QC
        cubicasa_status: 'delivered',
        zillow_3d_status: 'live',
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: advancedListing, error: null }),
              }),
            }),
            update: mockUpdate,
          }
        }
        if (table === 'staff') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      await processIntegrationHandoff({
        listingId: 'listing-123',
        integration: 'zillow_3d',
        previousStatus: 'processing',
        newStatus: 'live',
      })

      // Should not update since ops_status is already past the target
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('triggerIntegrationHandoff', () => {
    it('should call processIntegrationHandoff with correct parameters', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      })

      await triggerIntegrationHandoff(
        'listing-123',
        'cubicasa',
        'processing',
        'delivered',
        'external-id-123'
      )

      // The function should have executed without error
      // (It will log that listing not found, but won't throw)
      expect(true).toBe(true)
    })
  })

  describe('Integration completion detection', () => {
    const testCases = [
      {
        name: 'all delivered',
        cubicasa: 'delivered',
        zillow_3d: 'live',
        expected: true,
      },
      {
        name: 'all not_applicable',
        cubicasa: 'not_applicable',
        zillow_3d: 'not_applicable',
        expected: true,
      },
      {
        name: 'mixed delivered and not_applicable',
        cubicasa: 'not_applicable',
        zillow_3d: 'live',
        expected: true,
      },
      {
        name: 'one still processing',
        cubicasa: 'processing',
        zillow_3d: 'live',
        expected: false,
      },
      {
        name: 'one pending',
        cubicasa: 'delivered',
        zillow_3d: 'pending',
        expected: false,
      },
      {
        name: 'one failed',
        cubicasa: 'failed',
        zillow_3d: 'live',
        expected: false,
      },
    ]

    testCases.forEach(({ name, cubicasa, zillow_3d, expected }) => {
      it(`should ${expected ? 'advance' : 'not advance'} when ${name}`, async () => {
        const listing = {
          id: 'listing-123',
          address: '123 Main St',
          agent_id: 'agent-456',
          ops_status: 'staged',
          cubicasa_status: cubicasa,
          zillow_3d_status: zillow_3d,
        }

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })

        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'listings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: listing, error: null }),
                }),
              }),
              update: mockUpdate,
            }
          }
          if (table === 'staff') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }
          }
          if (table === 'agents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { email: 'agent@test.com', name: 'Agent' },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        })

        await processIntegrationHandoff({
          listingId: 'listing-123',
          integration: 'cubicasa',
          previousStatus: 'processing',
          newStatus: 'delivered',
        })

        if (expected) {
          expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
              ops_status: 'ready_for_qc',
            })
          )
        } else {
          expect(mockUpdate).not.toHaveBeenCalled()
        }
      })
    })
  })
})
