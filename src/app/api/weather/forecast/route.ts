import { NextRequest, NextResponse } from 'next/server'
import { getWeatherForecast } from '@/lib/integrations/weather/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/weather/forecast
 * Get 7-day weather forecast for a location
 *
 * Query params:
 * - lat: Latitude
 * - lng: Longitude
 * - date: (optional) Specific date to filter for (ISO format)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const targetDate = searchParams.get('date')

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Missing lat or lng parameters' },
        { status: 400 }
      )
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid lat or lng values' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of range' },
        { status: 400 }
      )
    }

    // Get forecast
    const forecasts = await getWeatherForecast(latitude, longitude)

    // If specific date requested, filter
    if (targetDate) {
      const targetForecast = forecasts.find((f) => f.date === targetDate)
      if (!targetForecast) {
        return NextResponse.json(
          { error: 'Forecast not available for requested date' },
          { status: 404 }
        )
      }
      return NextResponse.json({
        success: true,
        location: { lat: latitude, lng: longitude },
        forecast: targetForecast,
      })
    }

    // Return all forecasts
    return NextResponse.json({
      success: true,
      location: { lat: latitude, lng: longitude },
      forecasts,
      summary: {
        total_days: forecasts.length,
        good_days: forecasts.filter((f) => f.is_good_for_shoot).length,
        has_alerts: forecasts.some((f) => f.alerts.length > 0),
      },
    })
  } catch (error) {
    console.error('[Weather API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather forecast' },
      { status: 500 }
    )
  }
}
