import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'
import { apiLogger, formatError } from '@/lib/logger'
import { syncAuthUserRecords } from '@/lib/auth/sync'

const logger = apiLogger.child({ route: 'auth/callback' })
const STAFF_DOMAIN = '@aerialshots.media'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const requestedNext = searchParams.get('next')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Debug logging
  logger.debug({
    code: code ? 'present' : 'missing',
    token: token ? 'present' : 'missing',
    type,
    error: errorParam,
  }, 'Auth callback received')

  // Handle error from Supabase
  if (errorParam) {
    logger.error({ error: errorParam, description: errorDescription }, 'Supabase auth error')
    return NextResponse.redirect(`${origin}/login?error=auth_failed&message=${encodeURIComponent(errorDescription || errorParam)}`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  let authError = null

  // Handle PKCE flow (OAuth callbacks with code)
  if (code) {
    logger.debug('Attempting PKCE code exchange')
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authError = error
    if (error) {
      logger.error({ ...formatError(error) }, 'PKCE exchange failed')
    } else {
      logger.debug('PKCE exchange successful')
    }
  }
  // Handle magic link flow with token_hash
  else if (token && type === 'magiclink') {
    logger.debug('Attempting magic link verification')
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    })
    authError = error
    if (error) {
      logger.error({ ...formatError(error) }, 'Magic link verification failed')
    } else {
      logger.debug('Magic link verification successful')
    }
  }
  // Handle email OTP flow
  else if (token && type === 'email') {
    logger.debug('Attempting email OTP verification')
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    })
    authError = error
    if (error) {
      logger.error({ ...formatError(error) }, 'Email OTP verification failed')
    } else {
      logger.debug('Email OTP verification successful')
    }
  }
  // Handle signup flow
  else if (token && type === 'signup') {
    logger.debug('Attempting signup verification')
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup',
    })
    authError = error
    if (error) {
      logger.error({ ...formatError(error) }, 'Signup verification failed')
    } else {
      logger.debug('Signup verification successful')
    }
  }
  // No valid auth params
  else {
    logger.error('No valid auth params found in callback')
    return NextResponse.redirect(`${origin}/login?error=auth_failed&message=no_auth_params`)
  }

  if (!authError) {
    // Get user and ensure agent record exists
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      logger.error({ ...formatError(userError) }, 'Failed to get user after auth')
      return NextResponse.redirect(`${origin}/login?error=auth_failed&message=user_fetch_failed`)
    }

    logger.info({ email: user?.email }, 'User authenticated')

    try {
      await syncAuthUserRecords(user)
    } catch (syncError) {
      logger.error({ ...formatError(syncError) }, 'Failed to sync auth user records')
    }

    if (user?.email) {
      const userEmail = user.email.toLowerCase()
      const isStaffEmail = userEmail.endsWith(STAFF_DOMAIN)

      // For staff members with @aerialshots.media domain
      if (isStaffEmail) {
        try {
          // Check if staff record exists
          const { data: existingStaff } = await supabase
            .from('staff')
            .select('id, is_active')
            .eq('email', userEmail)
            .single()

          // Auto-create staff record if it doesn't exist
          if (!existingStaff) {
            const name = user.user_metadata?.full_name ||
              userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

            await supabase.from('staff').insert({
              email: userEmail,
              name,
              role: 'photographer', // Default role for new staff
              is_active: true,
            })
            logger.info({ email: userEmail }, 'Created new staff record')
          }
        } catch (dbError) {
          logger.error({ ...formatError(dbError) }, 'Database error for staff')
          // Continue anyway - user is authenticated
        }

        // Redirect staff to admin (unless they requested a specific page)
        const redirectTo = requestedNext || '/admin'
        logger.debug({ redirectTo }, 'Redirecting staff')
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }

      // For regular users (clients/agents)
      try {
        // Check if agent exists
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('email', userEmail)
          .single()

        // Create agent record if it doesn't exist
        if (!agent) {
          const slug = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')

          await supabase.from('agents').insert({
            email: userEmail,
            name: user.user_metadata?.full_name || userEmail.split('@')[0],
            slug: `${slug}-${Date.now().toString(36)}`,
          })
          logger.info({ email: userEmail }, 'Created new agent record')
        }
      } catch (dbError) {
        logger.error({ ...formatError(dbError) }, 'Database error for agent')
        // Continue anyway - user is authenticated
      }
    }

    // Redirect to requested page or dashboard
    const redirectTo = requestedNext || '/dashboard'
    logger.debug({ redirectTo }, 'Redirecting user')
    return NextResponse.redirect(`${origin}${redirectTo}`)
  }

  // Return to login on error
  logger.error({ ...formatError(authError) }, 'Auth callback final error')
  return NextResponse.redirect(`${origin}/login?error=auth_failed&message=${encodeURIComponent(authError?.message || 'unknown')}`)
}
