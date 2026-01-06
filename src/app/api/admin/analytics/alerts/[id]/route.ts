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
    await requireStaffAccess()
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.metric_type !== undefined) updates.metric_type = body.metric_type
    if (body.condition !== undefined) updates.condition = body.condition
    if (body.threshold !== undefined) updates.threshold = body.threshold
    if (body.comparison_period !== undefined) updates.comparison_period = body.comparison_period
    if (body.notification_channels !== undefined) updates.notification_channels = body.notification_channels
    if (body.recipients !== undefined) updates.recipients = body.recipients

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: alert, error } = await supabase
      .from('analytics_alerts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Alert update error:', error)
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
    }

    return NextResponse.json({ alert })
  } catch (error) {
    console.error('Alert PATCH error:', error)
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
      .from('analytics_alerts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Alert delete error:', error)
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Alert DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
