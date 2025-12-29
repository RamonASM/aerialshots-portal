// Listing Data Enricher Agent
// Geocodes addresses and enriches listing data with location intelligence

import { registerAgent } from '../../registry'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import { createAdminClient } from '@/lib/supabase/admin'

interface EnricherInput {
  listingId: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

interface GeocodingResult {
  lat: number
  lng: number
  formattedAddress: string
  placeId?: string
  county?: string
  neighborhood?: string
}

/**
 * Geocode an address using Google Maps Geocoding API
 */
async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zip?: string
): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not configured')
    return null
  }

  const fullAddress = `${address}, ${city}, ${state}${zip ? ` ${zip}` : ''}`
  const encodedAddress = encodeURIComponent(fullAddress)

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    )

    if (!response.ok) {
      console.error('Geocoding API error:', response.status)
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results?.[0]) {
      console.error('Geocoding failed:', data.status)
      return null
    }

    const result = data.results[0]
    const location = result.geometry.location

    // Extract address components
    let county: string | undefined
    let neighborhood: string | undefined

    for (const component of result.address_components) {
      if (component.types.includes('administrative_area_level_2')) {
        county = component.long_name
      }
      if (component.types.includes('neighborhood')) {
        neighborhood = component.long_name
      }
      if (component.types.includes('sublocality_level_1') && !neighborhood) {
        neighborhood = component.long_name
      }
    }

    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
      county,
      neighborhood,
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Get timezone for coordinates
 */
async function getTimezone(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) return null

  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`
    )

    if (!response.ok) return null

    const data = await response.json()
    return data.status === 'OK' ? data.timeZoneId : null
  } catch {
    return null
  }
}

/**
 * Main agent execution function
 */
async function execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
  const { input } = context
  const enricherInput = input as unknown as EnricherInput

  if (!enricherInput.listingId) {
    return {
      success: false,
      error: 'listingId is required',
      errorCode: 'MISSING_LISTING_ID',
    }
  }

  const supabase = createAdminClient()

  try {
    // 1. Fetch listing data if address not provided
    let address = enricherInput.address
    let city = enricherInput.city
    let state = enricherInput.state
    let zip = enricherInput.zip

    if (!address || !city || !state) {
      const { data: listing, error } = await supabase
        .from('listings')
        .select('address, city, state, zip')
        .eq('id', enricherInput.listingId)
        .single()

      if (error || !listing) {
        return {
          success: false,
          error: 'Listing not found',
          errorCode: 'LISTING_NOT_FOUND',
        }
      }

      address = address || listing.address || undefined
      city = city || listing.city || undefined
      state = state || listing.state || undefined
      zip = zip || listing.zip || undefined
    }

    if (!address || !city || !state) {
      return {
        success: false,
        error: 'Address, city, and state are required',
        errorCode: 'INCOMPLETE_ADDRESS',
      }
    }

    // 2. Geocode the address
    const geocodeResult = await geocodeAddress(address, city, state, zip)

    if (!geocodeResult) {
      return {
        success: false,
        error: 'Failed to geocode address',
        errorCode: 'GEOCODING_FAILED',
      }
    }

    // 3. Get timezone
    const timezone = await getTimezone(geocodeResult.lat, geocodeResult.lng)

    // 4. Update listing with enriched data
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
        formatted_address: geocodeResult.formattedAddress,
        google_place_id: geocodeResult.placeId,
        county: geocodeResult.county,
        neighborhood: geocodeResult.neighborhood,
        timezone,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', enricherInput.listingId)

    if (updateError) {
      console.error('Failed to update listing:', updateError)
      return {
        success: false,
        error: 'Failed to update listing with enriched data',
        errorCode: 'UPDATE_FAILED',
      }
    }

    return {
      success: true,
      output: {
        listingId: enricherInput.listingId,
        geocoding: geocodeResult,
        timezone,
        enrichedAt: new Date().toISOString(),
      },
      tokensUsed: 0, // No AI tokens used for geocoding
    }
  } catch (error) {
    console.error('Enricher error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Enrichment failed',
      errorCode: 'ENRICHER_ERROR',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'listing-data-enricher',
  name: 'Listing Data Enricher',
  description: 'Geocodes addresses and enriches listing data with location intelligence (coordinates, timezone, county, neighborhood)',
  category: 'operations',
  executionMode: 'async',
  systemPrompt: '', // No AI prompt needed for this agent
  config: {
    maxTokens: 0,
    temperature: 0,
  },
  execute,
})
