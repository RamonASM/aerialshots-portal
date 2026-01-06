import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await requireStaffAccess(['admin'])
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.slug !== undefined) updates.slug = body.slug
    if (body.city !== undefined) updates.city = body.city
    if (body.state !== undefined) updates.state = body.state
    if (body.description !== undefined) updates.description = body.description
    if (body.hero_image_url !== undefined) updates.hero_image_url = body.hero_image_url
    if (body.lat !== undefined) updates.lat = body.lat
    if (body.lng !== undefined) updates.lng = body.lng
    if (body.is_published !== undefined) updates.is_published = body.is_published

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: community, error } = await supabase
      .from('communities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Community update error:', error)
      return NextResponse.json({ error: 'Failed to update community' }, { status: 500 })
    }

    return NextResponse.json({ community })
  } catch (error) {
    console.error('Community PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await requireStaffAccess(['admin'])
    const supabase = createAdminClient()
    const { id } = await params

    const { error } = await supabase
      .from('communities')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Community delete error:', error)
      return NextResponse.json({ error: 'Failed to delete community' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Community DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
