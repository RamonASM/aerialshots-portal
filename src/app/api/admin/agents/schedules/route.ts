import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET() {
  try {
    try {
      await requireStaffAccess()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: schedules, error } = await supabase
      .from('ai_agent_schedules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching schedules:', error)
      return NextResponse.json({ schedules: [] })
    }

    return NextResponse.json({ schedules: schedules || [] })
  } catch (error) {
    console.error('Error in schedules API:', error)
    return NextResponse.json({ schedules: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireStaffAccess()
    const supabase = createAdminClient()
    const body = await request.json()

    // Calculate next run time
    let nextRunAt = null
    if (body.schedule_type === 'interval' && body.interval_minutes) {
      nextRunAt = new Date(Date.now() + body.interval_minutes * 60000).toISOString()
    } else if (body.schedule_type === 'cron') {
      // For cron, we'd need a library to calculate next run - set to null for now
      nextRunAt = null
    }

    const { data: schedule, error } = await supabase
      .from('ai_agent_schedules')
      .insert({
        agent_slug: body.agent_slug,
        schedule_type: body.schedule_type,
        cron_expression: body.schedule_type === 'cron' ? body.cron_expression : null,
        interval_minutes: body.schedule_type === 'interval' ? body.interval_minutes : null,
        event_trigger: body.schedule_type === 'event' ? body.event_trigger : null,
        max_concurrent: body.max_concurrent || 1,
        is_active: true,
        next_run_at: nextRunAt,
        created_by: access.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating schedule:', error)
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
    }

    return NextResponse.json({ success: true, schedule })
  } catch (error) {
    console.error('Error creating schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
