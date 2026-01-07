import { NextRequest, NextResponse } from 'next/server'
import { getStaffAccess } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

function buildUpdate(body: Record<string, unknown>) {
  const update: Record<string, unknown> = {}

  if (typeof body.is_favorite === 'boolean') {
    update.is_favorite = body.is_favorite
  }
  if (typeof body.download_count === 'number') {
    update.download_count = body.download_count
  }
  if (Array.isArray(body.tags)) {
    update.tags = body.tags
  }
  if (body.metadata && typeof body.metadata === 'object') {
    update.metadata = body.metadata
  }
  if (body.description && typeof body.description === 'string') {
    update.description = body.description
  }

  return update
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await getStaffAccess()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const update = buildUpdate(body)

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    update.updated_at = new Date().toISOString()

    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('marketing_assets')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ asset: data })
  } catch (error) {
    console.error('Error updating marketing asset:', error)
    return NextResponse.json(
      { error: 'Failed to update marketing asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await getStaffAccess()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('marketing_assets')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting marketing asset:', error)
    return NextResponse.json(
      { error: 'Failed to delete marketing asset' },
      { status: 500 }
    )
  }
}
