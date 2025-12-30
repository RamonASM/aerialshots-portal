import { NextRequest, NextResponse } from 'next/server'
import { getWeatherForecast } from '@/lib/integrations/weather/client'

/**
 * GET /api/weather
 * Get weather forecast for a location
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'lat and lng query parameters are required' },
        { status: 400 }
      )
    }

    // Validate coordinates are reasonable
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    const forecasts = await getWeatherForecast(lat, lng)

    return NextResponse.json({
      success: true,
      forecasts,
    })
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    )
  }
}
