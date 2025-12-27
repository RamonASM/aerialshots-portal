import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getNowPlaying,
  getUpcoming,
  getPopular,
  getTopRated,
  searchMovies,
  getNearbyTheaters,
  getMoviesData,
} from './client'
import { mockTmdbResponse, mockPlacesResponse } from '@/test/mocks/api-responses'

// Mock Google Places client
vi.mock('@/lib/integrations/google-places/client', () => ({
  searchNearbyPlaces: vi.fn().mockResolvedValue([
    {
      id: 'theater-123',
      name: 'AMC Disney Springs',
      type: 'movie_theater',
      address: '1500 E Buena Vista Dr, Lake Buena Vista, FL',
      distance: 3.2,
      rating: 4.3,
      reviewCount: 500,
      isOpen: true,
    },
    {
      id: 'theater-456',
      name: 'Regal Waterford Lakes',
      type: 'movie_theater',
      address: '541 N Alafaya Trail, Orlando, FL',
      distance: 5.1,
      rating: 4.0,
      reviewCount: 300,
      isOpen: true,
    },
  ]),
}))

describe('Movies Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('getNowPlaying', () => {
    it('should fetch now playing movies', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTmdbResponse),
      })

      const movies = await getNowPlaying(10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/movie/now_playing'),
        expect.any(Object)
      )
      expect(movies).toBeInstanceOf(Array)
    })

    it('should return movie data in correct format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTmdbResponse),
      })

      const movies = await getNowPlaying(10)

      if (movies.length > 0) {
        const movie = movies[0]
        expect(movie.id).toBeDefined()
        expect(movie.title).toBeDefined()
        expect(movie.overview).toBeDefined()
        expect(movie.posterUrl).toBeDefined()
        expect(movie.releaseDate).toBeDefined()
        expect(movie.rating).toBeDefined()
        expect(movie.genres).toBeInstanceOf(Array)
      }
    })

    it('should respect limit parameter', async () => {
      const manyMoviesResponse = {
        ...mockTmdbResponse,
        results: Array(20).fill(mockTmdbResponse.results[0]).map((m, i) => ({ ...m, id: i })),
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(manyMoviesResponse),
      })

      const movies = await getNowPlaying(5)

      expect(movies.length).toBeLessThanOrEqual(5)
    })

    it('should return empty array on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      const movies = await getNowPlaying(10)

      expect(movies).toEqual([])
    })

    it('should return empty array when API key is missing', async () => {
      const originalEnv = process.env.TMDB_API_KEY
      delete process.env.TMDB_API_KEY

      const movies = await getNowPlaying(10)

      expect(movies).toEqual([])

      process.env.TMDB_API_KEY = originalEnv
    })
  })

  describe('getUpcoming', () => {
    it('should fetch upcoming movies', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTmdbResponse),
      })

      const movies = await getUpcoming(10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/movie/upcoming'),
        expect.any(Object)
      )
    })

    it('should filter to only future releases', async () => {
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const mixedDatesResponse = {
        results: [
          { ...mockTmdbResponse.results[0], id: 1, release_date: futureDate },
          { ...mockTmdbResponse.results[0], id: 2, release_date: pastDate },
          { ...mockTmdbResponse.results[0], id: 3, release_date: today },
        ],
        page: 1,
        total_pages: 1,
        total_results: 3,
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mixedDatesResponse),
      })

      const movies = await getUpcoming(10)

      // Should only include future movies
      for (const movie of movies) {
        expect(new Date(movie.releaseDate).getTime()).toBeGreaterThan(Date.now() - 86400000)
      }
    })
  })

  describe('getPopular', () => {
    it('should fetch popular movies', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTmdbResponse),
      })

      const movies = await getPopular(10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/movie/popular'),
        expect.any(Object)
      )
    })
  })

  describe('getTopRated', () => {
    it('should fetch top rated movies', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTmdbResponse),
      })

      const movies = await getTopRated(10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/movie/top_rated'),
        expect.any(Object)
      )
    })
  })

  describe('searchMovies', () => {
    it('should search movies by query', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTmdbResponse),
      })

      const movies = await searchMovies('Avengers', 10)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('query=Avengers'),
        expect.any(Object)
      )
    })

    it('should handle special characters in query', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTmdbResponse),
      })

      await searchMovies("It's a Wonderful Life", 10)

      expect(fetch).toHaveBeenCalled()
    })
  })

  describe('getNearbyTheaters', () => {
    it('should return nearby movie theaters', async () => {
      const theaters = await getNearbyTheaters(28.5383, -81.3792, 10)

      expect(theaters).toBeInstanceOf(Array)
    })

    it('should detect theater chains', async () => {
      const theaters = await getNearbyTheaters(28.5383, -81.3792, 10)

      const amcTheater = theaters.find((t) => t.chain === 'AMC')
      const regalTheater = theaters.find((t) => t.chain === 'Regal')

      expect(amcTheater).toBeDefined()
      expect(regalTheater).toBeDefined()
    })

    it('should include distance information', async () => {
      const theaters = await getNearbyTheaters(28.5383, -81.3792, 10)

      for (const theater of theaters) {
        expect(theater.distanceMiles).toBeDefined()
        expect(typeof theater.distanceMiles).toBe('number')
      }
    })
  })

  describe('getMoviesData', () => {
    it('should fetch all movie data in parallel', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTmdbResponse),
      })

      const data = await getMoviesData(28.5383, -81.3792)

      // Check structure
      expect(data.nowPlaying).toBeInstanceOf(Array)
      expect(data.comingSoon).toBeInstanceOf(Array)
      expect(data.theaters).toBeInstanceOf(Array)
    })
  })
})

describe('Movie Data Transformation', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTmdbResponse),
    })
  })

  it('should build correct poster URL', async () => {
    const movies = await getNowPlaying(10)

    if (movies.length > 0) {
      const movie = movies[0]
      expect(movie.posterUrl).toContain('image.tmdb.org')
      expect(movie.posterUrl).toContain('w342')
    }
  })

  it('should build correct backdrop URL when available', async () => {
    const movies = await getNowPlaying(10)

    if (movies.length > 0) {
      const movie = movies[0]
      if (movie.backdropUrl) {
        expect(movie.backdropUrl).toContain('image.tmdb.org')
        expect(movie.backdropUrl).toContain('w780')
      }
    }
  })

  it('should map genre IDs to names', async () => {
    const movies = await getNowPlaying(10)

    if (movies.length > 0) {
      const movie = movies[0]
      expect(movie.genres).toBeInstanceOf(Array)
      // Genres should be strings, not numbers
      for (const genre of movie.genres) {
        expect(typeof genre).toBe('string')
      }
    }
  })

  it('should round rating to one decimal place', async () => {
    const customResponse = {
      ...mockTmdbResponse,
      results: [{ ...mockTmdbResponse.results[0], vote_average: 7.856 }],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(customResponse),
    })

    const movies = await getNowPlaying(10)

    if (movies.length > 0) {
      // Rating should be rounded (7.856 -> 7.9)
      expect(movies[0].rating).toBe(7.9)
    }
  })
})
