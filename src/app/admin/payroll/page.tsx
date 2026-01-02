import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PayrollClient } from './PayrollClient'

export const metadata = {
  title: 'Payroll | Admin',
  description: 'Manage pay periods and hourly worker timesheets',
}

export default async function PayrollPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check if user is admin staff
  const { data: staff } = await supabase
    .from('staff')
    .select('id, role')
    .eq('email', user.email!)
    .single()

  if (!staff || staff.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get pay periods (most recent first)
  const { data: payPeriods } = await supabase
    .from('pay_periods')
    .select('*')
    .order('start_date', { ascending: false })

  // Get hourly staff members
  const { data: hourlyStaff } = await supabase
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
    .order('name')

  return (
    <PayrollClient
      payPeriods={payPeriods || []}
      staffWithTimesheets={hourlyStaff || []}
    />
  )
}
