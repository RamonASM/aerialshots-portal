import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/media/[id]/preview - Get video preview settings
export async function GET(request: Request, { params }: RouteParams) {
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

    const adminSupabase = createAdminClient()

    // Get media asset
    const { data: asset } = await adminSupabase
      .from('media_assets')
      .select('id, type, aryeo_url')
      .eq('id', id)
      .single()

    if (!asset) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 })
    }

    // Check if it's a video
    if (asset.type !== 'video') {
      return NextResponse.json({ error: 'Not a video asset' }, { status: 400 })
    }

    // Get preview settings (use type cast for new table)
    const { data: preview } = await (adminSupabase as any)
      .from('video_previews')
      .select('*')
      .eq('media_asset_id', id)
      .single()

    return NextResponse.json({
      asset,
      preview: preview || {
        preview_url: null,
        preview_duration: 15,
        watermark_enabled: true,
        generated_at: null,
      },
    })
  } catch (error) {
    console.error('Error fetching video preview:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/media/[id]/preview - Generate or update video preview
export async function POST(request: Request, { params }: RouteParams) {
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
      .eq('user_id', user.id)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { preview_duration, watermark_enabled } = body

    const adminSupabase = createAdminClient()

    // Check if media asset exists and is a video
    const { data: asset } = await adminSupabase
      .from('media_assets')
      .select('id, type, aryeo_url')
      .eq('id', id)
      .single()

    if (!asset) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 })
    }

    if (asset.type !== 'video') {
      return NextResponse.json({ error: 'Not a video asset' }, { status: 400 })
    }

    // Upsert preview settings (use type cast for new table)
    const { data: preview, error } = await (adminSupabase as any)
      .from('video_previews')
      .upsert(
        {
          media_asset_id: id,
          preview_duration: preview_duration || 15,
          watermark_enabled: watermark_enabled !== false,
          // In production, you would trigger video processing here
          // For now, we'll use the original URL as the preview
          preview_url: asset.aryeo_url,
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        },
        {
          onConflict: 'media_asset_id',
        }
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      preview,
      message: 'Video preview settings updated. In production, this would trigger video processing.',
    })
  } catch (error) {
    console.error('Error updating video preview:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
