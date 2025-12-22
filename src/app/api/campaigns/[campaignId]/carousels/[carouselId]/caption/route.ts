import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ campaignId: string; carouselId: string }>
}

// PATCH - Update carousel caption and hashtags
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId, carouselId } = await params
    const body = await request.json()
    const { caption, hashtags } = body

    if (caption === undefined && hashtags === undefined) {
      return NextResponse.json(
        { error: 'Caption or hashtags required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify the carousel belongs to this campaign
    const { data: carousel, error: fetchError } = await supabase
      .from('listing_carousels')
      .select('id, campaign_id')
      .eq('id', carouselId)
      .eq('campaign_id', campaignId)
      .single()

    if (fetchError || !carousel) {
      return NextResponse.json(
        { error: 'Carousel not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: { caption?: string; hashtags?: string[]; updated_at: string } = {
      updated_at: new Date().toISOString(),
    }

    if (caption !== undefined) {
      updateData.caption = caption
    }

    if (hashtags !== undefined) {
      // Clean hashtags - remove # prefix if present, trim whitespace
      updateData.hashtags = hashtags.map((tag: string) =>
        tag.replace(/^#/, '').trim()
      ).filter((tag: string) => tag.length > 0)
    }

    // Update the carousel
    const { error: updateError } = await supabase
      .from('listing_carousels')
      .update(updateData)
      .eq('id', carouselId)

    if (updateError) {
      console.error('Error updating caption:', updateError)
      return NextResponse.json(
        { error: 'Failed to update caption' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      caption: updateData.caption,
      hashtags: updateData.hashtags,
    })
  } catch (error) {
    console.error('Caption update error:', error)
    return NextResponse.json(
      { error: 'Failed to update caption' },
      { status: 500 }
    )
  }
}
