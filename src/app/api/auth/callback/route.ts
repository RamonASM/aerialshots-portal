import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

const STAFF_DOMAIN = '@aerialshots.media'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const requestedNext = searchParams.get('next')

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

  // Handle PKCE flow (OAuth callbacks)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authError = error
  }
  // Handle magic link flow
  else if (token && type === 'magiclink') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    })
    authError = error
  }
  // No valid auth params
  else {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  if (!authError) {
    // Get user and ensure agent record exists
    const { data: { user } } = await supabase.auth.getUser()

    if (user?.email) {
      const userEmail = user.email.toLowerCase()
      const isStaffEmail = userEmail.endsWith(STAFF_DOMAIN)

      // For staff members with @aerialshots.media domain
      if (isStaffEmail) {
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
        }

        // Redirect staff to admin (unless they requested a specific page)
        const redirectTo = requestedNext || '/admin'
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }

      // For regular users (clients/agents)
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
      }
    }

    // Redirect to requested page or dashboard
    const redirectTo = requestedNext || '/dashboard'
    return NextResponse.redirect(`${origin}${redirectTo}`)
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
