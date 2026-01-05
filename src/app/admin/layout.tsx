import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminShell } from '@/components/admin/layout/AdminShell'

// Allowed partner emails - same list as in Clerk webhook
const ALLOWED_PARTNER_EMAILS = [
  'ramon@aerialshots.media',
  'alex@aerialshots.media',
]

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
      console.error('Partner query error in admin layout:', {
        error: partnerError,
        code: partnerError?.code,
        message: partnerError?.message,
        details: partnerError?.details,
        hint: partnerError?.hint,
        userEmail,
      })
    }

    if (!partner) {
      // Check if this email is an allowed partner email
      const isAllowedPartner = ALLOWED_PARTNER_EMAILS.includes(userEmail)

      if (isAllowedPartner) {
        // Partner record doesn't exist but email is allowed - create it
        console.log(`[Admin Layout] Creating partner record for allowed email: ${userEmail}`)
        const userName = user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || userEmail.split('@')[0]

        const { data: newPartner, error: createError } = await adminSupabase
          .from('partners')
          .insert({
            name: userName,
            email: userEmail,
            clerk_user_id: user.id,
            is_active: true,
          })
          .select('id, name, email')
          .single()

        if (createError) {
          console.error('[Admin Layout] Failed to create partner:', createError)
          // Still redirect to dashboard if we can't create the record
          redirect('/dashboard?error=partner_creation_failed')
        }

        if (newPartner) {
          console.log(`[Admin Layout] Created partner record: ${newPartner.id}`)
          adminUser = {
            id: newPartner.id,
            name: newPartner.name,
            email: newPartner.email,
            role: 'partner',
          }
        }
      } else {
        // Not an allowed partner email - redirect to dashboard
        console.log(`[Admin Layout] User ${userEmail} is not a partner, redirecting to dashboard`)
        redirect('/dashboard')
      }
    } else {
      adminUser = {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        role: 'partner',
      }
    }
  }

  // Fetch badge counts for navigation (wrapped in try-catch to prevent page crashes)
  let badgeCounts = {
    pending_jobs: 0,
    ready_for_qc: 0,
    care_tasks: 0,
    active_clients: 0,
  }

  try {
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

    badgeCounts = {
      pending_jobs: pendingJobs.count || 0,
      ready_for_qc: readyForQc.count || 0,
      care_tasks: careTasks.count || 0,
      active_clients: activeClients.count || 0,
    }
  } catch (error) {
    console.error('Error fetching badge counts in admin layout:', error)
    // Continue with default zero counts - don't crash the page
  }

  // Final safety check - should never reach here without adminUser
  if (!adminUser) {
    console.error('[Admin Layout] No admin user found after all checks, redirecting to dashboard')
    redirect('/dashboard?error=no_admin_user')
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
