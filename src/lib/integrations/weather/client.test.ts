import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getWeatherForecast, getWeatherIconUrl, formatTemp } from './client'
import type { DailyForecastResult } from './client'

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          gt: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  }),
}))

// Mock fetch for OpenWeatherMap API
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Weather Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default to no API key (will use mock data)
    vi.stubEnv('OPENWEATHERMAP_API_KEY', '')
  })

  describe('getWeatherForecast', () => {
    it('should return 7 days of forecasts', async () => {
      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      expect(forecasts).toHaveLength(7)
      expect(forecasts[0].date).toBeDefined()
      expect(forecasts[0].forecast).toBeDefined()
      expect(forecasts[0].alerts).toBeDefined()
      expect(forecasts[0].is_good_for_shoot).toBeDefined()
    })

    it('should include forecast details', async () => {
      const forecasts = await getWeatherForecast(28.5383, -81.3792)
      const firstDay = forecasts[0]

      expect(firstDay.forecast.conditions).toBeDefined()
      expect(firstDay.forecast.high_temp_f).toBeDefined()
      expect(firstDay.forecast.low_temp_f).toBeDefined()
      expect(firstDay.forecast.precipitation_chance).toBeDefined()
      expect(firstDay.forecast.wind_speed_mph).toBeDefined()
      expect(firstDay.forecast.humidity).toBeDefined()
      expect(firstDay.forecast.uv_index).toBeDefined()
    })

    it('should return dates in correct format', async () => {
      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      // Dates should be ISO format YYYY-MM-DD
      forecasts.forEach((f) => {
        expect(f.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })

    it('should return sequential dates', async () => {
      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      for (let i = 1; i < forecasts.length; i++) {
        const prevDate = new Date(forecasts[i - 1].date)
        const currDate = new Date(forecasts[i].date)
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        expect(diffDays).toBe(1)
      }
    })

    it('should identify good shooting conditions', async () => {
      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      forecasts.forEach((f) => {
        // Good for shoot should be boolean
        expect(typeof f.is_good_for_shoot).toBe('boolean')

        // If precipitation is high or storm, should not be good
        if (
          f.forecast.precipitation_chance >= 30 ||
          f.forecast.conditions.toLowerCase().includes('thunder')
        ) {
          expect(f.is_good_for_shoot).toBe(false)
        }
      })
    })

    it('should generate alerts for bad conditions', async () => {
      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      // Check that forecasts with bad conditions have alerts
      forecasts.forEach((f) => {
        if (f.forecast.precipitation_chance >= 30) {
          const hasRainAlert = f.alerts.some((a) => a.type === 'rain')
          expect(hasRainAlert).toBe(true)
        }

        if (f.forecast.wind_speed_mph >= 15) {
          const hasWindAlert = f.alerts.some((a) => a.type === 'wind')
          expect(hasWindAlert).toBe(true)
        }
      })
    })
  })

  describe('getWeatherForecast with real API', () => {
    beforeEach(() => {
      vi.stubEnv('OPENWEATHERMAP_API_KEY', 'test-api-key')
    })

    it('should call OpenWeatherMap API when configured', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            daily: Array(7)
              .fill(null)
              .map((_, i) => ({
                dt: Math.floor(Date.now() / 1000) + i * 86400,
                temp: { max: 85, min: 70 },
                weather: [{ main: 'Clear', icon: '01d', description: 'clear sky' }],
                pop: 0.1,
                wind_speed: 8,
                humidity: 65,
                uvi: 7,
                sunrise: Math.floor(Date.now() / 1000),
                sunset: Math.floor(Date.now() / 1000) + 43200,
              })),
          }),
      })

      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      expect(mockFetch).toHaveBeenCalled()
      expect(forecasts).toHaveLength(7)
      expect(forecasts[0].forecast.conditions).toBe('Clear')
    })

    it('should fallback to mock data on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      // Should still return 7 days (mock data)
      expect(forecasts).toHaveLength(7)
    })
  })

  describe('Weather Alert Severity', () => {
    it('should classify high precipitation as warning', async () => {
      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      forecasts.forEach((f) => {
        if (f.forecast.precipitation_chance >= 60) {
          const rainAlert = f.alerts.find((a) => a.type === 'rain')
          if (rainAlert) {
            expect(rainAlert.severity).toBe('warning')
          }
        }
      })
    })

    it('should classify moderate precipitation as caution', async () => {
      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      forecasts.forEach((f) => {
        if (f.forecast.precipitation_chance >= 30 && f.forecast.precipitation_chance < 60) {
          const rainAlert = f.alerts.find((a) => a.type === 'rain')
          if (rainAlert) {
            expect(rainAlert.severity).toBe('caution')
          }
        }
      })
    })

    it('should mark storms as warning severity', async () => {
      const forecasts = await getWeatherForecast(28.5383, -81.3792)

      forecasts.forEach((f) => {
        if (f.forecast.conditions.toLowerCase().includes('thunder')) {
          const stormAlert = f.alerts.find((a) => a.type === 'storm')
          if (stormAlert) {
            expect(stormAlert.severity).toBe('warning')
          }
        }
      })
    })
  })

  describe('getWeatherIconUrl', () => {
    it('should return correct OpenWeatherMap icon URL', () => {
      const url = getWeatherIconUrl('01d')
      expect(url).toBe('https://openweathermap.org/img/wn/01d@2x.png')
    })

    it('should handle night icons', () => {
      const url = getWeatherIconUrl('01n')
      expect(url).toBe('https://openweathermap.org/img/wn/01n@2x.png')
    })
  })

  describe('formatTemp', () => {
    it('should format temperature with degree symbol', () => {
      expect(formatTemp(75)).toBe('75°F')
      expect(formatTemp(32)).toBe('32°F')
      expect(formatTemp(100)).toBe('100°F')
    })

    it('should round decimal temperatures', () => {
      expect(formatTemp(75.6)).toBe('76°F')
      expect(formatTemp(75.4)).toBe('75°F')
    })

    it('should handle negative temperatures', () => {
      expect(formatTemp(-5)).toBe('-5°F')
    })
  })
})

describe('Weather Forecast Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OPENWEATHERMAP_API_KEY', '')
  })

  it('should identify good vs bad shoot days', async () => {
    const forecasts = await getWeatherForecast(28.5383, -81.3792)

    // Count good and bad days
    const goodDays = forecasts.filter((f) => f.is_good_for_shoot).length
    const badDays = forecasts.filter((f) => !f.is_good_for_shoot).length

    // Should have classification for all 7 days
    expect(goodDays + badDays).toBe(7)
  })

  it('should include sunrise and sunset times', async () => {
    const forecasts = await getWeatherForecast(28.5383, -81.3792)

    forecasts.forEach((f) => {
      expect(f.forecast.sunrise).toBeDefined()
      expect(f.forecast.sunset).toBeDefined()
      // Should be time strings
      expect(typeof f.forecast.sunrise).toBe('string')
      expect(typeof f.forecast.sunset).toBe('string')
    })
  })

  it('should have reasonable temperature ranges', async () => {
    const forecasts = await getWeatherForecast(28.5383, -81.3792)

    forecasts.forEach((f) => {
      // High should be higher than low
      expect(f.forecast.high_temp_f).toBeGreaterThanOrEqual(f.forecast.low_temp_f)

      // Temperatures should be reasonable for Florida
      expect(f.forecast.high_temp_f).toBeGreaterThan(40)
      expect(f.forecast.high_temp_f).toBeLessThan(120)
    })
  })
})
