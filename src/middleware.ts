import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
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
  // TEMPORARY: Admin/team routes public for testing (REMOVE AFTER TESTING)
  '/admin(.*)',
  '/team(.*)',
  '/dashboard(.*)',
])

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

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { userId, sessionClaims } = await auth()
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  const subdomain = getSubdomain(hostname)

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next()
  }

  // Public routes are always accessible
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // Allow Supabase-authenticated sessions to proceed without Clerk
  if (!userId && hasSupabaseSession(request)) {
    return NextResponse.next()
  }

  // If not authenticated and not on a public route, redirect to sign-in
  if (!userId) {
    // Determine appropriate sign-in page based on route
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
  const userEmail = sessionClaims?.email as string | undefined

  // Staff routes require staff role
  if (isStaffRoute(request)) {
    const isStaff =
      userRole === 'admin' ||
      userRole === 'photographer' ||
      userRole === 'videographer' ||
      userRole === 'qc' ||
      userRole === 'partner' ||
      userEmail?.toLowerCase().endsWith('@aerialshots.media')

    if (!isStaff) {
      // Redirect non-staff to agent dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Check specific role access
    if (pathname.startsWith('/team/photographer') && userRole !== 'photographer' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/team', request.url))
    }
    if (pathname.startsWith('/team/videographer') && userRole !== 'videographer' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/team', request.url))
    }
    if (pathname.startsWith('/team/qc') && userRole !== 'qc' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/team', request.url))
    }

    // Admin route access check
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      // Check if user is a partner (by role OR by allowed email domain)
      const isPartnerByRole = userRole === 'partner'
      const isPartnerByEmail = userEmail?.toLowerCase().endsWith('@aerialshots.media')
      const isPartner = isPartnerByRole || isPartnerByEmail

      // Allow partner access to /admin/team
      if (isPartner && pathname.startsWith('/admin/team')) {
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

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
