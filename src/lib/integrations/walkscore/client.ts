// Walk Score API Client
// Documentation: https://www.walkscore.com/professional/api.php

import { integrationLogger, formatError } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'walkscore' })

export interface WalkScoreResult {
  status: number
  walkscore: number
  description: string
  updated: string
  logo_url?: string
  more_info_icon?: string
  more_info_link?: string
  ws_link?: string
  help_link?: string
  snapped_lat?: number
  snapped_lon?: number
  transit?: {
    score: number
    description: string
    summary: string
  }
  bike?: {
    score: number
    description: string
  }
}

export interface WalkScoreData {
  walkScore: number
  walkScoreDescription: string
  transitScore?: number
  transitScoreDescription?: string
  bikeScore?: number
  bikeScoreDescription?: string
}

const WALKSCORE_API_BASE = 'https://api.walkscore.com/score'

/**
 * Get Walk Score description based on score
 */
function getWalkScoreDescription(score: number): string {
  if (score >= 90) return 'Walker\'s Paradise'
  if (score >= 70) return 'Very Walkable'
  if (score >= 50) return 'Somewhat Walkable'
  if (score >= 25) return 'Car-Dependent'
  return 'Very Car-Dependent'
}

/**
 * Get Transit Score description based on score
 */
function getTransitScoreDescription(score: number): string {
  if (score >= 90) return 'Rider\'s Paradise'
  if (score >= 70) return 'Excellent Transit'
  if (score >= 50) return 'Good Transit'
  if (score >= 25) return 'Some Transit'
  return 'Minimal Transit'
}

/**
 * Get Bike Score description based on score
 */
function getBikeScoreDescription(score: number): string {
  if (score >= 90) return 'Biker\'s Paradise'
  if (score >= 70) return 'Very Bikeable'
  if (score >= 50) return 'Bikeable'
  return 'Somewhat Bikeable'
}

/**
 * Fetch Walk Score for a location
 * @param lat - Latitude
 * @param lng - Longitude
 * @param address - Full address (improves accuracy)
 */
export async function getWalkScore(
  lat: number,
  lng: number,
  address: string
): Promise<WalkScoreData | null> {
  const apiKey = process.env.WALKSCORE_API_KEY

  if (!apiKey) {
    logger.warn('WALKSCORE_API_KEY not configured')
    return null
  }

  try {
    const params = new URLSearchParams({
      format: 'json',
      address: address,
      lat: lat.toString(),
      lon: lng.toString(),
      transit: '1',
      bike: '1',
      wsapikey: apiKey,
    })

    const url = `${WALKSCORE_API_BASE}?${params.toString()}`

    const response = await fetch(url)

    if (!response.ok) {
      logger.error({ status: response.status, statusText: response.statusText }, 'Walk Score API error')
      return null
    }

    const data: WalkScoreResult = await response.json()

    // Status codes:
    // 1 = Success
    // 2 = Score being calculated (try again later)
    // 30 = Invalid coordinates
    // 31 = Score not available (e.g., too rural)
    // 40 = Invalid API key
    // 41 = Daily API limit exceeded

    if (data.status !== 1) {
      logger.warn({ apiStatus: data.status }, `Walk Score API returned non-success status`)
      return null
    }

    return {
      walkScore: data.walkscore,
      walkScoreDescription: data.description || getWalkScoreDescription(data.walkscore),
      transitScore: data.transit?.score,
      transitScoreDescription: data.transit?.score
        ? getTransitScoreDescription(data.transit.score)
        : undefined,
      bikeScore: data.bike?.score,
      bikeScoreDescription: data.bike?.score
        ? getBikeScoreDescription(data.bike.score)
        : undefined,
    }
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Error fetching Walk Score')
    return null
  }
}

/**
 * Get a simple walk score without transit/bike data
 * Useful for quick checks
 */
export async function getSimpleWalkScore(
  lat: number,
  lng: number,
  address: string
): Promise<{ score: number; description: string } | null> {
  const result = await getWalkScore(lat, lng, address)

  if (!result) {
    return null
  }

  return {
    score: result.walkScore,
    description: result.walkScoreDescription,
  }
}
