'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Clock,
  XCircle,
} from 'lucide-react'

interface ConnectAccountResponse {
  hasAccount: boolean
  staff: {
    id: string
    name: string
    email: string
    payoutType: string | null
    payoutPercent: number | null
  }
  connect?: {
    accountId: string
    status: string
    payoutsEnabled: boolean
    chargesEnabled?: boolean
    detailsSubmitted?: boolean
    dashboardUrl?: string | null
  }
}

interface StripeConnectCardProps {
  staffId: string
  onSetup?: (accountId: string) => void
}

export function StripeConnectCard({ staffId, onSetup }: StripeConnectCardProps) {
  const [data, setData] = useState<ConnectAccountResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const fetchAccountStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/connect/staff/account')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load account status')
      }

      const accountData = await response.json()
      setData(accountData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccountStatus()
  }, [fetchAccountStatus])

  const handleSetupPayouts = async () => {
    try {
      setProcessing(true)
      setError(null)

      const response = await fetch('/api/connect/staff/account', {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      if (result.success && result.onboardingUrl) {
        onSetup?.(result.accountId)
        // Redirect to Stripe onboarding
        window.location.href = result.onboardingUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up payouts')
    } finally {
      setProcessing(false)
    }
  }

  const handleContinueOnboarding = async () => {
    try {
      setProcessing(true)
      setError(null)

      const response = await fetch('/api/connect/onboarding', {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate onboarding link')
      }

      if (result.success && result.onboardingUrl) {
        window.location.href = result.onboardingUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue setup')
    } finally {
      setProcessing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" role="status" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CreditCard className="h-5 w-5" />
            Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <Button
            onClick={fetchAccountStatus}
            variant="outline"
            className="mt-4 border-white/[0.08]"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { staff, connect, hasAccount } = data
  const isW2 = staff.payoutType === 'w2'
  const isEligible = staff.payoutType === '1099'
  const isActive = connect?.status === 'active' && connect?.payoutsEnabled
  const isPending = hasAccount && !isActive

  return (
    <Card className="border-white/[0.08] bg-[#1c1c1e]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <CreditCard className="h-5 w-5" />
          Payouts
          {isActive && (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Payouts Active
            </Badge>
          )}
          {isPending && (
            <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
              <Clock className="mr-1 h-3 w-3" />
              Pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          {isActive
            ? 'Your payout account is connected and ready'
            : 'Connect your bank account to receive payouts'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payout percentage info */}
        {staff.payoutPercent && (
          <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
            <p className="text-sm text-zinc-500">Your Payout Rate</p>
            <p className="mt-1 text-2xl font-bold text-white">{staff.payoutPercent}%</p>
            <p className="text-xs text-zinc-500">of job revenue</p>
          </div>
        )}

        {/* W2 Employee message */}
        {isW2 && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-blue-400">
              W2 employees receive payouts through regular payroll.
              Contact admin if you have questions about your pay.
            </p>
          </div>
        )}

        {/* No account yet - show setup button */}
        {!hasAccount && isEligible && (
          <Button
            onClick={handleSetupPayouts}
            disabled={processing}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {processing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-5 w-5" />
            )}
            Set Up Payouts
          </Button>
        )}

        {/* Account exists but not complete */}
        {isPending && (
          <div className="space-y-3">
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="text-sm text-yellow-400">
                Complete your Stripe account setup to start receiving payouts.
              </p>
            </div>
            <Button
              onClick={handleContinueOnboarding}
              disabled={processing}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              size="lg"
            >
              {processing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-5 w-5" />
              )}
              Complete Setup
            </Button>
          </div>
        )}

        {/* Account is active */}
        {isActive && connect?.dashboardUrl && (
          <a
            href={connect.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-black/20 p-4 text-white transition-colors hover:bg-white/5"
          >
            <ExternalLink className="h-4 w-4" />
            Open Stripe Dashboard
          </a>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <XCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
