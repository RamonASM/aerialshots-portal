// TMDb API Integration
// Now playing movies and coming soon

import type { Movie, MoviesData, Theater } from '@/lib/api/types'
import { searchNearbyPlaces } from '@/lib/integrations/google-places/client'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface TMDbMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  runtime?: number
}

interface TMDbGenre {
  id: number
  name: string
}

interface TMDbResponse {
  results: TMDbMovie[]
  page: number
  total_pages: number
  total_results: number
}

// Genre mapping
const GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}

/**
 * Fetch from TMDb API
 */
async function fetchTMDb(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<TMDbResponse | null> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB_API_KEY not configured')
    return null
  }

  try {
    const url = new URL(`${TMDB_API_BASE}${endpoint}`)
    url.searchParams.set('api_key', TMDB_API_KEY)
    url.searchParams.set('language', 'en-US')

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      console.error('TMDb API error:', response.status)
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching TMDb:', error)
    return null
  }
}

/**
 * Transform TMDb movie to our format
 */
function toMovie(movie: TMDbMovie): Movie {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    posterUrl: movie.poster_path
      ? `${TMDB_IMAGE_BASE}/w342${movie.poster_path}`
      : '',
    backdropUrl: movie.backdrop_path
      ? `${TMDB_IMAGE_BASE}/w780${movie.backdrop_path}`
      : undefined,
    releaseDate: movie.release_date,
    rating: Math.round(movie.vote_average * 10) / 10,
    voteCount: movie.vote_count,
    genres: movie.genre_ids.map((id) => GENRES[id] || 'Unknown'),
    runtime: movie.runtime,
  }
}

/**
 * Get movies now playing in theaters
 */
export async function getNowPlaying(limit: number = 10): Promise<Movie[]> {
  const data = await fetchTMDb('/movie/now_playing', {
    region: 'US',
  })

  if (!data) return []

  return data.results.slice(0, limit).map(toMovie)
}

/**
 * Get upcoming movies
 */
export async function getUpcoming(limit: number = 10): Promise<Movie[]> {
  const data = await fetchTMDb('/movie/upcoming', {
    region: 'US',
  })

  if (!data) return []

  // Filter to only future releases
  const today = new Date().toISOString().split('T')[0]
  const upcomingMovies = data.results.filter(
    (movie) => movie.release_date > today
  )

  return upcomingMovies.slice(0, limit).map(toMovie)
}

/**
 * Get popular movies
 */
export async function getPopular(limit: number = 10): Promise<Movie[]> {
  const data = await fetchTMDb('/movie/popular', {
    region: 'US',
  })

  if (!data) return []

  return data.results.slice(0, limit).map(toMovie)
}

/**
 * Get top rated movies
 */
export async function getTopRated(limit: number = 10): Promise<Movie[]> {
  const data = await fetchTMDb('/movie/top_rated', {
    region: 'US',
  })

  if (!data) return []

  return data.results.slice(0, limit).map(toMovie)
}

/**
 * Search movies
 */
export async function searchMovies(
  query: string,
  limit: number = 10
): Promise<Movie[]> {
  const data = await fetchTMDb('/search/movie', {
    query,
  })

  if (!data) return []

  return data.results.slice(0, limit).map(toMovie)
}

/**
 * Get nearby movie theaters using Google Places
 */
export async function getNearbyTheaters(
  lat: number,
  lng: number,
  limit: number = 10
): Promise<Theater[]> {
  const places = await searchNearbyPlaces(lat, lng, 'entertainment', 16000) // 16km

  if (!places) return []

  // Filter to movie theaters
  const theaters = places.filter(
    (place) =>
      place.type.includes('movie_theater') ||
      place.name.toLowerCase().includes('cinema') ||
      place.name.toLowerCase().includes('theater') ||
      place.name.toLowerCase().includes('theatre') ||
      place.name.toLowerCase().includes('amc') ||
      place.name.toLowerCase().includes('regal') ||
      place.name.toLowerCase().includes('cinemark')
  )

  return theaters.slice(0, limit).map((place) => {
    // Detect chain
    let chain: string | undefined
    const nameLower = place.name.toLowerCase()
    if (nameLower.includes('amc')) chain = 'AMC'
    else if (nameLower.includes('regal')) chain = 'Regal'
    else if (nameLower.includes('cinemark')) chain = 'Cinemark'
    else if (nameLower.includes('cinepolis')) chain = 'Cinepolis'
    else if (nameLower.includes('alamo')) chain = 'Alamo Drafthouse'

    return {
      id: place.id,
      name: place.name,
      address: place.address,
      distanceMiles: place.distance
        ? Math.round(place.distance * 10) / 10
        : 0,
      rating: place.rating || undefined,
      chain,
    }
  })
}

/**
 * Get complete movies data for a location
 */
export async function getMoviesData(
  lat: number,
  lng: number
): Promise<MoviesData> {
  const [nowPlaying, comingSoon, theaters] = await Promise.all([
    getNowPlaying(12),
    getUpcoming(8),
    getNearbyTheaters(lat, lng, 10),
  ])

  return {
    nowPlaying,
    comingSoon,
    theaters,
  }
}
