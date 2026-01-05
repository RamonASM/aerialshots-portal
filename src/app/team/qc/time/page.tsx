import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TimeClock } from '@/components/team/TimeClock'

/**
 * Check if staff has QC access
 * Supports: role = 'qc', 'qc_specialist', or 'admin'
 */
function hasQCAccess(staff: { role: string | null }): boolean {
  if (staff.role === 'admin') return true
  if (staff.role === 'qc') return true
  if (staff.role === 'qc_specialist') return true
  return false
}

/**
 * QC Time Tracking Page
 *
 * Allows QC specialists to clock in/out and track their work hours.
 * Only accessible to staff with hourly payout type.
 */
export default async function QCTimePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff-login')
  }

  // Get staff member with time tracking info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staff } = await (supabase as any)
    .from('staff')
    .select('id, name, email, role, payout_type, hourly_rate')
    .eq('email', user.email!)
    .single() as { data: {
      id: string
      name: string
      email: string
      role: string | null
      payout_type: string | null
      hourly_rate: number | null
    } | null }

  if (!staff) {
    redirect('/staff-login')
  }

  // Check QC role access
  if (!hasQCAccess(staff)) {
    redirect('/team/qc')
  }

  // Time tracking is only for hourly workers
  if (staff.payout_type !== 'hourly') {
    redirect('/team/qc')
  }

  const hasHourlyRate = !!staff.hourly_rate

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Time Tracking</h1>
        <p className="mt-1 text-zinc-400">Track your work hours for QC tasks</p>
      </div>

      {/* Hourly Rate Warning */}
      {!hasHourlyRate && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-400">Hourly Rate Not Configured</p>
              <p className="text-sm text-amber-400/80">
                Please contact an administrator to set your hourly rate before tracking time.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Clock Component */}
      <TimeClock />

      {/* Quick Navigation */}
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardContent className="py-4">
          <a
            href="/team/qc"
            className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/20 p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-zinc-500" />
              <span className="font-medium text-white">Back to QC Dashboard</span>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
