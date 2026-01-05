import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminShell } from '@/components/admin/layout/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is staff or partner
  const { data: staff } = await adminSupabase
    .from('staff')
    .select('id, name, role, email')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  let adminUser = staff

  if (!adminUser) {
    const { data: partner } = await adminSupabase
      .from('partners')
      .select('id, name, email')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!partner) {
      redirect(`https://${process.env.NEXT_PUBLIC_APP_DOMAIN}/dashboard`)
    }

    adminUser = {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      role: 'partner',
    }
  }

  // Fetch badge counts for navigation
  const [pendingJobs, readyForQc, careTasks, activeClients] = await Promise.all([
    adminSupabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .in('ops_status', ['pending', 'scheduled']),
    adminSupabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'ready_for_qc'),
    adminSupabase
      .from('care_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    adminSupabase
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
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email || user.email!,
        role: adminUser.role,
      }}
      badgeCounts={badgeCounts}
    >
      {children}
    </AdminShell>
  )
}
