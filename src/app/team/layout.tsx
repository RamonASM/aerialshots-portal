import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { currentUser } from '@clerk/nextjs/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import {
  Camera,
  Video,
  CheckCircle,
  Palette,
  Home,
  Calendar,
  Settings,
  Headphones,
  ArrowLeftRight,
  Clock,
} from 'lucide-react'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { AdminThemeProvider } from '@/components/admin/theme/ThemeProvider'
import { getEffectiveRoles, type PartnerRole } from '@/lib/partners/role-detection'

// Auth bypass for development
const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

// Retry delay for rate limited requests (in ms)
const RATE_LIMIT_RETRY_DELAY = 1000

// Team role navigation items
const roleNavItems = {
  photographer: [
    { href: '/team/photographer', label: 'Dashboard', icon: Home },
    { href: '/team/photographer/schedule', label: 'Schedule', icon: Calendar },
    { href: '/team/photographer/availability', label: 'Availability', icon: Clock },
    { href: '/team/photographer/settings', label: 'Settings', icon: Settings },
  ],
  videographer: [
    { href: '/team/videographer', label: 'Dashboard', icon: Home },
    { href: '/team/videographer/schedule', label: 'Schedule', icon: Calendar },
    { href: '/team/videographer/availability', label: 'Availability', icon: Clock },
    { href: '/team/videographer/settings', label: 'Settings', icon: Settings },
  ],
  editor: [
    { href: '/team/editor', label: 'Dashboard', icon: Home },
    { href: '/team/editor/queue', label: 'Edit Queue', icon: Palette },
    { href: '/team/editor/settings', label: 'Settings', icon: Settings },
  ],
  qc_specialist: [
    { href: '/team/qc', label: 'Dashboard', icon: Home },
    { href: '/team/qc/queue', label: 'QC Queue', icon: CheckCircle },
    { href: '/team/qc/settings', label: 'Settings', icon: Settings },
  ],
  qc: [
    { href: '/team/qc', label: 'Dashboard', icon: Home },
    { href: '/team/qc/queue', label: 'QC Queue', icon: CheckCircle },
    { href: '/team/qc/settings', label: 'Settings', icon: Settings },
  ],
  va: [
    // VA (video assistant) uses editor portal routes
    { href: '/team/editor', label: 'Dashboard', icon: Home },
    { href: '/team/editor/queue', label: 'Edit Queue', icon: Palette },
    { href: '/team/editor/settings', label: 'Settings', icon: Settings },
  ],
}

const roleIcons: Record<string, typeof Camera> = {
  photographer: Camera,
  videographer: Video,
  editor: Palette,
  qc_specialist: CheckCircle,
  qc: CheckCircle,
  va: Headphones,
}

const roleLabels: Record<string, string> = {
  photographer: 'Photographer',
  videographer: 'Videographer',
  editor: 'Editor',
  qc_specialist: 'QC Specialist',
  qc: 'QC Specialist',
  va: 'Virtual Assistant',
}

// Map pathname prefixes to roles
function extractRoleFromPath(pathname: string): string | null {
  if (pathname.startsWith('/team/photographer')) return 'photographer'
  if (pathname.startsWith('/team/videographer')) return 'videographer'
  if (pathname.startsWith('/team/editor')) return 'editor'
  if (pathname.startsWith('/team/qc')) return 'qc'
  if (pathname.startsWith('/team/va')) return 'va'
  return null
}

/**
 * Helper to get user with retry on rate limit
 */
async function getUserWithRetry(maxRetries = 2): Promise<{
  email: string | null
  name: string | null
  fromHeader: boolean
}> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const user = await currentUser()
      if (user) {
        return {
          email: user.emailAddresses?.[0]?.emailAddress?.toLowerCase() || null,
          name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
          fromHeader: false,
        }
      }
      return { email: null, name: null, fromHeader: false }
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
        console.warn('[Team Layout] Clerk rate limited after retries - checking headers')
        // Try to get email from middleware header
        const headersList = await headers()
        const middlewareEmail = headersList.get('x-user-email')

        if (middlewareEmail) {
          return { email: middlewareEmail.toLowerCase(), name: null, fromHeader: true }
        }

        // Check if there's a valid session via auth()
        try {
          const { userId } = await auth()
          if (userId) {
            // User is authenticated but we can't get details
            // Use a placeholder that will be looked up in the database
            console.log('[Team Layout] Using auth() fallback - user authenticated as:', userId)
            return { email: `clerk:${userId}`, name: null, fromHeader: true }
          }
        } catch {
          // auth() also rate limited, but user might still be logged in
        }

        // Last resort - check for session cookie
        const cookieHeader = headersList.get('cookie') || ''
        if (cookieHeader.includes('__session') || cookieHeader.includes('__client')) {
          return { email: 'session-fallback@aerialshots.media', name: null, fromHeader: true }
        }
      }

      throw error // Re-throw non-rate-limit errors
    }
  }
  return { email: null, name: null, fromHeader: false }
}

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userEmail = ''
  let userName: string | null = null

  if (authBypassEnabled) {
    // Use bypass identity
    console.log('[Team Page] Auth bypass enabled - creating temporary partner data')
    userEmail = process.env.AUTH_BYPASS_EMAIL || 'bypass@aerialshots.media'
  } else {
    try {
      const { email, name, fromHeader } = await getUserWithRetry()

      if (email) {
        // Handle special clerk:userId format from rate limit fallback
        if (email.startsWith('clerk:')) {
          // We have a userId but no email - look up in database by clerk_user_id first
          const userId = email.replace('clerk:', '')
          const supabase = createAdminClient()

          // Try to find staff by clerk_user_id first (text column for Clerk IDs)
          let { data: staff } = await supabase
            .from('staff')
            .select('email')
            .eq('clerk_user_id', userId)
            .eq('is_active', true)
            .maybeSingle()

          // Fallback to auth_user_id (UUID column) if not found
          if (!staff) {
            const { data: staffByAuth } = await supabase
              .from('staff')
              .select('email')
              .eq('auth_user_id', userId)
              .eq('is_active', true)
              .maybeSingle()
            staff = staffByAuth
          }

          if (staff?.email) {
            userEmail = staff.email.toLowerCase()
          } else {
            // Try partners by clerk_user_id first
            let { data: partner } = await supabase
              .from('partners')
              .select('email')
              .eq('clerk_user_id', userId)
              .maybeSingle()

            // Fallback to auth_user_id if not found
            if (!partner) {
              const { data: partnerByAuth } = await supabase
                .from('partners')
                .select('email')
                .eq('auth_user_id', userId)
                .maybeSingle()
              partner = partnerByAuth
            }

            if (partner?.email) {
              userEmail = partner.email.toLowerCase()
            } else {
              // User exists in Clerk but not in our database
              redirect('/sign-in/staff?error=not_authorized')
            }
          }
        } else {
          userEmail = email
          userName = name
        }

        if (fromHeader) {
          console.log('[Team Layout] Using email from fallback:', userEmail)
        }
      } else {
        redirect('/sign-in/staff')
      }
    } catch (error) {
      console.error('[Team Layout] Auth error:', error)
      redirect('/sign-in/staff?error=auth_error')
    }
  }

  // Get current pathname from headers
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '/team'

  let supabase
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.error('Supabase client error in team layout:', error)
    redirect('/sign-in/staff?error=db_error')
  }

  // Get staff member with role
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('id, name, email, role')
    .eq('email', userEmail)
    .eq('is_active', true)
    .maybeSingle()

  if (staffError) {
    console.error('Staff query error in team layout:', staffError)
  }

  // Track if user is a partner with active roles
  let isPartner = false
  let partnerActiveRoles: PartnerRole[] = []
  let teamUser: { id: string; name: string; email: string; role: string } | null = null

  if (staff) {
    // Regular staff member
    teamUser = staff
  } else {
    // Not staff - check if partner with active roles
    const { data: partner } = await supabase
      .from('partners')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle()

    if (partner) {
      // Type assertion for new columns (until migration applied and types regenerated)
      const partnerWithRoles = partner as typeof partner & {
        active_roles?: PartnerRole[]
        designated_staff?: Record<string, string | null>
        role_overrides?: Record<string, boolean>
      }
      const activeRoles = (partnerWithRoles.active_roles || []) as PartnerRole[]
      const designatedStaff = (partnerWithRoles.designated_staff || {}) as Record<string, string | null>
      const roleOverrides = (partnerWithRoles.role_overrides || {}) as Record<string, boolean>

      // Get effective roles (not blocked by designated staff unless overridden)
      const effectiveRoles = getEffectiveRoles(activeRoles, designatedStaff, roleOverrides)

      if (effectiveRoles.length > 0) {
        isPartner = true
        partnerActiveRoles = effectiveRoles

        // Extract role from current path
        const currentRole = extractRoleFromPath(pathname)

        // Validate partner has access to this role
        if (currentRole && effectiveRoles.includes(currentRole as PartnerRole)) {
          teamUser = {
            id: partner.id,
            name: partner.name || 'Partner',
            email: partner.email,
            role: currentRole,
          }
        } else if (effectiveRoles.length > 0) {
          // Default to first effective role if path doesn't match
          teamUser = {
            id: partner.id,
            name: partner.name || 'Partner',
            email: partner.email,
            role: effectiveRoles[0],
          }
        }
      }
    }
  }

  if (!teamUser) {
    redirect('/sign-in/staff')
  }

  const teamRole = (teamUser.role as keyof typeof roleNavItems) || 'photographer'
  const navItems = roleNavItems[teamRole] || roleNavItems.photographer
  const RoleIcon = roleIcons[teamRole] || Camera
  const roleLabel = roleLabels[teamRole] || 'Team Member'

  return (
    <AdminThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 bg-card border-b border-border lg:hidden">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <RoleIcon className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">ASM {roleLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{teamUser.name}</span>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-border">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <RoleIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">ASM Portal</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Role Switcher for Partners with multiple roles */}
            {isPartner && partnerActiveRoles.length > 1 && (
              <div className="px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3" />
                  Switch Role
                </p>
                <div className="space-y-1">
                  {partnerActiveRoles.map((role) => {
                    const Icon = roleIcons[role] || Camera
                    const label = roleLabels[role] || role
                    const isCurrentRole = role === teamRole
                    const href = `/team/${role === 'qc' ? 'qc' : role}`
                    return (
                      <Link
                        key={role}
                        href={href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isCurrentRole
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                        {isCurrentRole && (
                          <span className="ml-auto text-xs bg-primary/20 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* User Info */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {teamUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{teamUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{teamUser.email}</p>
                  {isPartner && (
                    <p className="text-xs text-primary mt-0.5">Partner</p>
                  )}
                </div>
              </div>
              <SignOutButton
                variant="ghost"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors justify-start"
                redirectUrl="/sign-in/staff"
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 lg:ml-64">
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden z-50">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </AdminThemeProvider>
  )
}
