import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/payouts/settings
 * Get all payout settings
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
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

    // Get all settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings, error } = await (supabase as any)
      .from('payout_settings')
      .select('key, value')

    if (error) {
      throw error
    }

    // Convert to object
    const settingsMap: Record<string, string> = {}
    settings?.forEach((s: { key: string; value: unknown }) => {
      settingsMap[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value)
    })

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('[Payouts] Error getting settings:', error)
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/payouts/settings
 * Update payout settings
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
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
    const settings = body.settings as Record<string, string>

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
    }

    // Validate setting keys
    const validKeys = [
      'photographer_default_percent',
      'videographer_default_percent',
      'partner_default_percent',
      'video_editor_pool_percent',
      'qc_pool_percent',
      'operating_pool_percent',
      'qc_hourly_rate',
      'auto_payout_enabled',
    ]

    const adminSupabase = createAdminClient()

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      if (!validKeys.includes(key)) {
        continue // Skip invalid keys
      }

      // Validate numeric values for percentages
      if (key.endsWith('_percent')) {
        const numValue = parseFloat(value)
        if (isNaN(numValue) || numValue < 0 || numValue > 100) {
          return NextResponse.json(
            { error: `Invalid percentage for ${key}: must be 0-100` },
            { status: 400 }
          )
        }
      }

      // Upsert the setting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminSupabase as any)
        .from('payout_settings')
        .upsert(
          {
            key,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )

      if (error) {
        console.error(`[Payouts] Error updating ${key}:`, error)
        throw error
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Payouts] Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
