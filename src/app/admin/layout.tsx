import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminShell } from '@/components/admin/layout/AdminShell'

// Force dynamic rendering - admin routes require authentication
export const dynamic = 'force-dynamic'

// Auth bypass for development/testing - must be explicitly enabled via env var
const authBypassEnabled = process.env.AUTH_BYPASS === 'true'

// Allowed partner emails - production list only (no test emails)
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
    // Only allow bypass if explicitly enabled
    if (!authBypassEnabled) {
      redirect('/sign-in/partner?error=clerk_error')
    }
  }

  // Require authenticated user unless bypass is enabled
  if (!user && !authBypassEnabled) {
    redirect('/sign-in/partner')
  }

  // Get user email - require it unless bypass is enabled
  const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase()
  if (!userEmail && !authBypassEnabled) {
    redirect('/sign-in/partner?error=no_email')
  }

  // Fallback email only used when auth bypass is explicitly enabled
  const effectiveEmail = userEmail || (authBypassEnabled ? 'bypass@aerialshots.media' : '')

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
      .eq('email', effectiveEmail)
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
        .eq('email', effectiveEmail)
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
        userEmail: effectiveEmail,
      })
    }

    if (!partner) {
      // Check if this email is an allowed partner email
      const isAllowedPartner = ALLOWED_PARTNER_EMAILS.includes(effectiveEmail)

      if (isAllowedPartner && user) {
        // Partner record doesn't exist but email is allowed - create it
        console.log(`[Admin Layout] Creating partner record for allowed email: ${effectiveEmail}`)
        const userName = user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || effectiveEmail.split('@')[0]

        try {
          const { data: newPartner, error: createError } = await adminSupabase
            .from('partners')
            .insert({
              name: userName,
              email: effectiveEmail,
              clerk_user_id: user.id,
              is_active: true,
            })
            .select('id, name, email')
            .single()

          if (createError) {
            console.error('[Admin Layout] Failed to create partner:', createError)
            // Only use fallback if auth bypass is enabled
            if (authBypassEnabled) {
              adminUser = {
                id: user.id,
                name: userName,
                email: effectiveEmail,
                role: 'partner',
              }
            } else {
              redirect('/sign-in/partner?error=partner_create_failed')
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
          if (authBypassEnabled) {
            adminUser = {
              id: user.id,
              name: userName,
              email: effectiveEmail,
              role: 'partner',
            }
          } else {
            redirect('/sign-in/partner?error=partner_insert_exception')
          }
        }
      } else if (authBypassEnabled) {
        // Auth bypass mode - create temporary admin user
        console.warn('[Admin Layout] Auth bypass enabled - creating temporary admin user')
        adminUser = {
          id: 'bypass-user',
          name: 'Bypass User',
          email: effectiveEmail,
          role: 'partner',
        }
      } else {
        // Not an allowed partner email - redirect to dashboard
        console.log(`[Admin Layout] User ${effectiveEmail} is not a partner, redirecting to dashboard`)
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
  } catch { /* ignore */ }

  try {
    const { count } = await adminSupabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'ready_for_qc')
    badgeCounts.ready_for_qc = count || 0
  } catch { /* ignore */ }

  try {
    const { count } = await adminSupabase
      .from('care_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    badgeCounts.care_tasks = count || 0
  } catch { /* ignore */ }

  try {
    const { count } = await adminSupabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    badgeCounts.active_clients = count || 0
  } catch { /* ignore */ }

  // Final safety check - should never reach here without adminUser
  if (!adminUser) {
    console.error('[Admin Layout] No admin user found after all checks, redirecting to dashboard')
    redirect('/dashboard?error=no_admin_user')
  }

  return (
    <AdminShell
      staff={{
        id: adminUser.id || 'unknown',
        name: adminUser.name || effectiveEmail.split('@')[0] || 'User',
        email: adminUser.email || effectiveEmail,
        role: adminUser.role || 'partner',
      }}
      badgeCounts={badgeCounts}
    >
      {children}
    </AdminShell>
  )
}
