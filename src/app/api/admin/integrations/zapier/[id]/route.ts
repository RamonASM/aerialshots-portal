import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/integrations/zapier/[id] - Get webhook details with logs
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    await requireStaffAccess(['admin'])

    const adminSupabase = createAdminClient()

    // Get webhook (use type cast since zapier_webhooks is a new table)
    const { data: webhook, error: webhookError } = await (adminSupabase as any)
      .from('zapier_webhooks')
      .select('*')
      .eq('id', id)
      .single()

    if (webhookError || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Get recent logs
    const { data: logs } = await (adminSupabase as any)
      .from('zapier_webhook_logs')
      .select('*')
      .eq('webhook_id', id)
      .order('triggered_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ webhook, logs: logs || [] })
  } catch (error) {
    console.error('Zapier webhook detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/integrations/zapier/[id] - Update a webhook
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    await requireStaffAccess(['admin'])

    const body = await request.json()
    const { name, description, webhook_url, trigger_event, filter_conditions, is_active } = body

    const adminSupabase = createAdminClient()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (webhook_url !== undefined) updates.webhook_url = webhook_url
    if (trigger_event !== undefined) updates.trigger_event = trigger_event
    if (filter_conditions !== undefined) updates.filter_conditions = filter_conditions
    if (is_active !== undefined) updates.is_active = is_active

    // Use type cast since zapier_webhooks is a new table
    const { data: webhook, error } = await (adminSupabase as any)
      .from('zapier_webhooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating webhook:', error)
      return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
    }

    return NextResponse.json({ webhook })
  } catch (error) {
    console.error('Zapier webhook update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/integrations/zapier/[id] - Delete a webhook
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    await requireStaffAccess(['admin'])

    const adminSupabase = createAdminClient()

    // Use type cast since zapier_webhooks is a new table
    const { error } = await (adminSupabase as any)
      .from('zapier_webhooks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting webhook:', error)
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Zapier webhook delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
