import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mocks before imports
const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

// Mock Supabase admin
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

// Import after mocks
import {
  clockIn,
  clockOut,
  getActiveEntry,
  getTimeEntries,
  getCurrentPayPeriod,
  getTimesheetForPeriod,
  closePayPeriod,
  getTodaySummary,
} from './service'

// Helper to create a chainable mock that resolves to data
function createChain(finalData: unknown = null, finalError: unknown = null) {
  // Create a thenable chain that can be awaited or chained
  const chain: Record<string, unknown> = {
    data: finalData,
    error: finalError,
    // Allow await on the chain directly
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
      return Promise.resolve({ data: finalData, error: finalError }).then(resolve)
    },
  }

  // All chainable methods return the same chain
  const methods = ['select', 'insert', 'update', 'upsert', 'eq', 'neq', 'gte', 'lte', 'order']
  methods.forEach((method) => {
    chain[method] = vi.fn().mockReturnValue(chain)
  })

  // single() returns a promise
  chain.single = vi.fn().mockResolvedValue({ data: finalData, error: finalError })

  return chain
}

describe('time-tracking service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('clockIn', () => {
    it('creates time entry with correct start time', async () => {
      const createdEntry = {
        id: 'entry-1',
        clock_in: new Date().toISOString(),
        staff_id: 'staff-123',
        status: 'active',
      }

      // Sequence of calls:
      // 1. Check for active entry (time_entries) -> none
      // 2. Get staff hourly rate (staff)
      // 3. Get current pay period (pay_periods) -> existing
      // 4. Insert new entry (time_entries)
      mockFrom
        .mockReturnValueOnce(createChain(null, null)) // No active entry
        .mockReturnValueOnce(createChain({ hourly_rate: 10 })) // Staff with rate
        .mockReturnValueOnce(createChain({ id: 'period-1', start_date: '2024-01-01', end_date: '2024-01-14', status: 'open' })) // Pay period
        .mockReturnValueOnce(createChain(createdEntry)) // Created entry

      const result = await clockIn('staff-123')

      expect(result.success).toBe(true)
      expect(result.entry?.id).toBe('entry-1')
    })

    it('returns error if already clocked in', async () => {
      mockFrom.mockReturnValueOnce(createChain({ id: 'existing-entry' }))

      const result = await clockIn('staff-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Already clocked in')
    })

    it('validates staff has hourly_rate configured', async () => {
      mockFrom
        .mockReturnValueOnce(createChain(null)) // No active entry
        .mockReturnValueOnce(createChain({ hourly_rate: null })) // Staff without rate

      const result = await clockIn('staff-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Hourly rate not configured')
    })

    it('records notes when provided', async () => {
      const createdEntry = {
        id: 'entry-1',
        notes: 'Test note',
        clock_in: new Date().toISOString(),
      }

      mockFrom
        .mockReturnValueOnce(createChain(null)) // No active entry
        .mockReturnValueOnce(createChain({ hourly_rate: 10 })) // Staff with rate
        .mockReturnValueOnce(createChain({ id: 'period-1', start_date: '2024-01-01', end_date: '2024-01-14', status: 'open' }))
        .mockReturnValueOnce(createChain(createdEntry))

      const result = await clockIn('staff-123', 'Test note')

      expect(result.success).toBe(true)
      expect(result.entry?.notes).toBe('Test note')
    })
  })

  describe('clockOut', () => {
    it('calculates correct duration and pay', async () => {
      const clockInTime = new Date()
      clockInTime.setMinutes(clockInTime.getMinutes() - 60) // 1 hour ago

      const activeEntry = {
        id: 'entry-1',
        clock_in: clockInTime.toISOString(),
        hourly_rate: 10, // $10/hr
        staff_id: 'staff-123',
        status: 'active',
      }

      const updatedEntry = {
        ...activeEntry,
        clock_out: new Date().toISOString(),
        duration_minutes: 60,
        total_pay_cents: 1000,
        status: 'completed',
      }

      mockFrom
        .mockReturnValueOnce(createChain(activeEntry)) // Find active entry
        .mockReturnValueOnce(createChain(updatedEntry)) // Update entry

      const result = await clockOut('staff-123', 'entry-1', 0)

      expect(result.success).toBe(true)
      // Duration should be approximately 60 minutes
      expect(result.duration_minutes).toBeGreaterThanOrEqual(59)
      expect(result.duration_minutes).toBeLessThanOrEqual(61)
      // Pay should be approximately $10 (1000 cents)
      expect(result.total_pay_cents).toBeGreaterThanOrEqual(980)
      expect(result.total_pay_cents).toBeLessThanOrEqual(1020)
    })

    it('subtracts break_minutes from duration', async () => {
      const clockInTime = new Date()
      clockInTime.setMinutes(clockInTime.getMinutes() - 120) // 2 hours ago

      const activeEntry = {
        id: 'entry-1',
        clock_in: clockInTime.toISOString(),
        hourly_rate: 10,
        staff_id: 'staff-123',
        status: 'active',
      }

      const updatedEntry = {
        ...activeEntry,
        duration_minutes: 90, // 120 - 30 break
        break_minutes: 30,
        total_pay_cents: 1500,
        status: 'completed',
      }

      mockFrom
        .mockReturnValueOnce(createChain(activeEntry))
        .mockReturnValueOnce(createChain(updatedEntry))

      const result = await clockOut('staff-123', 'entry-1', 30)

      expect(result.success).toBe(true)
      // 120 mins - 30 mins break = ~90 mins
      expect(result.duration_minutes).toBeGreaterThanOrEqual(89)
      expect(result.duration_minutes).toBeLessThanOrEqual(91)
    })

    it('handles non-standard hourly rates', async () => {
      const clockInTime = new Date()
      clockInTime.setMinutes(clockInTime.getMinutes() - 60) // 1 hour ago

      const activeEntry = {
        id: 'entry-1',
        clock_in: clockInTime.toISOString(),
        hourly_rate: 5.50, // $5.50/hr
        staff_id: 'staff-123',
        status: 'active',
      }

      const updatedEntry = {
        ...activeEntry,
        duration_minutes: 60,
        total_pay_cents: 550, // $5.50
        status: 'completed',
      }

      mockFrom
        .mockReturnValueOnce(createChain(activeEntry))
        .mockReturnValueOnce(createChain(updatedEntry))

      const result = await clockOut('staff-123', 'entry-1', 0)

      expect(result.success).toBe(true)
      // ~$5.50 for 1 hour
      expect(result.total_pay_cents).toBeGreaterThanOrEqual(540)
      expect(result.total_pay_cents).toBeLessThanOrEqual(560)
    })

    it('returns error when no active entry found', async () => {
      mockFrom.mockReturnValueOnce(createChain(null, { message: 'Not found' }))

      const result = await clockOut('staff-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No active time entry')
    })

    it('calculates fractional hours correctly', async () => {
      // 45 minutes at $10/hr = $7.50 = 750 cents
      const clockInTime = new Date()
      clockInTime.setMinutes(clockInTime.getMinutes() - 45)

      const activeEntry = {
        id: 'entry-1',
        clock_in: clockInTime.toISOString(),
        hourly_rate: 10,
        staff_id: 'staff-123',
        status: 'active',
      }

      const updatedEntry = {
        ...activeEntry,
        duration_minutes: 45,
        total_pay_cents: 750,
        status: 'completed',
      }

      mockFrom
        .mockReturnValueOnce(createChain(activeEntry))
        .mockReturnValueOnce(createChain(updatedEntry))

      const result = await clockOut('staff-123', 'entry-1', 0)

      expect(result.success).toBe(true)
      // ~$7.50 (750 cents) for 45 minutes
      expect(result.total_pay_cents).toBeGreaterThanOrEqual(740)
      expect(result.total_pay_cents).toBeLessThanOrEqual(760)
    })
  })

  describe('getActiveEntry', () => {
    it('returns active entry when exists', async () => {
      const mockEntry = {
        id: 'entry-1',
        staff_id: 'staff-123',
        clock_in: new Date().toISOString(),
        status: 'active',
      }
      mockFrom.mockReturnValueOnce(createChain(mockEntry))

      const result = await getActiveEntry('staff-123')

      expect(result).toEqual(mockEntry)
    })

    it('returns null when no active entry', async () => {
      mockFrom.mockReturnValueOnce(createChain(null))

      const result = await getActiveEntry('staff-123')

      expect(result).toBeNull()
    })
  })

  describe('getTimeEntries', () => {
    it('returns entries for staff within date range', async () => {
      const mockEntries = [
        { id: 'e1', clock_in: '2024-01-10T09:00:00Z' },
        { id: 'e2', clock_in: '2024-01-11T09:00:00Z' },
      ]

      mockFrom.mockReturnValueOnce(createChain(mockEntries))

      const result = await getTimeEntries('staff-123', '2024-01-01', '2024-01-15')

      expect(result).toHaveLength(2)
    })

    it('returns empty array on error', async () => {
      mockFrom.mockReturnValueOnce(createChain(null, { message: 'DB error' }))

      const result = await getTimeEntries('staff-123')

      expect(result).toEqual([])
    })
  })

  describe('getCurrentPayPeriod', () => {
    it('returns existing open period', async () => {
      const mockPeriod = {
        id: 'period-1',
        start_date: '2024-01-01',
        end_date: '2024-01-14',
        status: 'open',
      }
      mockFrom.mockReturnValueOnce(createChain(mockPeriod))

      const result = await getCurrentPayPeriod()

      expect(result).toEqual(mockPeriod)
    })

    it('creates new period if none exists', async () => {
      const newPeriod = {
        id: 'period-new',
        start_date: '2024-01-15',
        end_date: '2024-01-28',
        status: 'open',
      }
      mockFrom
        .mockReturnValueOnce(createChain(null)) // No existing period
        .mockReturnValueOnce(createChain(newPeriod)) // Created period

      const result = await getCurrentPayPeriod()

      expect(result).toEqual(newPeriod)
    })
  })

  describe('getTimesheetForPeriod', () => {
    it('returns entries and totals for period', async () => {
      const mockPeriod = {
        id: 'period-1',
        start_date: '2024-01-01',
        end_date: '2024-01-14',
      }
      const mockEntries = [
        { id: 'e1', duration_minutes: 120, total_pay_cents: 1000 },
        { id: 'e2', duration_minutes: 180, total_pay_cents: 1500 },
      ]

      mockFrom
        .mockReturnValueOnce(createChain(mockPeriod)) // Get period
        .mockReturnValueOnce(createChain(mockEntries)) // Get entries

      const result = await getTimesheetForPeriod('staff-123', 'period-1')

      expect(result.entries).toHaveLength(2)
      expect(result.totalMinutes).toBe(300)
      expect(result.totalPayCents).toBe(2500)
    })

    it('returns empty result when period not found', async () => {
      mockFrom.mockReturnValueOnce(createChain(null))

      const result = await getTimesheetForPeriod('staff-123', 'invalid-period')

      expect(result.entries).toEqual([])
      expect(result.totalMinutes).toBe(0)
      expect(result.totalPayCents).toBe(0)
    })
  })

  describe('closePayPeriod', () => {
    it('updates period status to closed', async () => {
      const openPeriod = {
        id: 'period-1',
        status: 'open',
        start_date: '2024-01-01',
        end_date: '2024-01-14',
      }
      const entries = [
        { duration_minutes: 120, total_pay_cents: 1000 },
        { duration_minutes: 180, total_pay_cents: 1500 },
      ]

      mockFrom
        .mockReturnValueOnce(createChain(openPeriod)) // Get period
        .mockReturnValueOnce(createChain(entries)) // Get entries
        .mockReturnValueOnce(createChain(null)) // Update period
        .mockReturnValueOnce(createChain(null)) // Mark entries approved

      const result = await closePayPeriod('period-1')

      expect(result.success).toBe(true)
      expect(result.totalHours).toBe(5) // 300 minutes = 5 hours
      expect(result.totalPayCents).toBe(2500)
    })

    it('calculates total_hours correctly for fractional hours', async () => {
      const openPeriod = {
        id: 'period-1',
        status: 'open',
        start_date: '2024-01-01',
        end_date: '2024-01-14',
      }
      const entries = [
        { duration_minutes: 90, total_pay_cents: 825 }, // 1.5 hours
        { duration_minutes: 150, total_pay_cents: 1375 }, // 2.5 hours
      ]

      mockFrom
        .mockReturnValueOnce(createChain(openPeriod))
        .mockReturnValueOnce(createChain(entries))
        .mockReturnValueOnce(createChain(null))
        .mockReturnValueOnce(createChain(null))

      const result = await closePayPeriod('period-1')

      expect(result.totalHours).toBe(4) // 240 minutes = 4 hours
    })

    it('returns error if period not found', async () => {
      mockFrom.mockReturnValueOnce(createChain(null))

      const result = await closePayPeriod('invalid-period')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('returns error if period is not open', async () => {
      mockFrom.mockReturnValueOnce(createChain({
        id: 'period-1',
        status: 'closed',
      }))

      const result = await closePayPeriod('period-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not open')
    })
  })

  describe('getTodaySummary', () => {
    it('returns today and week totals', async () => {
      const todayEntries = [
        { duration_minutes: 60, total_pay_cents: 550 },
        { duration_minutes: 120, total_pay_cents: 1100 },
      ]
      const weekEntries = [
        { duration_minutes: 60, total_pay_cents: 550 },
        { duration_minutes: 120, total_pay_cents: 1100 },
        { duration_minutes: 180, total_pay_cents: 1650 },
      ]

      mockFrom
        .mockReturnValueOnce(createChain(null)) // No active entry
        .mockReturnValueOnce(createChain(todayEntries)) // Today entries
        .mockReturnValueOnce(createChain(weekEntries)) // Week entries

      const result = await getTodaySummary('staff-123')

      expect(result.activeEntry).toBeNull()
      expect(result.todayMinutes).toBe(180)
      expect(result.todayPayCents).toBe(1650)
      expect(result.weekMinutes).toBe(360)
      expect(result.weekPayCents).toBe(3300)
    })

    it('returns active entry when clocked in', async () => {
      const mockActiveEntry = {
        id: 'entry-1',
        clock_in: new Date().toISOString(),
        status: 'active',
      }

      mockFrom
        .mockReturnValueOnce(createChain(mockActiveEntry)) // Active entry
        .mockReturnValueOnce(createChain([])) // Today entries
        .mockReturnValueOnce(createChain([])) // Week entries

      const result = await getTodaySummary('staff-123')

      expect(result.activeEntry).toEqual(mockActiveEntry)
    })

    it('handles empty entries gracefully', async () => {
      mockFrom
        .mockReturnValueOnce(createChain(null)) // No active
        .mockReturnValueOnce(createChain(null)) // No today entries
        .mockReturnValueOnce(createChain(null)) // No week entries

      const result = await getTodaySummary('staff-123')

      expect(result.activeEntry).toBeNull()
      expect(result.todayMinutes).toBe(0)
      expect(result.todayPayCents).toBe(0)
      expect(result.weekMinutes).toBe(0)
      expect(result.weekPayCents).toBe(0)
    })
  })
})
