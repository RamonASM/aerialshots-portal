import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

// GET /api/admin/integrations/zapier - List all webhooks
export async function GET() {
  try {
    await requireStaffAccess(['admin'])

    const adminSupabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: webhooks, error } = await (adminSupabase as any)
      .from('zapier_webhooks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
    }

    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error('Zapier webhooks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/integrations/zapier - Create a new webhook
export async function POST(request: Request) {
  try {
    await requireStaffAccess(['admin'])

    const body = await request.json()
    const { name, description, webhook_url, trigger_event, filter_conditions } = body

    if (!name || !webhook_url || !trigger_event) {
      return NextResponse.json(
        { error: 'Name, webhook URL, and trigger event are required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: webhook, error } = await (adminSupabase as any)
      .from('zapier_webhooks')
      .insert({
        name,
        url: webhook_url,
        events: [trigger_event],
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating webhook:', error)
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (error) {
    console.error('Zapier webhook creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
