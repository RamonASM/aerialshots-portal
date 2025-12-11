import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Get user and ensure agent record exists
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email) {
        // Check if agent exists
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('email', user.email)
          .single()

        // Create agent record if it doesn't exist
        if (!agent) {
          const slug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')

          await supabase.from('agents').insert({
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split('@')[0],
            slug: `${slug}-${Date.now().toString(36)}`,
          })
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
