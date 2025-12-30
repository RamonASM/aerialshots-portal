/**
 * Quote API Endpoint
 *
 * Calculates pricing quote for booking requests.
 * Ported from asm-agent-backend /quote endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { computeQuote, PACKAGES } from '@/lib/pricing/service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sqft, packageKey, services = [] } = body

    // Validation
    if (!sqft || typeof sqft !== 'number') {
      return NextResponse.json(
        { error: 'sqft is required and must be a number' },
        { status: 400 }
      )
    }

    if (!packageKey && (!services || services.length === 0)) {
      return NextResponse.json(
        { error: 'Either packageKey or services[] is required' },
        { status: 400 }
      )
    }

    // Validate package if provided
    if (packageKey && !PACKAGES[packageKey]) {
      return NextResponse.json(
        { error: `Invalid package: ${packageKey}. Valid packages: ${Object.keys(PACKAGES).join(', ')}` },
        { status: 400 }
      )
    }

    // Compute quote
    const quote = computeQuote({
      sqft: Number(sqft),
      packageKey,
      services: Array.isArray(services) ? services : [],
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Quote API error:', error)
    return NextResponse.json(
      { error: 'Failed to compute quote' },
      { status: 500 }
    )
  }
}

// Also support GET with query params for simple lookups
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sqft = searchParams.get('sqft')
  const packageKey = searchParams.get('package')
  const servicesParam = searchParams.get('services')

  if (!sqft) {
    return NextResponse.json(
      { error: 'sqft query parameter is required' },
      { status: 400 }
    )
  }

  const services = servicesParam ? servicesParam.split(',').filter(Boolean) : []

  if (!packageKey && services.length === 0) {
    return NextResponse.json(
      { error: 'Either package or services query parameter is required' },
      { status: 400 }
    )
  }

  const quote = computeQuote({
    sqft: Number(sqft),
    packageKey: packageKey || undefined,
    services,
  })

  return NextResponse.json(quote)
}
