import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminShell } from '@/components/admin/layout/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await currentUser()
  } catch (error) {
    console.error('Clerk currentUser() error in admin layout:', error)
    redirect('/sign-in/partner?error=clerk_error')
  }

  if (!user?.emailAddresses?.[0]?.emailAddress) {
    redirect('/sign-in/partner')
  }

  const userEmail = user.emailAddresses[0].emailAddress.toLowerCase()

  let adminSupabase
  try {
    adminSupabase = createAdminClient()
  } catch (error) {
    console.error('Supabase client error in admin layout:', error)
    redirect('/sign-in/partner?error=db_error')
  }

  // Check if user is staff or partner
  const { data: staff, error: staffError } = await adminSupabase
    .from('staff')
    .select('id, name, role, email')
    .eq('email', userEmail)
    .eq('is_active', true)
    .maybeSingle()

  if (staffError) {
    console.error('Staff query error in admin layout:', staffError)
  }

  let adminUser = staff

  if (!adminUser) {
    const { data: partner, error: partnerError } = await adminSupabase
      .from('partners')
      .select('id, name, email')
      .eq('email', userEmail)
      .eq('is_active', true)
      .maybeSingle()

    if (partnerError) {
      console.error('Partner query error in admin layout:', partnerError)
    }

    if (!partner) {
      redirect('/dashboard')
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
        email: adminUser.email || userEmail,
        role: adminUser.role,
      }}
      badgeCounts={badgeCounts}
    >
      {children}
    </AdminShell>
  )
}
