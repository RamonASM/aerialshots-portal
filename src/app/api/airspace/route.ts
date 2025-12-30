import { NextRequest, NextResponse } from 'next/server'
import { getAloftClient } from '@/lib/integrations/aloft'
import { z } from 'zod'

const checkSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  altitude_ft: z.number().min(0).max(400).optional(),
})

/**
 * POST /api/airspace
 * Check airspace status at a location
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parseResult = checkSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    const { lat, lng, altitude_ft = 400 } = parseResult.data
    const client = getAloftClient()

    const result = await client.checkAirspace({
      location: { latitude: lat, longitude: lng },
      altitude_ft,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Airspace check error:', error)
    return NextResponse.json(
      { error: 'Failed to check airspace' },
      { status: 500 }
    )
  }
}
