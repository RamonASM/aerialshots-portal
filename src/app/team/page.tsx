import { redirect } from 'next/navigation'
import { currentUser, auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveRoles, type PartnerRole } from '@/lib/partners/role-detection'

// Auth bypass for development
const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

// Retry delay for rate limited requests (in ms)
const RATE_LIMIT_RETRY_DELAY = 1000

/**
 * Helper to get user with retry on rate limit
 */
async function getUserWithRetry(maxRetries = 2): Promise<{
  email: string | null
  fromFallback: boolean
}> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const user = await currentUser()
      if (user) {
        return {
          email: user.emailAddresses?.[0]?.emailAddress?.toLowerCase() || null,
          fromFallback: false,
        }
      }
      return { email: null, fromFallback: false }
    } catch (error) {
      const errorObj = error as { status?: number; message?: string; toString?: () => string }
      const errorString = errorObj.toString?.() || errorObj.message || ''
      const isRateLimited =
        errorObj.status === 429 ||
        errorString.includes('Too Many Requests') ||
        errorString.toLowerCase().includes('rate')

      if (isRateLimited && attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY * (attempt + 1)))
        continue
      }

      if (isRateLimited) {
        console.warn('[Team Page] Clerk rate limited after retries - checking fallbacks')
        // Try to get email from middleware header
        const headersList = await headers()
        const middlewareEmail = headersList.get('x-user-email')

        if (middlewareEmail) {
          return { email: middlewareEmail.toLowerCase(), fromFallback: true }
        }

        // Check if there's a valid session via auth()
        try {
          const { userId } = await auth()
          if (userId) {
            // User is authenticated - return userId as placeholder
            return { email: `clerk:${userId}`, fromFallback: true }
          }
        } catch {
          // auth() also rate limited
        }

        // Last resort - check for session cookie
        const cookieHeader = headersList.get('cookie') || ''
        if (cookieHeader.includes('__session') || cookieHeader.includes('__client')) {
          return { email: 'session-fallback@aerialshots.media', fromFallback: true }
        }
      }

      throw error // Re-throw non-rate-limit errors
    }
  }
  return { email: null, fromFallback: false }
}

/**
 * Team Portal Index Page
 * Redirects staff to their role-specific dashboard based on their role in the database
 */
export default async function TeamIndexPage() {
  let userEmail: string

  if (authBypassEnabled) {
    userEmail = process.env.AUTH_BYPASS_EMAIL || 'bypass@aerialshots.media'
  } else {
    try {
      const { email, fromFallback } = await getUserWithRetry()

      if (!email) {
        redirect('/sign-in/staff')
      }

      // Handle special clerk:userId format from rate limit fallback
      if (email.startsWith('clerk:')) {
        const userId = email.replace('clerk:', '')
        const supabase = createAdminClient()

        // Try to find staff by auth_user_id
        const { data: staff } = await supabase
          .from('staff')
          .select('email, role')
          .eq('auth_user_id', userId)
          .eq('is_active', true)
          .maybeSingle()

        if (staff?.email) {
          userEmail = staff.email.toLowerCase()
        } else {
          // Try partners
          const { data: partner } = await supabase
            .from('partners')
            .select('email')
            .eq('auth_user_id', userId)
            .maybeSingle()

          if (partner?.email) {
            userEmail = partner.email.toLowerCase()
          } else {
            redirect('/sign-in/staff?error=not_authorized')
          }
        }
      } else {
        userEmail = email
      }

      if (fromFallback) {
        console.log('[Team Page] Using email from fallback:', userEmail)
      }
    } catch (error) {
      console.error('Clerk currentUser() error in team page:', error)
      redirect('/sign-in/staff?error=clerk_error')
    }
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
        // VA (video assistant) uses editor portal
        redirect('/team/editor')
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
          // VA (video assistant) uses editor portal
          redirect('/team/editor')
        default:
          redirect('/team/photographer')
      }
    }
  }

  // No staff or partner record found - redirect to staff sign-in
  redirect('/sign-in/staff?error=no_access')
}
