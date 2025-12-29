import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch listing with media assets
    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        *,
        agent:agents(id, name, email, brand_color, headshot_url, logo_url),
        media_assets(
          id,
          aryeo_url,
          type,
          category,
          sort_order,
          tip_text,
          qc_status,
          qc_notes,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching listing:', error)
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Organize media by category
    const mediaByCategory: Record<string, typeof listing.media_assets> = {
      mls: [],
      social_feed: [],
      social_stories: [],
      print: [],
      video: [],
      floorplan: [],
      matterport: [],
      interactive: [],
    }

    for (const asset of listing.media_assets || []) {
      if (asset.type === 'video') {
        mediaByCategory.video.push(asset)
      } else if (asset.type === 'floorplan') {
        mediaByCategory.floorplan.push(asset)
      } else if (asset.type === 'matterport') {
        mediaByCategory.matterport.push(asset)
      } else if (asset.type === 'interactive') {
        mediaByCategory.interactive.push(asset)
      } else if (asset.category && mediaByCategory[asset.category]) {
        mediaByCategory[asset.category].push(asset)
      } else {
        mediaByCategory.mls.push(asset)
      }
    }

    // Sort by sort_order within each category
    for (const key of Object.keys(mediaByCategory)) {
      mediaByCategory[key].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }

    return NextResponse.json({
      listing,
      mediaByCategory,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      template_id,
      seo_title,
      seo_description,
      media_updates,
    } = body

    // Update listing fields
    const listingUpdates: Record<string, unknown> = {}
    if (template_id !== undefined) listingUpdates.template_id = template_id

    if (Object.keys(listingUpdates).length > 0) {
      const { error: listingError } = await supabase
        .from('listings')
        .update(listingUpdates)
        .eq('id', id)

      if (listingError) throw listingError
    }

    // Update media assets if provided
    if (media_updates && Array.isArray(media_updates)) {
      for (const update of media_updates) {
        const { id: assetId, sort_order, category, tip_text, qc_status, qc_notes } = update
        const assetUpdates: Record<string, unknown> = {}
        
        if (sort_order !== undefined) assetUpdates.sort_order = sort_order
        if (category !== undefined) assetUpdates.category = category
        if (tip_text !== undefined) assetUpdates.tip_text = tip_text
        if (qc_status !== undefined) assetUpdates.qc_status = qc_status
        if (qc_notes !== undefined) assetUpdates.qc_notes = qc_notes

        if (Object.keys(assetUpdates).length > 0) {
          await supabase
            .from('media_assets')
            .update(assetUpdates)
            .eq('id', assetId)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating property:', error)
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    )
  }
}
