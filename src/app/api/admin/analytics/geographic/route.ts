import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

interface CityData {
  city: string
  state: string
  count: number
  revenue: number
  lat?: number
  lng?: number
}

interface ZipData {
  zip: string
  city: string
  count: number
}

// GET /api/admin/analytics/geographic - Get geographic distribution data
export async function GET(request: Request) {
  try {
    await requireStaffAccess()

    // Parse period parameter
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '90d'

    // Calculate date range
    let startDate: Date | null = null
    const now = new Date()

    switch (period) {
      case '30d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 90)
        break
      case '365d':
        startDate = new Date(now)
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      case 'all':
      default:
        startDate = null
        break
    }

    const adminSupabase = createAdminClient()

    // Build query for listings with location data
    let query = adminSupabase
      .from('listings')
      .select('city, state, zip, lat, lng')

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    const { data: listings, error } = await query

    if (error) {
      console.error('Error fetching listings:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // Aggregate by city
    const cityMap = new Map<string, CityData>()
    const zipMap = new Map<string, ZipData>()

    let totalLocations = 0

    for (const listing of listings || []) {
      if (!listing.city) continue

      totalLocations++

      const cityKey = `${listing.city}|${listing.state || 'FL'}`

      if (!cityMap.has(cityKey)) {
        cityMap.set(cityKey, {
          city: listing.city,
          state: listing.state || 'FL',
          count: 0,
          revenue: 0, // Revenue unavailable - requires orders table
          lat: listing.lat || undefined,
          lng: listing.lng || undefined,
        })
      }

      const cityData = cityMap.get(cityKey)!
      cityData.count++
      // Revenue unavailable without orders table - leave as 0

      // Update coordinates if we have them
      if (listing.lat && listing.lng && !cityData.lat) {
        cityData.lat = listing.lat
        cityData.lng = listing.lng
      }

      // Aggregate by ZIP
      if (listing.zip) {
        if (!zipMap.has(listing.zip)) {
          zipMap.set(listing.zip, {
            zip: listing.zip,
            city: listing.city,
            count: 0,
          })
        }
        zipMap.get(listing.zip)!.count++
      }
    }

    // Convert to arrays and sort by count
    const topCities = Array.from(cityMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    const topZips = Array.from(zipMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    // Calculate statistics
    const averagePerCity = cityMap.size > 0 ? totalLocations / cityMap.size : 0

    return NextResponse.json({
      topCities,
      topZips,
      totalLocations,
      averagePerCity,
      period,
    })
  } catch (error) {
    console.error('Geographic analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
