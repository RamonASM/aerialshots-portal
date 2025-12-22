import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CarouselSlide } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ campaignId: string; carouselId: string }>
}

// PATCH - Update slides in a carousel
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId, carouselId } = await params
    const body = await request.json()
    const { slides } = body as { slides: CarouselSlide[] }

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json(
        { error: 'slides array is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify carousel belongs to campaign
    const { data: carousel, error: carouselError } = await supabase
      .from('listing_carousels')
      .select('id, campaign_id, render_status')
      .eq('id', carouselId)
      .eq('campaign_id', campaignId)
      .single()

    if (carouselError || !carousel) {
      return NextResponse.json(
        { error: 'Carousel not found' },
        { status: 404 }
      )
    }

    // Validate slide structure
    for (const slide of slides) {
      if (!slide.headline || typeof slide.headline !== 'string') {
        return NextResponse.json(
          { error: 'Each slide must have a headline' },
          { status: 400 }
        )
      }
      if (slide.headline.length > 100) {
        return NextResponse.json(
          { error: 'Headlines must be 100 characters or less' },
          { status: 400 }
        )
      }
      if (slide.body && slide.body.length > 500) {
        return NextResponse.json(
          { error: 'Body text must be 500 characters or less' },
          { status: 400 }
        )
      }
    }

    // If carousel was already rendered, reset render status since content changed
    const updateData: Record<string, unknown> = {
      slides,
      updated_at: new Date().toISOString(),
    }

    if (carousel.render_status === 'completed') {
      updateData.render_status = 'pending'
      updateData.rendered_image_urls = []
    }

    // Update slides
    const { error: updateError } = await supabase
      .from('listing_carousels')
      .update(updateData)
      .eq('id', carouselId)

    if (updateError) {
      console.error('Error updating slides:', updateError)
      return NextResponse.json(
        { error: 'Failed to update slides' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      carouselId,
      slidesCount: slides.length,
      renderStatusReset: carousel.render_status === 'completed',
    })
  } catch (error) {
    console.error('Slides update error:', error)
    return NextResponse.json(
      { error: 'Failed to update slides' },
      { status: 500 }
    )
  }
}
