import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/layout/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is staff
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, role, email')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!staff) {
    redirect(`https://${process.env.NEXT_PUBLIC_APP_DOMAIN}/dashboard`)
  }

  // Fetch badge counts for navigation
  const [pendingJobs, readyForQc, careTasks, activeClients] = await Promise.all([
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .in('ops_status', ['pending', 'scheduled']),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'ready_for_qc'),
    supabase
      .from('care_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  const badgeCounts = {
    pending_jobs: pendingJobs.count || 0,
    ready_for_qc: readyForQc.count || 0,
    care_tasks: careTasks.count || 0,
    active_clients: activeClients.count || 0,
  }

  return (
    <AdminShell
      staff={{
        id: staff.id,
        name: staff.name,
        email: staff.email || user.email!,
        role: staff.role,
      }}
      badgeCounts={badgeCounts}
    >
      {children}
    </AdminShell>
  )
}
