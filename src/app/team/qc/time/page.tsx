import { redirect } from 'next/navigation'
import { Clock } from 'lucide-react'
import { getStaffAccess, hasRequiredRole, type StaffAccess } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { TimeClock } from '@/components/team/TimeClock'

/**
 * Check if staff has QC access
 * Uses hasRequiredRole helper which auto-includes admin/owner
 */
function hasQCAccess(staff: StaffAccess): boolean {
  return hasRequiredRole(staff.role, ['qc'])
}

/**
 * QC Time Tracking Page
 *
 * Allows QC specialists to clock in/out and track their work hours.
 * Only accessible to staff with hourly payout type.
 */
export default async function QCTimePage() {
  // Check authentication via Clerk
  const staffAccess = await getStaffAccess()

  if (!staffAccess) {
    redirect('/sign-in/staff')
  }

  // Check QC role access
  if (!hasQCAccess(staffAccess)) {
    redirect('/team/qc')
  }

  const supabase = createAdminClient()

  // Get staff member
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, email, role')
    .eq('email', staffAccess.email)
    .eq('is_active', true)
    .maybeSingle() as { data: {
      id: string
      name: string
      email: string
      role: string | null
    } | null }

  if (!staff) {
    redirect('/sign-in/staff')
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Time Tracking</h1>
        <p className="mt-1 text-zinc-400">Track your work hours for QC tasks</p>
      </div>

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
