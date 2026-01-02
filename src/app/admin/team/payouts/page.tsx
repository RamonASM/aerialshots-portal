import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PayoutsPageClient } from './PayoutsPageClient'

export const metadata = {
  title: 'Payout Configuration | Admin',
  description: 'Manage team payout settings and Stripe Connect accounts',
}

export default async function PayoutsPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check if user is staff
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!staff) {
    redirect('/dashboard')
  }

  // Get all staff with payout info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staffMembers } = await (supabase as any)
    .from('staff')
    .select(`
      id,
      name,
      email,
      role,
      payout_type,
      default_payout_percent,
      hourly_rate,
      stripe_connect_id,
      stripe_connect_status,
      stripe_payouts_enabled,
      partner_id
    `)
    .eq('is_active', true)
    .order('name')

  // Get partners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: partners } = await (supabase as any)
    .from('partners')
    .select(`
      id,
      name,
      email,
      default_profit_percent,
      payout_schedule,
      stripe_connect_id,
      stripe_connect_status,
      stripe_payouts_enabled
    `)
    .eq('is_active', true)
    .order('name')

  // Get payout settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from('payout_settings')
    .select('key, value')

  const settingsMap: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?.forEach((s: { key: string; value: unknown }) => {
    settingsMap[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value)
  })

  // Get company pool summary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: poolSummary } = await (supabase as any)
    .from('company_pool')
    .select('pool_type, amount_cents, status')
    .eq('status', 'available')

  const poolTotals: Record<string, number> = {
    video_editor: 0,
    qc_fund: 0,
    operating: 0,
  }
  poolSummary?.forEach((p: { pool_type: string; amount_cents: number }) => {
    if (p.pool_type in poolTotals) {
      poolTotals[p.pool_type] += p.amount_cents
    }
  })

  return (
    <PayoutsPageClient
      staffMembers={staffMembers || []}
      partners={partners || []}
      settings={settingsMap}
      poolTotals={poolTotals}
    />
  )
}
