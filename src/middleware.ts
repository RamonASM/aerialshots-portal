import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

// Helper function to extract subdomain from hostname
function getSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0] // Remove port

  // Handle localhost
  if (host === 'localhost' || host === '127.0.0.1') {
    return null // Treat as app subdomain
  }

  // Extract subdomain (asm.aerialshots.media -> "asm")
  const parts = host.split('.')
  return parts.length >= 3 ? parts[0] : null
}

// Handler for admin subdomain (asm.aerialshots.media)
async function handleAdminSubdomain(
  request: NextRequest,
  user: User | null,
  supabaseResponse: NextResponse
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname

  // Allow static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return supabaseResponse
  }

  // Allow staff login at /staff-login and /login
  if (pathname === '/staff-login' || pathname === '/login') {
    if (user?.email?.toLowerCase().endsWith('@aerialshots.media')) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return supabaseResponse
  }

  // Block non-admin routes - redirect to /admin
  if (!pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Require auth for admin routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/staff-login', request.url))
    }

    // Check staff email - redirect non-staff to app subdomain
    if (!user.email?.toLowerCase().endsWith('@aerialshots.media')) {
      return NextResponse.redirect(
        `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}/dashboard`
      )
    }
  }

  return supabaseResponse
}

// Handler for app subdomain (app.aerialshots.media or localhost)
function handleAppSubdomain(
  request: NextRequest,
  user: User | null,
  supabaseResponse: NextResponse
): NextResponse {
  const pathname = request.nextUrl.pathname

  // Allow static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return supabaseResponse
  }

  // Redirect admin routes to admin subdomain
  if (pathname.startsWith('/admin') || pathname === '/staff-login') {
    return NextResponse.redirect(
      `https://${process.env.NEXT_PUBLIC_ADMIN_DOMAIN}${pathname}`
    )
  }

  // Handle agent login
  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Require auth for dashboard
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get subdomain from hostname
  const hostname = request.headers.get('host') || ''
  const subdomain = getSubdomain(hostname)

  // Route based on subdomain
  if (subdomain === 'asm') {
    return handleAdminSubdomain(request, user, supabaseResponse)
  } else if (subdomain === 'app' || subdomain === null) {
    return handleAppSubdomain(request, user, supabaseResponse)
  }

  // Unknown subdomain or root domain -> redirect to marketing
  if (process.env.NEXT_PUBLIC_MARKETING_SITE) {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_MARKETING_SITE)
  }

  // Fallback if marketing site not configured
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (they handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
}
