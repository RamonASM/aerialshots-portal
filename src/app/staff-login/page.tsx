'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Mail, Loader2, CheckCircle, AlertCircle, Shield, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginFormData {
  email: string
}

function StaffLoginForm() {
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

      // Validate email domain before sending
      if (!data.email.toLowerCase().endsWith('@aerialshots.media')) {
        setError('Access restricted to @aerialshots.media accounts only.')
        return
      }

      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: data.email,
          redirectTo: '/admin'
        }),
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
        <div className="relative w-full max-w-[400px] rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-7 w-7 text-green-400" />
          </div>
          <h1 className="mt-6 text-[20px] font-semibold text-white">Check your email</h1>
          <p className="mt-2 text-[14px] text-[#a1a1a6]">
            Magic link sent to <span className="text-white font-medium">{watchEmail}</span>
          </p>
          <p className="mt-4 text-[13px] text-[#636366]">
            Click the link in your email to access the admin panel. Link expires in 1 hour.
          </p>
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
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="relative w-full max-w-[400px]">
        {/* Main card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-8">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[17px] font-semibold text-white block">
                asm.aerialshots.media
              </span>
              <span className="text-[11px] text-[#636366] uppercase tracking-wider">
                Team Login
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-[20px] font-semibold text-white">ASM Team Portal</h1>
            <p className="mt-2 text-[14px] text-[#636366]">
              Access restricted to @aerialshots.media accounts
            </p>
          </div>

          {/* Security notice */}
          <div className="flex items-center gap-3 rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 mb-6">
            <Lock className="h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="text-[12px] text-[#a1a1a6]">
              This is a protected area. Unauthorized access attempts are logged.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-[13px] text-[#a1a1a6]">
                Work email
              </Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#636366]" />
                <Input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@aerialshots\.media$/i,
                      message: 'Must be an @aerialshots.media email',
                    },
                  })}
                  placeholder="you@aerialshots.media"
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
              className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                'Continue'
              )}
            </Button>

            <p className="text-center text-[12px] text-[#636366]">
              Passwordless authentication via magic link
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[12px] text-[#48484a]">
            asm.aerialshots.media
          </p>
        </div>
      </div>
    </div>
  )
}

function StaffLoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="relative w-full max-w-[400px] rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#636366]" />
        </div>
      </div>
    </div>
  )
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<StaffLoginFallback />}>
      <StaffLoginForm />
    </Suspense>
  )
}
