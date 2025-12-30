import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateArrivalWindows,
  formatArrivalWindow,
  isWithinWindow,
  confirmArrivalTime,
  getWindowForTime,
  type ArrivalWindow,
  type ArrivalWindowConfig,
} from './arrival-windows'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

describe('Arrival Windows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateArrivalWindows', () => {
    it('should generate 1-hour windows for standard booking', () => {
      const config: ArrivalWindowConfig = {
        start_time: '08:00',
        end_time: '17:00',
        window_duration_minutes: 60,
        buffer_between_windows: 0,
      }

      const windows = generateArrivalWindows(config)

      expect(windows.length).toBe(9) // 8am, 9am, 10am, 11am, 12pm, 1pm, 2pm, 3pm, 4pm
      expect(windows[0].start).toBe('08:00')
      expect(windows[0].end).toBe('09:00')
      expect(windows[8].start).toBe('16:00')
      expect(windows[8].end).toBe('17:00')
    })

    it('should generate 2-hour windows', () => {
      const config: ArrivalWindowConfig = {
        start_time: '09:00',
        end_time: '17:00',
        window_duration_minutes: 120,
        buffer_between_windows: 0,
      }

      const windows = generateArrivalWindows(config)

      expect(windows.length).toBe(4) // 9-11, 11-1, 1-3, 3-5
      expect(windows[0].start).toBe('09:00')
      expect(windows[0].end).toBe('11:00')
    })

    it('should handle buffer between windows', () => {
      const config: ArrivalWindowConfig = {
        start_time: '08:00',
        end_time: '12:00',
        window_duration_minutes: 60,
        buffer_between_windows: 30,
      }

      const windows = generateArrivalWindows(config)

      // With 30 min buffer: 8-9, 9:30-10:30, 11-12
      expect(windows.length).toBe(3)
      expect(windows[0].end).toBe('09:00')
      expect(windows[1].start).toBe('09:30')
    })

    it('should return empty array for invalid config', () => {
      const config: ArrivalWindowConfig = {
        start_time: '17:00',
        end_time: '08:00', // End before start
        window_duration_minutes: 60,
        buffer_between_windows: 0,
      }

      const windows = generateArrivalWindows(config)

      expect(windows.length).toBe(0)
    })

    it('should include window IDs', () => {
      const config: ArrivalWindowConfig = {
        start_time: '10:00',
        end_time: '14:00',
        window_duration_minutes: 60,
        buffer_between_windows: 0,
      }

      const windows = generateArrivalWindows(config)

      expect(windows[0].id).toBe('10:00-11:00')
      expect(windows[1].id).toBe('11:00-12:00')
    })
  })

  describe('formatArrivalWindow', () => {
    it('should format window as human-readable string', () => {
      const window: ArrivalWindow = {
        id: '10:00-11:00',
        start: '10:00',
        end: '11:00',
      }

      const formatted = formatArrivalWindow(window)

      expect(formatted).toBe('10:00 AM - 11:00 AM')
    })

    it('should handle PM times', () => {
      const window: ArrivalWindow = {
        id: '14:00-16:00',
        start: '14:00',
        end: '16:00',
      }

      const formatted = formatArrivalWindow(window)

      expect(formatted).toBe('2:00 PM - 4:00 PM')
    })

    it('should handle noon correctly', () => {
      const window: ArrivalWindow = {
        id: '12:00-13:00',
        start: '12:00',
        end: '13:00',
      }

      const formatted = formatArrivalWindow(window)

      expect(formatted).toBe('12:00 PM - 1:00 PM')
    })

    it('should support short format', () => {
      const window: ArrivalWindow = {
        id: '09:00-10:00',
        start: '09:00',
        end: '10:00',
      }

      const formatted = formatArrivalWindow(window, { short: true })

      expect(formatted).toBe('9-10 AM')
    })
  })

  describe('isWithinWindow', () => {
    it('should return true when time is within window', () => {
      const window: ArrivalWindow = {
        id: '10:00-11:00',
        start: '10:00',
        end: '11:00',
      }

      expect(isWithinWindow('10:00', window)).toBe(true)
      expect(isWithinWindow('10:30', window)).toBe(true)
      expect(isWithinWindow('10:59', window)).toBe(true)
    })

    it('should return false when time is outside window', () => {
      const window: ArrivalWindow = {
        id: '10:00-11:00',
        start: '10:00',
        end: '11:00',
      }

      expect(isWithinWindow('09:59', window)).toBe(false)
      expect(isWithinWindow('11:00', window)).toBe(false) // End time is exclusive
      expect(isWithinWindow('11:01', window)).toBe(false)
    })

    it('should handle edge cases at start and end', () => {
      const window: ArrivalWindow = {
        id: '08:00-09:00',
        start: '08:00',
        end: '09:00',
      }

      expect(isWithinWindow('08:00', window)).toBe(true) // Start is inclusive
      expect(isWithinWindow('09:00', window)).toBe(false) // End is exclusive
    })
  })

  describe('getWindowForTime', () => {
    it('should find the window containing a specific time', () => {
      const windows: ArrivalWindow[] = [
        { id: '08:00-09:00', start: '08:00', end: '09:00' },
        { id: '09:00-10:00', start: '09:00', end: '10:00' },
        { id: '10:00-11:00', start: '10:00', end: '11:00' },
      ]

      const result = getWindowForTime('09:30', windows)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('09:00-10:00')
    })

    it('should return null when no window contains the time', () => {
      const windows: ArrivalWindow[] = [
        { id: '08:00-09:00', start: '08:00', end: '09:00' },
        { id: '10:00-11:00', start: '10:00', end: '11:00' },
      ]

      const result = getWindowForTime('09:30', windows)

      expect(result).toBeNull()
    })
  })

  describe('confirmArrivalTime', () => {
    it('should confirm a valid time within window', async () => {
      mockSupabaseFrom.mockReturnValue({
        update: () => ({
          eq: () =>
            Promise.resolve({
              data: { id: 'schedule-1', confirmed_arrival_time: '10:30' },
              error: null,
            }),
        }),
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'schedule-1',
                  arrival_window_start: '10:00',
                  arrival_window_end: '11:00',
                },
                error: null,
              }),
          }),
        }),
      })

      const result = await confirmArrivalTime('schedule-1', '10:30')

      expect(result.success).toBe(true)
      expect(result.confirmed_time).toBe('10:30')
    })

    it('should reject time outside of window', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'schedule-1',
                  arrival_window_start: '10:00',
                  arrival_window_end: '11:00',
                },
                error: null,
              }),
          }),
        }),
      })

      const result = await confirmArrivalTime('schedule-1', '11:30')

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside')
    })

    it('should handle schedule not found', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: { code: 'PGRST116' },
              }),
          }),
        }),
      })

      const result = await confirmArrivalTime('nonexistent', '10:30')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })
})

describe('Arrival Window Edge Cases', () => {
  describe('time parsing', () => {
    it('should handle midnight boundary', () => {
      const config: ArrivalWindowConfig = {
        start_time: '22:00',
        end_time: '23:00',
        window_duration_minutes: 60,
        buffer_between_windows: 0,
      }

      const windows = generateArrivalWindows(config)

      expect(windows.length).toBe(1)
      expect(windows[0].start).toBe('22:00')
      expect(windows[0].end).toBe('23:00')
    })

    it('should handle early morning windows', () => {
      const config: ArrivalWindowConfig = {
        start_time: '06:00',
        end_time: '08:00',
        window_duration_minutes: 60,
        buffer_between_windows: 0,
      }

      const windows = generateArrivalWindows(config)

      expect(windows.length).toBe(2)
      expect(windows[0].start).toBe('06:00')
    })
  })

  describe('30-minute windows', () => {
    it('should generate half-hour windows', () => {
      const config: ArrivalWindowConfig = {
        start_time: '09:00',
        end_time: '11:00',
        window_duration_minutes: 30,
        buffer_between_windows: 0,
      }

      const windows = generateArrivalWindows(config)

      expect(windows.length).toBe(4) // 9-9:30, 9:30-10, 10-10:30, 10:30-11
      expect(windows[0].end).toBe('09:30')
      expect(windows[1].start).toBe('09:30')
    })
  })

  describe('availability marking', () => {
    it('should mark windows as unavailable when booked', () => {
      const config: ArrivalWindowConfig = {
        start_time: '09:00',
        end_time: '12:00',
        window_duration_minutes: 60,
        buffer_between_windows: 0,
      }

      const bookedSlots = ['10:00-11:00']
      const windows = generateArrivalWindows(config, bookedSlots)

      const window10 = windows.find((w) => w.id === '10:00-11:00')
      const window11 = windows.find((w) => w.id === '11:00-12:00')

      expect(window10?.available).toBe(false)
      expect(window11?.available).toBe(true)
    })
  })
})
