import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Verify user is staff
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 403 })
    }

    // Fetch notification rules
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rules, error } = await (supabase as any)
      .from('notification_rules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch rules error:', error)
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
    }

    // Calculate stats
    const totalRules = rules?.length || 0
    const activeRules = rules?.filter((r: { is_active: boolean }) => r.is_active).length || 0
    const inactiveRules = totalRules - activeRules

    const byTrigger: Record<string, number> = {}
    rules?.forEach((rule: { trigger_event: string }) => {
      byTrigger[rule.trigger_event] = (byTrigger[rule.trigger_event] || 0) + 1
    })

    // Transform to UI format (trigger_event -> trigger_type, conditions -> trigger_conditions)
    const transformedRules = rules?.map((rule: { trigger_event: string; conditions: unknown; [key: string]: unknown }) => ({
      ...rule,
      trigger_type: rule.trigger_event,
      trigger_conditions: rule.conditions,
    })) || []

    return NextResponse.json({
      rules: transformedRules,
      stats: {
        totalRules,
        activeRules,
        inactiveRules,
        byTrigger,
      },
    })
  } catch (error) {
    console.error('Notifications API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is staff
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, trigger_type, trigger_conditions, channels, is_active } = body

    if (!name || !trigger_type || !channels?.length) {
      return NextResponse.json(
        { error: 'Name, trigger_type, and channels are required' },
        { status: 400 }
      )
    }

    // Map UI field names to DB field names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rule, error } = await (supabase as any)
      .from('notification_rules')
      .insert({
        name,
        description,
        trigger_event: trigger_type,
        conditions: trigger_conditions,
        channels,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('Create rule error:', error)
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
    }

    return NextResponse.json({ success: true, rule })
  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
