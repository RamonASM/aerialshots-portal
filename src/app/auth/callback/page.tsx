'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

const STAFF_DOMAIN = '@aerialshots.media'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Processing authentication...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Get the hash fragment (tokens are here for implicit flow)
        const hash = window.location.hash
        const searchParams = new URLSearchParams(window.location.search)

        console.log('Auth callback page loaded:', {
          hash: hash ? 'present' : 'missing',
          hashLength: hash?.length,
          search: window.location.search,
          pathname: window.location.pathname,
        })

        // Create Supabase client
        const supabase = createBrowserClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        let authenticated = false

        // If there's a hash with tokens, handle implicit flow
        if (hash && hash.includes('access_token')) {
          setStatus('Verifying tokens...')
          console.log('Found tokens in hash fragment')

          // Parse the hash
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            console.log('Setting session with tokens...')
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (sessionError) {
              console.error('Failed to set session:', sessionError)
              throw sessionError
            }

            authenticated = true
            setStatus('Session established...')
            console.log('Session set successfully')
          }
        }

        // Check if we have a code parameter (PKCE flow)
        const code = searchParams.get('code')
        if (code && !authenticated) {
          setStatus('Exchanging code for session...')
          console.log('Found code parameter, exchanging...')
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
          if (codeError) {
            console.error('Code exchange failed:', codeError)
            throw codeError
          }
          authenticated = true
        }

        // Check for token_hash (magic link flow)
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        if (tokenHash && !authenticated) {
          setStatus('Verifying magic link...')
          console.log('Found token_hash, verifying...')
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type as 'magiclink' | 'email' | 'signup') || 'magiclink',
          })
          if (otpError) {
            console.error('OTP verification failed:', otpError)
            throw otpError
          }
          authenticated = true
        }

        if (!authenticated) {
          // Check if user is already logged in
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.log('User already has session')
            authenticated = true
          } else {
            throw new Error('No authentication method found')
          }
        }

        // Now get the user
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error('Failed to get user:', userError)
          throw userError || new Error('No user found')
        }

        setStatus('Welcome back!')
        console.log('User authenticated:', user.email)

        // Determine redirect based on email domain
        const userEmail = user.email?.toLowerCase() || ''
        const isStaff = userEmail.endsWith(STAFF_DOMAIN)
        const next = searchParams.get('next')

        // Small delay to show success message
        await new Promise(resolve => setTimeout(resolve, 500))

        if (isStaff) {
          console.log('Staff user, redirecting to:', next || '/admin')
          router.push(next || '/admin')
        } else {
          console.log('Regular user, redirecting to:', next || '/dashboard')
          router.push(next || '/dashboard')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')

        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/login?error=auth_failed')
        }, 2000)
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="fixed inset-0 bg-gradient-to-b from-[#0077ff]/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-[420px] glass rounded-2xl p-8 text-center">
        {error ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <svg className="h-7 w-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mt-6 text-[22px] font-semibold text-white">Authentication Failed</h1>
            <p className="mt-2 text-[15px] text-[#a1a1a6]">{error}</p>
            <p className="mt-4 text-[13px] text-[#636366]">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#0077ff]" />
            <h1 className="mt-6 text-[22px] font-semibold text-white">{status}</h1>
            <p className="mt-2 text-[15px] text-[#a1a1a6]">Please wait...</p>
          </>
        )}
      </div>
    </div>
  )
}
