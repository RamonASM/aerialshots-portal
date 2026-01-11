'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { Mail, Loader2, CheckCircle, AlertCircle, Camera, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

interface LoginFormData {
  email: string
}

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const errorParam = searchParams.get('error')

  const [sent, setSent] = useState(false)
  const [isProcessingAuth, setIsProcessingAuth] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === 'auth_failed' ? 'Authentication failed. Please try again.' : null
  )

  // Handle auth callback with tokens in URL fragment
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hash = window.location.hash

      // Check if we have tokens in the URL fragment
      if (hash && hash.includes('access_token')) {
        setIsProcessingAuth(true)
        console.log('Login: Found tokens in hash fragment')

        try {
          const supabase = createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )

          // Parse the hash
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            console.log('Login: Setting session...')
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (sessionError) {
              console.error('Login: Failed to set session:', sessionError)
              setError('Authentication failed. Please try again.')
              setIsProcessingAuth(false)
              return
            }

            // Get user to determine redirect
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
              console.error('Login: Failed to get user:', userError)
              setError('Authentication failed. Please try again.')
              setIsProcessingAuth(false)
              return
            }

            console.log('Login: Authenticated as', user.email)

            // Redirect based on email domain
            const isStaff = user.email?.toLowerCase().endsWith('@aerialshots.media')
            router.push(isStaff ? '/admin' : '/dashboard')
          }
        } catch (err) {
          console.error('Login: Auth callback error:', err)
          setError('Authentication failed. Please try again.')
          setIsProcessingAuth(false)
        }
      }
    }

    handleAuthCallback()
  }, [router])

  // Show loading state while processing auth
  if (isProcessingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <div className="fixed inset-0 bg-gradient-to-b from-[#0077ff]/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative w-full max-w-[420px] glass rounded-2xl p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#0077ff]" />
          <h1 className="mt-6 text-[22px] font-semibold text-white">Signing you in...</h1>
          <p className="mt-2 text-[15px] text-[#a1a1a6]">Please wait</p>
        </div>
      </div>
    )
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<LoginFormData>()

  const watchEmail = watch('email')

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)

      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email, portal: 'agent' }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send magic link')
      }

      setSent(true)
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send magic link. Please try again.')
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        {/* Subtle gradient */}
        <div className="fixed inset-0 bg-gradient-to-b from-[#0077ff]/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative w-full max-w-[420px] glass rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-7 w-7 text-green-400" />
          </div>
          <h1 className="mt-6 text-[22px] font-semibold text-white">Check your email</h1>
          <p className="mt-2 text-[15px] text-[#a1a1a6]">
            We sent a magic link to <span className="text-white font-medium">{watchEmail}</span>
          </p>
          <p className="mt-4 text-[13px] text-[#636366]">
            Click the link in your email to sign in. The link expires in 1 hour.
          </p>
          <div className="mt-6 rounded-xl bg-[#0077ff]/10 border border-[#0077ff]/20 p-4 text-[13px] text-[#3395ff]">
            <strong className="text-[#0077ff]">Tip:</strong> Check your spam folder if you don&apos;t see our email.
          </div>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => setSent(false)}
          >
            Try a different email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      {/* Subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0077ff]/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-[420px]">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] text-[#636366] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Main card */}
        <div className="glass rounded-2xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="h-9 w-9 rounded-xl bg-[#0077ff] flex items-center justify-center">
              <Camera className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-[17px] font-semibold text-white">
              Agent Portal
            </span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-[22px] font-semibold text-white">Welcome back</h1>
            <p className="mt-2 text-[15px] text-[#a1a1a6]">
              Sign in to access your media and listings
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-[13px] text-[#a1a1a6]">
                Email address
              </Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#636366]" />
                <Input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  placeholder="you@example.com"
                  className="pl-11"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-[13px] text-[#ff453a]">{errors.email.message}</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-[#ff453a]/10 border border-[#ff453a]/20 p-3 text-[13px] text-[#ff453a]">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                'Continue with email'
              )}
            </Button>

            <p className="text-center text-[13px] text-[#636366]">
              We&apos;ll send you a magic link — no password needed.
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[13px] text-[#636366]">
            Don&apos;t have an account?{' '}
            <a
              href="https://www.aerialshots.media"
              className="text-[#0077ff] hover:text-[#3395ff] transition-colors"
            >
              Book your first shoot
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

function LoginFormFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="fixed inset-0 bg-gradient-to-b from-[#0077ff]/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative w-full max-w-[420px] glass rounded-2xl p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#636366]" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  )
}
