import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

interface PlacePrediction {
  description: string
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

interface AutocompleteResponse {
  predictions: PlacePrediction[]
  status: string
  error_message?: string
}

interface PlaceDetailsResponse {
  result: {
    address_components: Array<{
      long_name: string
      short_name: string
      types: string[]
    }>
    formatted_address: string
    geometry: {
      location: {
        lat: number
        lng: number
      }
    }
    place_id: string
  }
  status: string
  error_message?: string
}

/**
 * GET /api/places/autocomplete
 *
 * Proxy for Google Places Autocomplete API to keep API key server-side.
 * Query params:
 * - input: search text (required)
 * - sessiontoken: session token for billing (optional)
 */
export async function GET(request: NextRequest) {
  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: 'Google Places API not configured' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const input = searchParams.get('input')
  const sessiontoken = searchParams.get('sessiontoken')
  const placeId = searchParams.get('placeId')

  // If placeId is provided, get place details
  if (placeId) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
      url.searchParams.set('place_id', placeId)
      url.searchParams.set('fields', 'address_components,formatted_address,geometry,place_id')
      url.searchParams.set('key', GOOGLE_PLACES_API_KEY)
      if (sessiontoken) {
        url.searchParams.set('sessiontoken', sessiontoken)
      }

      const response = await fetch(url.toString())
      const data: PlaceDetailsResponse = await response.json()

      if (data.status !== 'OK') {
        console.error('[Places API] Details error:', data.status, data.error_message)
        return NextResponse.json(
          { error: data.error_message || 'Failed to get place details' },
          { status: 400 }
        )
      }

      const result = data.result
      const components = result.address_components || []

      let streetNumber = ''
      let streetName = ''
      let city = ''
      let state = ''
      let zip = ''

      for (const component of components) {
        const types = component.types
        if (types.includes('street_number')) {
          streetNumber = component.long_name
        } else if (types.includes('route')) {
          streetName = component.long_name
        } else if (types.includes('locality') || types.includes('sublocality')) {
          city = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          state = component.short_name
        } else if (types.includes('postal_code')) {
          zip = component.long_name
        }
      }

      return NextResponse.json({
        formatted: result.formatted_address,
        street: streetNumber ? `${streetNumber} ${streetName}` : streetName,
        city,
        state,
        zip,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        placeId: result.place_id,
      })
    } catch (error) {
      console.error('[Places API] Details fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch place details' },
        { status: 500 }
      )
    }
  }

  // Otherwise, do autocomplete search
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', input)
    url.searchParams.set('types', 'address')
    url.searchParams.set('components', 'country:us')
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY)

    // Bias towards Florida
    url.searchParams.set('location', '27.6648,-81.5158')
    url.searchParams.set('radius', '500000')

    if (sessiontoken) {
      url.searchParams.set('sessiontoken', sessiontoken)
    }

    const response = await fetch(url.toString())
    const data: AutocompleteResponse = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[Places API] Autocomplete error:', data.status, data.error_message)
      return NextResponse.json(
        { error: data.error_message || 'Failed to search places' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      predictions: data.predictions.map((p) => ({
        description: p.description,
        placeId: p.place_id,
        mainText: p.structured_formatting.main_text,
        secondaryText: p.structured_formatting.secondary_text,
      })),
    })
  } catch (error) {
    console.error('[Places API] Autocomplete fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    )
  }
}
