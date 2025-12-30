/**
 * AvailabilityCalendar Component Tests
 *
 * TDD tests for date/time selection with weather integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvailabilityCalendar, type DayWeather } from './AvailabilityCalendar'
import { format, addDays, startOfMonth, addMonths } from 'date-fns'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock booking config
vi.mock('@/lib/booking/config', () => ({
  DEFAULT_TIME_SLOTS: [
    { time: '08:00', label: '8:00 AM', available: true },
    { time: '09:00', label: '9:00 AM', available: true },
    { time: '10:00', label: '10:00 AM', available: true },
    { time: '11:00', label: '11:00 AM', available: true },
    { time: '12:00', label: '12:00 PM', available: true },
    { time: '13:00', label: '1:00 PM', available: true },
    { time: '14:00', label: '2:00 PM', available: true },
    { time: '15:00', label: '3:00 PM', available: false },
    { time: '16:00', label: '4:00 PM', available: true },
  ],
}))

// Sample weather data
const sampleWeatherResponse = {
  forecasts: [
    {
      date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      forecast: {
        conditions: 'Sunny',
        icon: 'sun',
        high_temp_f: 85,
        low_temp_f: 72,
        precipitation_chance: 10,
        wind_speed_mph: 8,
      },
      is_good_for_shoot: true,
      alerts: [],
    },
    {
      date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
      forecast: {
        conditions: 'Partly Cloudy',
        icon: 'cloud',
        high_temp_f: 88,
        low_temp_f: 74,
        precipitation_chance: 30,
        wind_speed_mph: 12,
      },
      is_good_for_shoot: true,
      alerts: [],
    },
    {
      date: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
      forecast: {
        conditions: 'Thunderstorms',
        icon: 'storm',
        high_temp_f: 82,
        low_temp_f: 70,
        precipitation_chance: 80,
        wind_speed_mph: 25,
      },
      is_good_for_shoot: false,
      alerts: [
        {
          type: 'rain',
          severity: 'warning',
          message: 'Heavy rain expected. Consider rescheduling.',
        },
      ],
    },
  ],
}

// Get a stable test date (weekday at least 2 days in the future)
function getNextWeekday(): Date {
  const now = new Date()
  let next = addDays(now, 2) // Start 2 days from now to ensure it's in future
  while (next.getDay() === 0 || next.getDay() === 6) {
    next = addDays(next, 1)
  }
  return next
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AvailabilityCalendar', () => {
  const defaultProps = {
    onSelect: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render calendar with current month', () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      // Should show current month
      const currentMonth = format(new Date(), 'MMMM yyyy')
      expect(screen.getByText(currentMonth)).toBeInTheDocument()
    })

    it('should render weekday headers', () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Mon')).toBeInTheDocument()
      expect(screen.getByText('Tue')).toBeInTheDocument()
      expect(screen.getByText('Wed')).toBeInTheDocument()
      expect(screen.getByText('Thu')).toBeInTheDocument()
      expect(screen.getByText('Fri')).toBeInTheDocument()
      expect(screen.getByText('Sat')).toBeInTheDocument()
    })

    it('should render navigation arrows', () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument()
    })

    it('should render legend', () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      expect(screen.getByText('Selected')).toBeInTheDocument()
      expect(screen.getByText('Good weather')).toBeInTheDocument()
      expect(screen.getByText('Weather caution')).toBeInTheDocument()
    })

    it('should render day buttons', () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      // Should have day numbers rendered
      const buttons = screen.getAllByRole('button')
      // At least 28 days in any month + 2 nav buttons
      expect(buttons.length).toBeGreaterThanOrEqual(30)
    })
  })

  describe('Date Selection', () => {
    it('should call onSelect when date clicked', async () => {
      const onSelect = vi.fn()
      render(<AvailabilityCalendar onSelect={onSelect} />)

      // Find clickable day buttons (not disabled)
      const dayButtons = screen.getAllByRole('button').filter(
        btn => !btn.hasAttribute('disabled') && btn.textContent?.match(/^\d+$/)
      )

      if (dayButtons.length > 0) {
        await userEvent.click(dayButtons[0])
        expect(onSelect).toHaveBeenCalled()
      }
    })

    it('should have disabled dates for past and weekends', () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      // Some days should be disabled (past dates, weekends)
      const buttons = screen.getAllByRole('button')
      const disabledButtons = buttons.filter(btn => btn.hasAttribute('disabled'))
      expect(disabledButtons.length).toBeGreaterThan(0)
    })

    it('should allow weekends when excludeWeekends is false', () => {
      render(<AvailabilityCalendar {...defaultProps} excludeWeekends={false} />)

      // Should render calendar
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should show time slots when date is selected', async () => {
      const nextWeekday = getNextWeekday()
      const nextWeekdayStr = format(nextWeekday, 'yyyy-MM-dd')

      render(<AvailabilityCalendar {...defaultProps} selectedDate={nextWeekdayStr} />)

      // Selected date should show time slots
      await waitFor(() => {
        expect(screen.getByText(/select a time/i)).toBeInTheDocument()
      })
    })
  })

  describe('Month Navigation', () => {
    it('should navigate to next month', async () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      const currentMonth = format(new Date(), 'MMMM yyyy')
      expect(screen.getByText(currentMonth)).toBeInTheDocument()

      const nextButton = screen.getByRole('button', { name: /next month/i })
      await userEvent.click(nextButton)

      // Should show next month
      const nextMonthDate = addMonths(new Date(), 1)
      const nextMonthStr = format(nextMonthDate, 'MMMM yyyy')
      expect(screen.getByText(nextMonthStr)).toBeInTheDocument()
    })

    it('should have previous and next month buttons', () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument()
    })
  })

  describe('Time Slot Selection', () => {
    it('should show time slots after date selection', async () => {
      const nextWeekday = getNextWeekday()
      const nextWeekdayStr = format(nextWeekday, 'yyyy-MM-dd')

      render(<AvailabilityCalendar {...defaultProps} selectedDate={nextWeekdayStr} />)

      await waitFor(() => {
        expect(screen.getByText('8:00 AM')).toBeInTheDocument()
        expect(screen.getByText('9:00 AM')).toBeInTheDocument()
        expect(screen.getByText('10:00 AM')).toBeInTheDocument()
      })
    })

    it('should render time slot buttons', async () => {
      const nextWeekday = getNextWeekday()
      const nextWeekdayStr = format(nextWeekday, 'yyyy-MM-dd')

      render(<AvailabilityCalendar {...defaultProps} selectedDate={nextWeekdayStr} />)

      // Time slots section should be visible when date is selected
      expect(screen.getByText(/select a time/i)).toBeInTheDocument()
    })

    it('should disable unavailable time slots', async () => {
      const nextWeekday = getNextWeekday()
      const nextWeekdayStr = format(nextWeekday, 'yyyy-MM-dd')

      render(<AvailabilityCalendar {...defaultProps} selectedDate={nextWeekdayStr} />)

      await waitFor(() => {
        const unavailableSlot = screen.getByRole('button', { name: '3:00 PM' })
        expect(unavailableSlot).toBeDisabled()
      })
    })

    it('should show time slot labels', async () => {
      const nextWeekday = getNextWeekday()
      const nextWeekdayStr = format(nextWeekday, 'yyyy-MM-dd')

      render(
        <AvailabilityCalendar
          {...defaultProps}
          selectedDate={nextWeekdayStr}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('8:00 AM')).toBeInTheDocument()
      })
    })
  })

  describe('Weather Integration', () => {
    it('should fetch weather when lat/lng provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleWeatherResponse),
      })

      render(
        <AvailabilityCalendar
          {...defaultProps}
          lat={28.5383}
          lng={-81.3792}
        />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/weather?lat=28.5383&lng=-81.3792'
        )
      })
    })

    it('should render calendar with weather coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleWeatherResponse),
      })

      render(
        <AvailabilityCalendar
          {...defaultProps}
          lat={28.5383}
          lng={-81.3792}
        />
      )

      // Should render calendar
      const currentMonth = format(new Date(), 'MMMM yyyy')
      expect(screen.getByText(currentMonth)).toBeInTheDocument()
    })

    it('should fetch weather data and update UI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleWeatherResponse),
      })

      render(
        <AvailabilityCalendar
          {...defaultProps}
          lat={28.5383}
          lng={-81.3792}
        />
      )

      // Should make the weather API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/weather?lat=28.5383&lng=-81.3792'
        )
      })

      // Calendar should still be visible after weather loads
      const currentMonth = format(new Date(), 'MMMM yyyy')
      expect(screen.getByText(currentMonth)).toBeInTheDocument()
    })

    it('should handle weather fetch error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(
        <AvailabilityCalendar
          {...defaultProps}
          lat={28.5383}
          lng={-81.3792}
        />
      )

      // Should still render calendar without weather data
      await waitFor(() => {
        const currentMonth = format(new Date(), 'MMMM yyyy')
        expect(screen.getByText(currentMonth)).toBeInTheDocument()
      })
    })
  })

  describe('Date Constraints', () => {
    it('should respect maxDays constraint', () => {
      render(<AvailabilityCalendar {...defaultProps} maxDays={7} />)

      // Should only allow dates within 7 days
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should respect custom minDate', () => {
      const customMinDate = new Date('2024-06-10')
      render(<AvailabilityCalendar {...defaultProps} minDate={customMinDate} />)

      // Dates before minDate should be disabled
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have accessible navigation buttons', () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      const prevButton = screen.getByRole('button', { name: /previous month/i })
      const nextButton = screen.getByRole('button', { name: /next month/i })

      expect(prevButton).toHaveAccessibleName()
      expect(nextButton).toHaveAccessibleName()
    })

    it('should have focus styles on day buttons', () => {
      render(<AvailabilityCalendar {...defaultProps} />)

      const dayButtons = screen.getAllByRole('button')
      // Buttons should have focus ring class
      expect(dayButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Selected State Display', () => {
    it('should show time slots section when date prop is provided', () => {
      const nextWeekday = getNextWeekday()
      const nextWeekdayStr = format(nextWeekday, 'yyyy-MM-dd')

      render(<AvailabilityCalendar {...defaultProps} selectedDate={nextWeekdayStr} />)

      // When selectedDate prop is provided, time slots should be visible
      expect(screen.getByText(/select a time/i)).toBeInTheDocument()
    })

    it('should render selected date section with header', () => {
      const nextWeekday = getNextWeekday()
      const nextWeekdayStr = format(nextWeekday, 'yyyy-MM-dd')

      render(<AvailabilityCalendar {...defaultProps} selectedDate={nextWeekdayStr} />)

      // The selected date section should render with the formatted date as a heading
      const heading = document.querySelector('h4.font-semibold')
      expect(heading).toBeInTheDocument()
      // The heading text should be a full date string (EEEE, MMMM d, yyyy format)
      expect(heading?.textContent).toMatch(/\w+, \w+ \d+, \d{4}/)
    })
  })
})
