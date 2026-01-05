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
  let staff = null
  let staffError = null
  try {
    const result = await adminSupabase
      .from('staff')
      .select('id, name, role, email')
      .eq('email', userEmail)
      .eq('is_active', true)
      .maybeSingle()
    staff = result.data
    staffError = result.error
  } catch (error) {
    console.error('Staff query exception in admin layout:', error)
  }

  if (staffError) {
    console.error('Staff query error in admin layout:', staffError)
  }

  let adminUser = staff

  if (!adminUser) {
    let partner = null
    let partnerError = null
    try {
      const result = await adminSupabase
        .from('partners')
        .select('id, name, email')
        .eq('email', userEmail)
        .eq('is_active', true)
        .maybeSingle()
      partner = result.data
      partnerError = result.error
    } catch (error) {
      console.error('Partner query exception in admin layout:', error)
    }

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

        try {
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
            // Use fallback partner data so page can still render
            adminUser = {
              id: user.id,
              name: userName,
              email: userEmail,
              role: 'partner',
            }
          } else if (newPartner) {
            console.log(`[Admin Layout] Created partner record: ${newPartner.id}`)
            adminUser = {
              id: newPartner.id,
              name: newPartner.name,
              email: newPartner.email,
              role: 'partner',
            }
          }
        } catch (error) {
          console.error('[Admin Layout] Partner insert exception:', error)
          // Use fallback partner data so page can still render
          adminUser = {
            id: user.id,
            name: userName,
            email: userEmail,
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

  // Fetch badge counts for navigation (each query wrapped separately to handle missing tables)
  const badgeCounts = {
    pending_jobs: 0,
    ready_for_qc: 0,
    care_tasks: 0,
    active_clients: 0,
  }

  // Fetch each count separately to avoid one failure breaking all
  try {
    const { count } = await adminSupabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .in('ops_status', ['pending', 'scheduled'])
    badgeCounts.pending_jobs = count || 0
  } catch (e) { /* ignore */ }

  try {
    const { count } = await adminSupabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'ready_for_qc')
    badgeCounts.ready_for_qc = count || 0
  } catch (e) { /* ignore */ }

  try {
    const { count } = await adminSupabase
      .from('care_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    badgeCounts.care_tasks = count || 0
  } catch (e) { /* ignore */ }

  try {
    const { count } = await adminSupabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    badgeCounts.active_clients = count || 0
  } catch (e) { /* ignore */ }

  // Final safety check - should never reach here without adminUser
  if (!adminUser) {
    console.error('[Admin Layout] No admin user found after all checks, redirecting to dashboard')
    redirect('/dashboard?error=no_admin_user')
  }

  return (
    <AdminShell
      staff={{
        id: adminUser.id || 'unknown',
        name: adminUser.name || userEmail.split('@')[0] || 'User',
        email: adminUser.email || userEmail,
        role: adminUser.role || 'partner',
      }}
      badgeCounts={badgeCounts}
    >
      {children}
    </AdminShell>
  )
}
