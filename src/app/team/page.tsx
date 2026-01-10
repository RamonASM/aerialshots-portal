import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveRoles, type PartnerRole } from '@/lib/partners/role-detection'

// Auth bypass for development
const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

/**
 * Team Portal Index Page
 * Redirects staff to their role-specific dashboard based on their role in the database
 */
export default async function TeamIndexPage() {
  let userEmail: string

  if (authBypassEnabled) {
    userEmail = process.env.AUTH_BYPASS_EMAIL || 'bypass@aerialshots.media'
  } else {
    let user
    try {
      user = await currentUser()
    } catch (error) {
      console.error('Clerk currentUser() error in team page:', error)
      redirect('/sign-in/staff?error=clerk_error')
    }

    if (!user?.emailAddresses?.[0]?.emailAddress) {
      redirect('/sign-in/staff')
    }

    userEmail = user.emailAddresses[0].emailAddress.toLowerCase()
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.error('Supabase client error in team page:', error)
    redirect('/sign-in/staff?error=db_error')
  }

  // Check if user is staff
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('id, role')
    .eq('email', userEmail)
    .eq('is_active', true)
    .maybeSingle()

  if (staffError) {
    console.error('Staff query error in team page:', staffError)
  }

  if (staff) {
    // Redirect staff to their role-specific dashboard
    const role = staff.role as string
    switch (role) {
      case 'photographer':
        redirect('/team/photographer')
      case 'videographer':
        redirect('/team/videographer')
      case 'editor':
        redirect('/team/editor')
      case 'qc':
      case 'qc_specialist':
        redirect('/team/qc')
      case 'va':
        redirect('/team/va')
      case 'admin':
        // Admins go to admin panel
        redirect('/admin')
      default:
        // Default to photographer if role unknown
        redirect('/team/photographer')
    }
  }

  // Not staff - check if partner with active roles
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle()

  if (partner) {
    const partnerWithRoles = partner as typeof partner & {
      active_roles?: PartnerRole[]
      designated_staff?: Record<string, string | null>
      role_overrides?: Record<string, boolean>
    }
    const activeRoles = (partnerWithRoles.active_roles || []) as PartnerRole[]
    const designatedStaff = (partnerWithRoles.designated_staff || {}) as Record<string, string | null>
    const roleOverrides = (partnerWithRoles.role_overrides || {}) as Record<string, boolean>

    // Get effective roles
    const effectiveRoles = getEffectiveRoles(activeRoles, designatedStaff, roleOverrides)

    if (effectiveRoles.length > 0) {
      // Redirect to first effective role (PartnerRole: photographer, videographer, qc, va)
      const firstRole = effectiveRoles[0]
      switch (firstRole) {
        case 'photographer':
          redirect('/team/photographer')
        case 'videographer':
          redirect('/team/videographer')
        case 'qc':
          redirect('/team/qc')
        case 'va':
          redirect('/team/va')
        default:
          redirect('/team/photographer')
      }
    }
  }

  // No staff or partner record found - redirect to staff sign-in
  redirect('/sign-in/staff?error=no_access')
}
