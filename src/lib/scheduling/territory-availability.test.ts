import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkTerritoryAvailability,
  getTerritoriesForLocation,
  getPhotographersByTerritory,
  getTerritorySchedule,
  type TerritorySchedule,
  type TerritoryAvailabilityResult,
} from './territory-availability'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

describe('Territory Availability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTerritoriesForLocation', () => {
    it('should find territories containing a location', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          contains: () =>
            Promise.resolve({
              data: [
                { id: 'territory-1', name: 'Orlando Metro', zip_codes: ['32801', '32802', '32803'] },
              ],
              error: null,
            }),
        }),
      })

      const territories = await getTerritoriesForLocation('32801')

      expect(territories).toHaveLength(1)
      expect(territories[0].name).toBe('Orlando Metro')
    })

    it('should return empty array for unknown zip codes', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          contains: () =>
            Promise.resolve({
              data: [],
              error: null,
            }),
        }),
      })

      const territories = await getTerritoriesForLocation('99999')

      expect(territories).toHaveLength(0)
    })

    it('should find multiple territories for overlapping areas', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          contains: () =>
            Promise.resolve({
              data: [
                { id: 'territory-1', name: 'Orlando Metro', zip_codes: ['32801'] },
                { id: 'territory-2', name: 'Downtown Orlando', zip_codes: ['32801'] },
              ],
              error: null,
            }),
        }),
      })

      const territories = await getTerritoriesForLocation('32801')

      expect(territories).toHaveLength(2)
    })
  })

  describe('getPhotographersByTerritory', () => {
    it('should return photographers assigned to a territory', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [
                {
                  staff_id: 'photo-1',
                  is_primary: true,
                  staff: { id: 'photo-1', name: 'John Doe', role: 'photographer' },
                },
                {
                  staff_id: 'photo-2',
                  is_primary: false,
                  staff: { id: 'photo-2', name: 'Jane Smith', role: 'photographer' },
                },
              ],
              error: null,
            }),
        }),
      })

      const photographers = await getPhotographersByTerritory('territory-1')

      expect(photographers).toHaveLength(2)
      expect(photographers[0].is_primary).toBe(true)
    })

    it('should return empty array for territory with no photographers', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [],
              error: null,
            }),
        }),
      })

      const photographers = await getPhotographersByTerritory('territory-empty')

      expect(photographers).toHaveLength(0)
    })
  })

  describe('getTerritorySchedule', () => {
    it('should return schedule for a territory and day of week', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'schedule-1',
                    territory_id: 'territory-1',
                    day_of_week: 1, // Monday
                    is_available: true,
                    start_time: '08:00',
                    end_time: '17:00',
                    max_appointments: 8,
                  },
                  error: null,
                }),
            }),
          }),
        }),
      })

      const schedule = await getTerritorySchedule('territory-1', 1)

      expect(schedule).not.toBeNull()
      expect(schedule?.is_available).toBe(true)
      expect(schedule?.start_time).toBe('08:00')
      expect(schedule?.end_time).toBe('17:00')
    })

    it('should return null for unavailable days', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
            }),
          }),
        }),
      })

      const schedule = await getTerritorySchedule('territory-1', 0) // Sunday

      expect(schedule).toBeNull()
    })
  })

  describe('checkTerritoryAvailability', () => {
    it('should return available for valid territory and date', async () => {
      // Mock territory lookup
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: () => ({
            contains: () =>
              Promise.resolve({
                data: [{ id: 'territory-1', name: 'Orlando Metro' }],
                error: null,
              }),
          }),
        })
        // Mock schedule lookup
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      is_available: true,
                      start_time: '08:00',
                      end_time: '17:00',
                      max_appointments: 8,
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        })
        // Mock existing appointments count
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    count: 3,
                    error: null,
                  }),
              }),
            }),
          }),
        })

      const result = await checkTerritoryAvailability('32801', new Date('2025-01-06')) // Monday

      expect(result.available).toBe(true)
      expect(result.slots_remaining).toBe(5) // 8 max - 3 booked
    })

    it('should return unavailable when territory is closed on that day', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: () => ({
            contains: () =>
              Promise.resolve({
                data: [{ id: 'territory-1', name: 'Orlando Metro' }],
                error: null,
              }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { is_available: false },
                    error: null,
                  }),
              }),
            }),
          }),
        })

      const result = await checkTerritoryAvailability('32801', new Date('2025-01-05')) // Sunday

      expect(result.available).toBe(false)
      expect(result.reason).toContain('closed')
    })

    it('should return unavailable when fully booked', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: () => ({
            contains: () =>
              Promise.resolve({
                data: [{ id: 'territory-1', name: 'Orlando Metro' }],
                error: null,
              }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      is_available: true,
                      max_appointments: 8,
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    count: 8, // All slots taken
                    error: null,
                  }),
              }),
            }),
          }),
        })

      const result = await checkTerritoryAvailability('32801', new Date('2025-01-06'))

      expect(result.available).toBe(false)
      expect(result.slots_remaining).toBe(0)
      expect(result.reason).toContain('booked')
    })

    it('should return unavailable for unknown zip code', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          contains: () =>
            Promise.resolve({
              data: [],
              error: null,
            }),
        }),
      })

      const result = await checkTerritoryAvailability('99999', new Date('2025-01-06'))

      expect(result.available).toBe(false)
      expect(result.reason).toContain('not serviceable')
    })
  })
})

describe('Territory Schedule Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should support different schedules for different days', async () => {
    const schedules: Record<number, Partial<TerritorySchedule>> = {
      1: { is_available: true, start_time: '08:00', end_time: '17:00' }, // Monday
      2: { is_available: true, start_time: '08:00', end_time: '17:00' }, // Tuesday
      3: { is_available: true, start_time: '09:00', end_time: '16:00' }, // Wednesday (shorter)
      4: { is_available: true, start_time: '08:00', end_time: '17:00' }, // Thursday
      5: { is_available: true, start_time: '08:00', end_time: '15:00' }, // Friday (early)
      6: { is_available: false }, // Saturday - closed
      0: { is_available: false }, // Sunday - closed
    }

    // Test each day
    for (const [dayNum, expectedSchedule] of Object.entries(schedules)) {
      mockSupabaseFrom.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { day_of_week: Number(dayNum), ...expectedSchedule },
                  error: null,
                }),
            }),
          }),
        }),
      })

      const schedule = await getTerritorySchedule('territory-1', Number(dayNum))

      if (expectedSchedule.is_available) {
        expect(schedule?.is_available).toBe(true)
        expect(schedule?.start_time).toBe(expectedSchedule.start_time)
      } else {
        expect(schedule?.is_available).toBe(false)
      }
    }
  })
})
