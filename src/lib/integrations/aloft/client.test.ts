import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AloftClient, getAloftClient, createAloftClient } from './client'

// Mock the logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  formatError: (e: Error) => e.message,
}))

describe('Aloft Airspace Client', () => {
  let client: AloftClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new AloftClient()
  })

  describe('isConfigured', () => {
    it('should return false when no API key is set', () => {
      vi.stubEnv('ALOFT_API_KEY', '')
      const testClient = new AloftClient()
      expect(testClient.isConfigured()).toBe(false)
    })

    it('should return true when API key is provided', () => {
      const testClient = new AloftClient({ apiKey: 'test-key' })
      expect(testClient.isConfigured()).toBe(true)
    })
  })

  describe('checkAirspace', () => {
    it('should return clear airspace for residential areas', async () => {
      // A residential area far from major airports (Ocala area)
      const result = await client.checkAirspace({
        location: { latitude: 29.2, longitude: -82.1 },
        altitude_ft: 400,
      })

      expect(result.airspace_class).toBe('G')
      expect(result.can_fly).toBe(true)
      expect(result.needs_authorization).toBe(false)
    })

    it('should detect proximity to Orlando International Airport', async () => {
      // Very close to MCO
      const result = await client.checkAirspace({
        location: { latitude: 28.43, longitude: -81.31 },
        altitude_ft: 400,
      })

      expect(result.nearby_airports.length).toBeGreaterThan(0)
      expect(result.nearby_airports[0].icao_code).toBe('KMCO')
    })

    it('should restrict flights near Disney World', async () => {
      // Disney World location
      const result = await client.checkAirspace({
        location: { latitude: 28.385, longitude: -81.564 },
        altitude_ft: 200,
      })

      expect(result.can_fly).toBe(false)
      expect(result.authorization_status).toBe('prohibited')
      expect(result.restrictions.length).toBeGreaterThan(0)
    })

    it('should restrict flights near Kennedy Space Center', async () => {
      // Kennedy Space Center location
      const result = await client.checkAirspace({
        location: { latitude: 28.573, longitude: -80.649 },
        altitude_ft: 200,
      })

      expect(result.can_fly).toBe(false)
      expect(result.authorization_status).toBe('prohibited')
    })

    it('should include warnings for restricted areas', async () => {
      // Near Disney
      const result = await client.checkAirspace({
        location: { latitude: 28.385, longitude: -81.564 },
      })

      expect(result.warnings.length).toBeGreaterThan(0)
      // Warnings should mention the restriction
      expect(result.warnings.some(w => w.toLowerCase().includes('no-fly') || w.toLowerCase().includes('disney'))).toBe(true)
    })

    it('should handle default altitude of 400ft', async () => {
      const result = await client.checkAirspace({
        location: { latitude: 28.5, longitude: -81.4 },
      })

      // Should use default 400ft and be allowed in Class G
      expect(result.can_fly).toBe(true)
    })
  })

  describe('qualifyBookingLocation', () => {
    it('should return qualified for safe locations', async () => {
      // Use Ocala area coordinates - far from major airports
      const result = await client.qualifyBookingLocation(
        'listing-123',
        '123 Main St, Ocala, FL',
        { latitude: 29.2, longitude: -82.1 }
      )

      expect(result.qualified).toBe(true)
      expect(result.requires_authorization).toBe(false)
      expect(result.listing_id).toBe('listing-123')
    })

    it('should return not qualified for no-fly zones', async () => {
      const result = await client.qualifyBookingLocation(
        'listing-456',
        '1 Disney World Dr, Orlando, FL',
        { latitude: 28.385, longitude: -81.564 }
      )

      expect(result.qualified).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should include estimated approval time', async () => {
      const result = await client.qualifyBookingLocation(
        'listing-789',
        '100 Test Ave, Orlando, FL',
        { latitude: 28.5, longitude: -81.4 }
      )

      expect(result.estimated_approval_time).toBeDefined()
      // For clear airspace, should be instant
      expect(result.estimated_approval_time).toBe('instant')
    })

    it('should indicate LAANC availability near airports', async () => {
      // Near MCO but not in prohibited zone
      const result = await client.qualifyBookingLocation(
        'listing-101',
        '500 Airport Blvd',
        { latitude: 28.45, longitude: -81.35 }
      )

      // Should indicate LAANC is available
      if (result.requires_authorization) {
        expect(result.laanc_available).toBe(true)
      }
    })

    it('should include airspace summary', async () => {
      const result = await client.qualifyBookingLocation(
        'listing-102',
        '200 Main St',
        { latitude: 28.5, longitude: -81.4 }
      )

      expect(result.airspace_summary).toBeDefined()
      expect(result.airspace_summary).toContain('Class')
    })
  })

  describe('Major Florida Airports', () => {
    const majorAirports = [
      { name: 'Orlando International', icao: 'KMCO', lat: 28.4294, lng: -81.3089 },
      { name: 'Miami International', icao: 'KMIA', lat: 25.7959, lng: -80.2870 },
      { name: 'Tampa International', icao: 'KTPA', lat: 27.9755, lng: -82.5332 },
    ]

    majorAirports.forEach(({ name, icao, lat, lng }) => {
      it(`should detect proximity to ${name}`, async () => {
        // Point 8 miles from airport
        const nearbyLat = lat + 0.1
        const result = await client.checkAirspace({
          location: { latitude: nearbyLat, longitude: lng },
          altitude_ft: 400,
        })

        const nearbyAirport = result.nearby_airports.find((a) => a.icao_code === icao)
        expect(nearbyAirport).toBeDefined()
      })
    })
  })

  describe('Altitude Restrictions', () => {
    it('should have lower ceiling near Class B airports', async () => {
      // Close to MCO (within 5nm)
      const result = await client.checkAirspace({
        location: { latitude: 28.43, longitude: -81.32 },
        altitude_ft: 400,
      })

      // Should have restricted ceiling
      expect(result.max_altitude_ft).toBeLessThan(400)
    })

    it('should allow 400ft in Class G airspace', async () => {
      // Far from any airports
      const result = await client.checkAirspace({
        location: { latitude: 28.8, longitude: -81.8 },
        altitude_ft: 400,
      })

      expect(result.max_altitude_ft).toBe(400)
      expect(result.can_fly).toBe(true)
    })
  })
})

describe('Aloft Client Singleton', () => {
  it('should return the same instance', () => {
    const client1 = getAloftClient()
    const client2 = getAloftClient()

    expect(client1).toBe(client2)
  })

  it('should create new instance with custom config', () => {
    const customClient = createAloftClient({ apiKey: 'custom-key' })
    const singleton = getAloftClient()

    expect(customClient).not.toBe(singleton)
    expect(customClient.isConfigured()).toBe(true)
  })
})

describe('Airspace Edge Cases', () => {
  let client: AloftClient

  beforeEach(() => {
    client = new AloftClient()
  })

  it('should handle error gracefully', async () => {
    // Mock an error by using invalid coordinates that might cause issues
    // The client should return safe defaults
    const result = await client.checkAirspace({
      location: { latitude: 0, longitude: 0 }, // Middle of Atlantic
      altitude_ft: 400,
    })

    // Should return valid result even for unusual location
    expect(result).toBeDefined()
    expect(result.location).toBeDefined()
  })

  it('should include timestamp in results', async () => {
    const result = await client.checkAirspace({
      location: { latitude: 28.5, longitude: -81.4 },
    })

    expect(result.checked_at).toBeDefined()
    expect(new Date(result.checked_at).getTime()).toBeGreaterThan(0)
  })

  it('should return TFR array even if empty', async () => {
    const result = await client.checkAirspace({
      location: { latitude: 28.5, longitude: -81.4 },
    })

    expect(Array.isArray(result.tfrs)).toBe(true)
  })
})
