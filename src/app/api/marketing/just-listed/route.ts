import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJustListedAssets, isMarketingConfigured } from '@/lib/marketing'
import type { JustListedData, MarketingAssetFormat } from '@/lib/marketing'

export async function POST(request: NextRequest) {
  try {
    // Check if marketing is configured
    if (!isMarketingConfigured()) {
      return NextResponse.json(
        { error: 'Marketing generation not configured' },
        { status: 503 }
      )
    }

    const supabase = await createClient()

    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { listingId, formats } = body as {
      listingId: string
      formats?: MarketingAssetFormat[]
    }

    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
    }

    // Get listing with agent info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        *,
        agents (*)
      `)
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Type assertion for listing and agent
    const listingData = listing as any
    const agent = (Array.isArray(listingData.agents) ? listingData.agents[0] : listingData.agents) as {
      id: string
      name: string
      email: string
      phone?: string
      logo_url?: string
      brand_color?: string
      brokerage_name?: string
      brokerage_logo_url?: string
    } | null

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found for listing' }, { status: 404 })
    }

    // Verify user owns this listing or is staff
    const isOwner = agent.email === user.email
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!isOwner && !staff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get hero photo for the listing
    const { data: heroPhoto } = await supabase
      .from('media_assets')
      .select('aryeo_url')
      .eq('listing_id', listingId)
      .eq('type', 'photo')
      .order('sort_order', { ascending: true })
      .limit(1)
      .single()

    if (!heroPhoto?.aryeo_url) {
      return NextResponse.json(
        { error: 'No photos available for marketing graphics' },
        { status: 400 }
      )
    }

    // Build Just Listed data
    const justListedData: JustListedData = {
      address: listingData.address || '',
      city: listingData.city || 'Orlando',
      state: listingData.state || 'FL',
      price: listingData.asking_price || listingData.price || 0,
      beds: listingData.beds || listingData.bedrooms || 0,
      baths: listingData.baths || listingData.bathrooms || 0,
      sqft: listingData.sqft || listingData.square_feet || 0,
      photoUrl: heroPhoto.aryeo_url,
      agentName: agent.name,
      agentPhone: agent.phone,
      agentLogoUrl: agent.logo_url,
      brokerageName: agent.brokerage_name,
      brokerageLogoUrl: agent.brokerage_logo_url,
      brandColor: agent.brand_color,
    }

    // Generate webhook URL for callbacks
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/marketing/webhook`

    // Generate assets
    const result = await generateJustListedAssets(
      listingId,
      agent.id,
      justListedData,
      formats || ['instagram_square', 'instagram_story'],
      webhookUrl
    )

    // Store pending assets in database (if table exists)
    if (result.success) {
      for (const asset of result.assets) {
        await (supabase as any).from('marketing_assets').insert({
          listing_id: listingId,
          agent_id: agent.id,
          type: 'just_listed',
          format: asset.format,
          status: 'rendering',
          bannerbear_uid: asset.bannerbearUid,
        }).catch(() => {
          // Table might not exist yet
        })
      }
    }

    return NextResponse.json({
      success: result.success,
      assets: result.assets,
      errors: result.errors,
      message: result.success
        ? `Generating ${result.assets.length} marketing asset(s)`
        : 'Failed to generate marketing assets',
    })
  } catch (error) {
    console.error('Just Listed generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate marketing assets' },
      { status: 500 }
    )
  }
}

// GET endpoint to check available formats
export async function GET() {
  return NextResponse.json({
    configured: isMarketingConfigured(),
    formats: ['instagram_square', 'instagram_portrait', 'instagram_story', 'facebook_post'],
    description: 'Generate Just Listed marketing graphics for a listing',
    usage: {
      method: 'POST',
      body: {
        listingId: 'uuid (required)',
        formats: 'array of format strings (optional)',
      },
    },
  })
}
