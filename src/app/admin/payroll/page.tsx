import { createAdminClient } from '@/lib/supabase/admin'
import { PayrollClient } from './PayrollClient'

export const metadata = {
  title: 'Payroll | Admin',
  description: 'Manage pay periods and hourly worker timesheets',
}

export default async function PayrollPage() {
  // Auth is handled by admin layout - just get the data
  const supabase = createAdminClient()

  // Get pay periods (most recent first)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payPeriods } = await (supabase as any)
    .from('pay_periods')
    .select('*')
    .order('start_date', { ascending: false }) as { data: import('@/lib/supabase/types').PayPeriodRow[] | null }

  // Get hourly staff members
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hourlyStaff } = await (supabase as any)
    .from('staff')
    .select(`
      id,
      name,
      email,
      role,
      hourly_rate,
      payout_type
    `)
    .eq('payout_type', 'hourly')
    .eq('is_active', true)
    .order('name') as { data: Array<{ id: string; name: string; email: string; role: string; hourly_rate: number; payout_type: string }> | null }

  return (
    <PayrollClient
      payPeriods={payPeriods || []}
      staffWithTimesheets={hourlyStaff || []}
    />
  )
}
