import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTrendingRestaurants,
  getNewOpenings,
  getTopRated,
  getRestaurantsByCategory,
  getOpenNow,
  getDiningData,
  searchRestaurants,
} from './client'
import { mockYelpSearchResponse } from '@/test/mocks/api-responses'

describe('Yelp Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  describe('getTrendingRestaurants', () => {
    it('should fetch trending restaurants sorted by review count', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      const restaurants = await getTrendingRestaurants(28.5383, -81.3792, 10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort_by=review_count'),
        expect.any(Object)
      )
      expect(restaurants).toBeInstanceOf(Array)
    })

    it('should include proper restaurant data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      const restaurants = await getTrendingRestaurants(28.5383, -81.3792, 10)

      if (restaurants.length > 0) {
        const restaurant = restaurants[0]
        expect(restaurant.id).toBeDefined()
        expect(restaurant.name).toBeDefined()
        expect(restaurant.rating).toBeDefined()
        expect(restaurant.cuisine).toBeInstanceOf(Array)
        expect(restaurant.address).toBeDefined()
      }
    })

    it('should return empty array on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      const restaurants = await getTrendingRestaurants(28.5383, -81.3792, 10)

      expect(restaurants).toEqual([])
    })

    it('should return empty array when API key is missing', async () => {
      // The function checks for YELP_API_KEY
      const originalEnv = process.env.YELP_API_KEY
      delete process.env.YELP_API_KEY

      const restaurants = await getTrendingRestaurants(28.5383, -81.3792, 10)

      expect(restaurants).toEqual([])

      // Restore
      process.env.YELP_API_KEY = originalEnv
    })
  })

  describe('getNewOpenings', () => {
    it('should fetch hot & new restaurants', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      const restaurants = await getNewOpenings(28.5383, -81.3792, 10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('attributes=hot_and_new'),
        expect.any(Object)
      )
      expect(restaurants).toBeInstanceOf(Array)
    })
  })

  describe('getTopRated', () => {
    it('should fetch restaurants sorted by rating', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      const restaurants = await getTopRated(28.5383, -81.3792, 10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort_by=rating'),
        expect.any(Object)
      )
    })

    it('should filter to only highly rated restaurants', async () => {
      const mixedRatingsResponse = {
        businesses: [
          { ...mockYelpSearchResponse.businesses[0], rating: 4.5 },
          { ...mockYelpSearchResponse.businesses[0], id: '2', rating: 3.5 },
          { ...mockYelpSearchResponse.businesses[0], id: '3', rating: 4.2 },
        ],
        total: 3,
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mixedRatingsResponse),
      })

      const restaurants = await getTopRated(28.5383, -81.3792, 10)

      // Should filter out restaurants with rating < 4.0
      for (const r of restaurants) {
        expect(r.rating).toBeGreaterThanOrEqual(4.0)
      }
    })
  })

  describe('getRestaurantsByCategory', () => {
    const categories = ['brunch', 'italian', 'asian', 'seafood', 'bars']

    it.each(categories)('should fetch restaurants for category: %s', async (category) => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      const restaurants = await getRestaurantsByCategory(28.5383, -81.3792, category, 10)

      expect(fetch).toHaveBeenCalled()
      expect(restaurants).toBeInstanceOf(Array)
    })

    it('should map category aliases correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      await getRestaurantsByCategory(28.5383, -81.3792, 'asian', 10)

      // Asian should map to multiple Yelp categories
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('asianfusion'),
        expect.any(Object)
      )
    })
  })

  describe('getOpenNow', () => {
    it('should fetch only open restaurants', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      const restaurants = await getOpenNow(28.5383, -81.3792, 10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('open_now=true'),
        expect.any(Object)
      )
    })
  })

  describe('searchRestaurants', () => {
    it('should search with provided term', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      const restaurants = await searchRestaurants(28.5383, -81.3792, 'pizza', 10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('term=pizza'),
        expect.any(Object)
      )
    })

    it('should handle special characters in search term', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      await searchRestaurants(28.5383, -81.3792, "joe's sushi & grill", 10)

      expect(fetch).toHaveBeenCalled()
      // URL should be properly encoded
      const callArg = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(callArg).toContain('term=')
    })
  })

  describe('getDiningData', () => {
    it('should fetch all dining categories in parallel', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYelpSearchResponse),
      })

      const data = await getDiningData(28.5383, -81.3792)

      // Should have made multiple API calls
      expect(fetch).toHaveBeenCalledTimes(8) // trending, newOpenings, topRated, + 5 categories

      // Check structure
      expect(data.trending).toBeInstanceOf(Array)
      expect(data.newOpenings).toBeInstanceOf(Array)
      expect(data.topRated).toBeInstanceOf(Array)
      expect(data.byCategory).toBeDefined()
      expect(data.byCategory.brunch).toBeInstanceOf(Array)
    })

    it('should handle partial failures gracefully', async () => {
      let callCount = 0
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Error'),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockYelpSearchResponse),
        })
      })

      const data = await getDiningData(28.5383, -81.3792)

      // Should still return data from successful calls
      expect(data).toBeDefined()
    })
  })
})

describe('Restaurant Data Transformation', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockYelpSearchResponse),
    })
  })

  it('should convert distance from meters to miles', async () => {
    const restaurants = await getTrendingRestaurants(28.5383, -81.3792, 10)

    if (restaurants.length > 0) {
      const restaurant = restaurants[0]
      // Distance should be in miles, not meters
      expect(restaurant.distanceMiles).toBeDefined()
      expect(restaurant.distanceMiles).toBeLessThan(100) // Should be reasonable miles, not meters
    }
  })

  it('should include Yelp URL', async () => {
    const restaurants = await getTrendingRestaurants(28.5383, -81.3792, 10)

    if (restaurants.length > 0) {
      expect(restaurants[0].yelpUrl).toContain('yelp.com')
    }
  })

  it('should include highlights for special attributes', async () => {
    const customResponse = {
      businesses: [
        {
          ...mockYelpSearchResponse.businesses[0],
          attributes: { hot_and_new: true },
          rating: 4.8,
          review_count: 600,
        },
      ],
      total: 1,
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(customResponse),
    })

    const restaurants = await getTrendingRestaurants(28.5383, -81.3792, 10)

    if (restaurants.length > 0) {
      const highlights = restaurants[0].highlights
      expect(highlights).toContain('Hot & New')
      expect(highlights).toContain('Highly Rated')
      expect(highlights).toContain('Popular')
    }
  })

  it('should map price level correctly', async () => {
    const priceTests = [
      { price: '$', expected: 1 },
      { price: '$$', expected: 2 },
      { price: '$$$', expected: 3 },
      { price: '$$$$', expected: 4 },
    ]

    for (const { price, expected } of priceTests) {
      const customResponse = {
        businesses: [{ ...mockYelpSearchResponse.businesses[0], price }],
        total: 1,
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(customResponse),
      })

      const restaurants = await getTrendingRestaurants(28.5383, -81.3792, 10)

      if (restaurants.length > 0) {
        expect(restaurants[0].priceLevel).toBe(expected)
      }
    }
  })
})
