import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDiningData,
  searchDining,
  getRestaurantDetails,
} from './client'

// TODO: Tests need to be updated for Google Places API
// The client was migrated from Yelp API to Google Places API
// These are placeholder tests - update with proper mocks when needed

describe('Dining Integration (Google Places API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('getDiningData', () => {
    it('should return null when API key is missing', async () => {
      const originalEnv = process.env.GOOGLE_PLACES_API_KEY
      delete process.env.GOOGLE_PLACES_API_KEY

      const data = await getDiningData(28.5383, -81.3792)

      expect(data).toBeNull()

      // Restore
      if (originalEnv) process.env.GOOGLE_PLACES_API_KEY = originalEnv
    })

    it('should fetch dining data when API key is present', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'test-key'

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ places: [] }),
      })

      const data = await getDiningData(28.5383, -81.3792)

      expect(data).toBeDefined()
      if (data) {
        expect(data.trending).toBeInstanceOf(Array)
        expect(data.newOpenings).toBeInstanceOf(Array)
        expect(data.topRated).toBeInstanceOf(Array)
        expect(data.byCategory).toBeDefined()
      }
    })
  })

  describe('searchDining', () => {
    it('should return empty array when API key is missing', async () => {
      const originalEnv = process.env.GOOGLE_PLACES_API_KEY
      delete process.env.GOOGLE_PLACES_API_KEY

      const restaurants = await searchDining(28.5383, -81.3792, 'pizza')

      expect(restaurants).toEqual([])

      if (originalEnv) process.env.GOOGLE_PLACES_API_KEY = originalEnv
    })

    it('should search with provided query', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'test-key'

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ places: [] }),
      })

      const restaurants = await searchDining(28.5383, -81.3792, 'pizza')

      expect(fetch).toHaveBeenCalled()
      expect(restaurants).toBeInstanceOf(Array)
    })
  })

  describe('getRestaurantDetails', () => {
    it('should return null when API key is missing', async () => {
      const originalEnv = process.env.GOOGLE_PLACES_API_KEY
      delete process.env.GOOGLE_PLACES_API_KEY

      const restaurant = await getRestaurantDetails('test-place-id')

      expect(restaurant).toBeNull()

      if (originalEnv) process.env.GOOGLE_PLACES_API_KEY = originalEnv
    })

    it('should fetch restaurant details', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'test-key'

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          displayName: { text: 'Test Restaurant' },
          formattedAddress: '123 Main St',
          location: { latitude: 28.5383, longitude: -81.3792 },
        }),
      })

      const restaurant = await getRestaurantDetails('test-place-id')

      expect(fetch).toHaveBeenCalled()
      if (restaurant) {
        expect(restaurant.id).toBe('test-id')
        expect(restaurant.name).toBe('Test Restaurant')
      }
    })
  })
})
