import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderCarousel, isBannerbearConfigured, getEstimatedRenderTime } from '@/lib/integrations/bannerbear/render'
import { LISTINGLAUNCH_CREDITS } from '@/lib/listinglaunch/credits'
import type { CarouselSlide } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ campaignId: string; carouselId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId, carouselId } = await params
    const supabase = createAdminClient()

    // Check if Bannerbear is configured
    if (!isBannerbearConfigured()) {
      return NextResponse.json(
        { error: 'Image rendering is not configured. Please add BANNERBEAR_API_KEY and BANNERBEAR_CAROUSEL_TEMPLATE_ID.' },
        { status: 503 }
      )
    }

    // Get carousel with campaign and listing data
    const { data: carousel, error: carouselError } = await supabase
      .from('listing_carousels')
      .select(`
        id,
        carousel_type,
        slides,
        render_status,
        campaign:listing_campaigns(
          id,
          listing:listings(
            address,
            media_assets(*)
          ),
          agent:agents(
            id,
            logo_url,
            brand_color
          )
        )
      `)
      .eq('id', carouselId)
      .eq('campaign_id', campaignId)
      .single()

    if (carouselError || !carousel) {
      return NextResponse.json(
        { error: 'Carousel not found' },
        { status: 404 }
      )
    }

    // Check if already rendering
    if (carousel.render_status === 'rendering') {
      return NextResponse.json(
        { error: 'Carousel is already being rendered' },
        { status: 409 }
      )
    }

    const campaign = carousel.campaign as {
      id: string
      listing: {
        address: string
        media_assets: Array<{
          id: string
          media_url: string | null
          type: string
          category: string | null
        }>
      }
      agent: {
        id: string
        logo_url: string | null
        brand_color: string | null
      }
    }

    const slides = carousel.slides as CarouselSlide[]

    // Check agent credit balance
    const { data: agentData } = await supabase
      .from('agents')
      .select('credit_balance')
      .eq('id', campaign.agent.id)
      .single()

    const creditBalance = agentData?.credit_balance || 0
    const requiredCredits = LISTINGLAUNCH_CREDITS.CAROUSEL_RENDER

    if (creditBalance < requiredCredits) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Rendering requires ${requiredCredits} credits, you have ${creditBalance}.`,
          requiredCredits,
          currentBalance: creditBalance,
        },
        { status: 402 } // Payment Required
      )
    }

    // Update status to rendering
    await supabase
      .from('listing_carousels')
      .update({
        render_status: 'rendering',
        rendered_image_urls: [],
      })
      .eq('id', carouselId)

    // Get the webhook URL (use environment variable or validate origin)
    let webhookUrl = process.env.BANNERBEAR_WEBHOOK_URL
    if (!webhookUrl) {
      // Only use origin if it matches our allowed domains
      const origin = request.headers.get('origin')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const allowedOrigins = [
        appUrl,
        'https://app.aerialshots.media',
        'http://localhost:3000',
      ].filter(Boolean)

      const baseUrl = origin && allowedOrigins.some(allowed => origin.startsWith(allowed))
        ? origin
        : appUrl

      if (!baseUrl) {
        return NextResponse.json(
          { error: 'Webhook URL not configured. Please set BANNERBEAR_WEBHOOK_URL or NEXT_PUBLIC_APP_URL.' },
          { status: 503 }
        )
      }
      webhookUrl = `${baseUrl}/api/bannerbear/webhook`
    }

    // Start rendering
    const { pendingRenders, errors } = await renderCarousel({
      carouselId,
      slides,
      mediaAssets: campaign.listing.media_assets,
      agentLogoUrl: campaign.agent.logo_url || undefined,
      brandColor: campaign.agent.brand_color || undefined,
      webhookUrl,
    })

    if (pendingRenders.length === 0) {
      // No renders started, reset status
      await supabase
        .from('listing_carousels')
        .update({ render_status: 'failed' })
        .eq('id', carouselId)

      return NextResponse.json(
        { error: 'Failed to start rendering', details: errors },
        { status: 500 }
      )
    }

    // Store Bannerbear UIDs for tracking
    const bannerbearUids = pendingRenders.map(r => r.uid)

    await supabase
      .from('listing_carousels')
      .update({
        bannerbear_collection_uid: bannerbearUids.join(','),
      })
      .eq('id', carouselId)

    // Deduct credits for rendering
    const newBalance = creditBalance - requiredCredits
    await supabase
      .from('agents')
      .update({ credit_balance: newBalance })
      .eq('id', campaign.agent.id)

    // Log the credit transaction
    await supabase.from('credit_transactions').insert({
      agent_id: campaign.agent.id,
      amount: -requiredCredits,
      type: 'asm_ai_tool',
      description: `[ListingLaunch] Rendered ${carousel.carousel_type} carousel for ${campaign.listing.address}`,
    })

    return NextResponse.json({
      success: true,
      carouselId,
      pendingCount: pendingRenders.length,
      errors: errors.length > 0 ? errors : undefined,
      estimatedTime: getEstimatedRenderTime(slides.length),
    })
  } catch (error) {
    console.error('Render error:', error)
    return NextResponse.json(
      { error: 'Failed to start carousel rendering' },
      { status: 500 }
    )
  }
}

// GET - Check render status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId, carouselId } = await params
    const supabase = createAdminClient()

    const { data: carousel, error } = await supabase
      .from('listing_carousels')
      .select('id, render_status, rendered_image_urls, bannerbear_collection_uid, rendered_at')
      .eq('id', carouselId)
      .eq('campaign_id', campaignId)
      .single()

    if (error || !carousel) {
      return NextResponse.json(
        { error: 'Carousel not found' },
        { status: 404 }
      )
    }

    const renderedUrls = (carousel.rendered_image_urls as string[]) || []

    return NextResponse.json({
      carouselId,
      status: carousel.render_status,
      renderedCount: renderedUrls.filter(u => u).length,
      renderedUrls: carousel.render_status === 'completed' ? renderedUrls : undefined,
      renderedAt: carousel.rendered_at,
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check render status' },
      { status: 500 }
    )
  }
}
