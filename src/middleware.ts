import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

// Check if Clerk is properly configured
const clerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
)

const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/login',
  '/staff-login',
  '/auth(.*)',
  '/client(.*)',
  '/developers(.*)',
  '/api/auth/(.*)',
  '/api/stripe/webhook',
  '/api/webhooks/(.*)',
  '/api/cron(.*)',
  '/api/public/(.*)',
  '/api/v1/(.*)', // Life Here API (public)
  '/property/(.*)', // Property websites (public)
  '/community/(.*)', // Community pages (public)
  '/delivery/(.*)', // Delivery pages (may require auth token)
  '/book(.*)', // Booking flow (public until payment)
  // Marketing pages (public)
  '/about',
  '/portfolio',
  '/checklist',
  '/blog',
  '/pricing',
  '/services(.*)',
  '/contact',
  '/faqs',
  '/careers',
  '/legal/(.*)',
  '/help(.*)',
]

if (authBypassEnabled) {
  publicRoutes.push('/admin(.*)', '/team(.*)', '/dashboard(.*)')
}

const isPublicRoute = createRouteMatcher(publicRoutes)

// Staff-only routes
const isStaffRoute = createRouteMatcher([
  '/admin(.*)',
  '/team(.*)',
  '/api/admin/(.*)',
  '/api/team/(.*)',
])

// Agent routes
const isAgentRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/listings/(.*)',
  '/api/orders/(.*)',
])

// Helper function to extract subdomain from hostname
function getSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0]
  if (host === 'localhost' || host === '127.0.0.1') {
    return null
  }
  const parts = host.split('.')
  return parts.length >= 3 ? parts[0] : null
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api')
}

function apiUnauthorized(message: string, status: number = 401): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

function hasSupabaseSession(request: NextRequest): boolean {
  const cookies = request.cookies.getAll()
  return cookies.some(({ name }) => {
    if (name === 'supabase-auth-token') return true
    if (!name.startsWith('sb-')) return false
    return (
      name.endsWith('-auth-token') ||
      name.endsWith('-access-token') ||
      name.endsWith('-refresh-token')
    )
  })
}

// Helper to check static files
function isStaticFile(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  )
}

// Fallback middleware when Clerk is not configured
async function fallbackMiddleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname

  // Allow static files
  if (isStaticFile(pathname)) {
    return NextResponse.next()
  }

  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // Allow Supabase-authenticated sessions
  if (hasSupabaseSession(request)) {
    return NextResponse.next()
  }

  // If auth bypass is enabled, allow all routes
  if (authBypassEnabled) {
    return NextResponse.next()
  }

  // Block protected routes - redirect to sign-in
  if (isApiRoute(pathname)) {
    return apiUnauthorized('Unauthorized')
  }
  const signInUrl = new URL('/sign-in', request.url)
  signInUrl.searchParams.set('redirect_url', pathname)
  return NextResponse.redirect(signInUrl)
}

// Main middleware with Clerk
const clerkMiddlewareHandler = clerkMiddleware(async (auth, request: NextRequest) => {
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  const subdomain = getSubdomain(hostname)

  // Allow static files
  if (isStaticFile(pathname)) {
    return NextResponse.next()
  }

  // Public routes are always accessible
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // Allow Supabase-authenticated sessions to proceed without Clerk
  if (hasSupabaseSession(request)) {
    return NextResponse.next()
  }

  // Get auth info with error handling
  let userId: string | null = null
  let sessionClaims: Record<string, unknown> | null = null

  try {
    const authResult = await auth()
    userId = authResult.userId
    sessionClaims = authResult.sessionClaims as Record<string, unknown> | null
  } catch (error) {
    console.error('[Middleware] Clerk auth() error:', error)
    // On auth error, allow public routes and block protected
    if (authBypassEnabled) {
      return NextResponse.next()
    }
    if (isApiRoute(pathname)) {
      return apiUnauthorized('Unauthorized')
    }
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // If not authenticated and not on a public route, redirect to sign-in
  if (!userId) {
    // Determine appropriate sign-in page based on route
    if (isApiRoute(pathname)) {
      return apiUnauthorized('Unauthorized')
    }
    if (isStaffRoute(request) || subdomain === 'asm') {
      const signInUrl = new URL('/sign-in/staff', request.url)
      signInUrl.searchParams.set('redirect_url', pathname)
      return NextResponse.redirect(signInUrl)
    }

    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // User is authenticated - check role-based access
  // Type assertion for custom session claims with role metadata
  const publicMetadata = sessionClaims?.public_metadata as { role?: string } | undefined
  const userRole = publicMetadata?.role
  let userEmail = sessionClaims?.email as string | undefined

  // If email not in session claims, fetch from Clerk API (only for staff routes to minimize API calls)
  // Note: Skip API call if we've been rate limited recently to prevent redirect loops
  if (!userEmail && isStaffRoute(request)) {
    try {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      userEmail = user.emailAddresses?.[0]?.emailAddress
    } catch (error) {
      // Check if this is a rate limit error
      const errorObj = error as { status?: number; message?: string }
      if (errorObj.status === 429 || errorObj.message?.includes('Too many requests')) {
        console.warn('[Middleware] Clerk rate limited - allowing access without email verification')
        // On rate limit, assume aerialshots.media domain for staff routes to prevent redirect loops
        // The actual role check will happen in the page components
        userEmail = 'rate-limited@aerialshots.media'
      } else {
        console.error('[Middleware] Error fetching user email:', error)
      }
    }
  }

  // Staff routes require staff role
  if (isStaffRoute(request)) {
    const isStaff =
      userRole === 'admin' ||
      userRole === 'photographer' ||
      userRole === 'videographer' ||
      userRole === 'qc' ||
      userRole === 'partner' ||
      userRole === 'editor' ||
      userRole === 'va' ||
      userEmail?.toLowerCase().endsWith('@aerialshots.media')

    if (!isStaff) {
      // Redirect non-staff to agent dashboard
      if (isApiRoute(pathname)) {
        return apiUnauthorized('Staff access required', 403)
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Check specific role access for team routes
    // Partners can access all team routes if they have active_roles (validated in layout)
    const isPartnerUser = userRole === 'partner' || userEmail?.toLowerCase().endsWith('@aerialshots.media')

    // For partners, allow access to team routes - detailed role validation happens in team layout
    // which checks the partner's active_roles in the database
    if (!isPartnerUser) {
      if (pathname.startsWith('/team/photographer') && userRole !== 'photographer' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/team', request.url))
      }
      if (pathname.startsWith('/team/videographer') && userRole !== 'videographer' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/team', request.url))
      }
      // Editor routes - allow both 'editor' and 'va' (video assistant) roles
      if (pathname.startsWith('/team/editor') && userRole !== 'editor' && userRole !== 'va' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/team', request.url))
      }
      if (pathname.startsWith('/team/qc') && userRole !== 'qc' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/team', request.url))
      }
      // Note: /team/va routes no longer exist - va users are redirected to /team/editor
    }

    // Add pathname and user email headers for layout to use
    const response = NextResponse.next()
    response.headers.set('x-pathname', pathname)
    // Pass user email for rate-limit fallback in layouts
    if (userEmail && !userEmail.startsWith('rate-limited')) {
      response.headers.set('x-user-email', userEmail)
    }

    // For partner accessing team routes, continue with pathname header
    if (isPartnerUser && pathname.startsWith('/team/')) {
      return response
    }

    // Admin route access check
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      // Check if user is a partner (by role OR by allowed email domain)
      const isPartnerByRole = userRole === 'partner'
      const isPartnerByEmail = userEmail?.toLowerCase().endsWith('@aerialshots.media')
      const isPartner = isPartnerByRole || isPartnerByEmail

      // Allow partner access to /admin/team, /admin/settings, and /admin/help
      if (isPartner && (
        pathname.startsWith('/admin/team') ||
        pathname.startsWith('/admin/settings') ||
        pathname.startsWith('/admin/help')
      )) {
        return NextResponse.next()
      }

      // Non-partners/non-admins go to /team
      if (!isPartner) {
        return NextResponse.redirect(new URL('/team', request.url))
      }
    }
  }

  // Admin subdomain handling
  if (subdomain === 'asm') {
    // Force admin routes on admin subdomain
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
})

// Export the appropriate middleware based on Clerk configuration
export default clerkConfigured ? clerkMiddlewareHandler : fallbackMiddleware

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
