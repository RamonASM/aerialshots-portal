'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Database } from '@/lib/supabase/types'

interface LoginFormData {
  email: string
}

function LoginForm() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === 'auth_failed' ? 'Authentication failed. Please try again.' : null
  )

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

      const supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (authError) {
        throw authError
      }

      setSent(true)
    } catch (err) {
      console.error('Login error:', err)
      setError('Failed to send magic link. Please try again.')
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-neutral-900">Check your email</h1>
          <p className="mt-2 text-neutral-600">
            We sent a magic link to <strong>{watchEmail}</strong>
          </p>
          <p className="mt-4 text-sm text-neutral-500">
            Click the link in your email to sign in. The link expires in 1 hour.
          </p>
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            <strong>Tip:</strong> Check your spam folder if you don&apos;t see our email.
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
          <p className="mt-2 text-neutral-600">
            Sign in to your Aerial Shots Media portal
          </p>
        </div>

        {/* Aryeo Hint */}
        <div className="mt-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Already use Aryeo?</p>
            <p className="mt-1 text-blue-700">
              Use the same email address you use with Aryeo to automatically link your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <div>
            <Label htmlFor="email">Email address</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
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
                className="pl-10"
                autoComplete="email"
                autoFocus
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#ff4533] hover:bg-[#e63d2e]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              'Send magic link'
            )}
          </Button>

          <p className="text-center text-xs text-neutral-500">
            We&apos;ll send you a magic link to sign in - no password needed.
          </p>
        </form>

        <div className="mt-8 border-t border-neutral-200 pt-6">
          <p className="text-center text-sm text-neutral-500">
            Don&apos;t have an account?{' '}
            <a href="https://www.aerialshots.media" className="text-[#ff4533] hover:underline">
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
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
