'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Loader2, XCircle } from 'lucide-react'

interface ConnectAccountStatus {
  hasAccount: boolean
  staff?: {
    id: string
    name: string
    email: string
    payoutType: string
    payoutPercent: number
  }
  partner?: {
    id: string
    name: string
    email: string
    profitPercent: number
    payoutSchedule: string
  }
  connect?: {
    accountId: string
    status: string
    payoutsEnabled: boolean
    chargesEnabled: boolean
    detailsSubmitted: boolean
    requirements: {
      currentlyDue: string[]
      eventuallyDue: string[]
      pastDue: string[]
      pendingVerification: string[]
    }
    dashboardUrl: string | null
  }
}

interface StripeConnectOnboardingProps {
  type: 'staff' | 'partner'
}

const statusConfig = {
  not_started: {
    label: 'Not Started',
    color: 'bg-zinc-500',
    icon: Clock,
  },
  pending: {
    label: 'Pending Verification',
    color: 'bg-yellow-500',
    icon: Clock,
  },
  active: {
    label: 'Active',
    color: 'bg-green-500',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-500',
    icon: XCircle,
  },
  restricted: {
    label: 'Restricted',
    color: 'bg-orange-500',
    icon: AlertCircle,
  },
}

export function StripeConnectOnboarding({ type }: StripeConnectOnboardingProps) {
  const [status, setStatus] = useState<ConnectAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const endpoint = type === 'staff'
        ? '/api/connect/staff/account'
        : '/api/connect/partner/account'

      const response = await fetch(endpoint)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch account status')
      }

      const data = await response.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [type])

  const handleCreateAccount = async () => {
    try {
      setCreating(true)
      setError(null)

      const endpoint = type === 'staff'
        ? '/api/connect/staff/account'
        : '/api/connect/partner/account'

      const response = await fetch(endpoint, { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Redirect to Stripe onboarding
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setCreating(false)
    }
  }

  const handleContinueOnboarding = async () => {
    try {
      setCreating(true)
      setError(null)

      const response = await fetch('/api/connect/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate onboarding link')
      }

      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue onboarding')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-500/20 bg-[#1c1c1e]">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStatus} className="ml-auto">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const entity = type === 'staff' ? status?.staff : status?.partner
  const connect = status?.connect
  const statusInfo = connect?.status ? statusConfig[connect.status as keyof typeof statusConfig] : null
  const StatusIcon = statusInfo?.icon || Clock

  return (
    <Card className="border-white/[0.08] bg-[#1c1c1e]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Stripe Connect
          {statusInfo && (
            <Badge className={`${statusInfo.color} text-white`}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusInfo.label}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {type === 'staff'
            ? 'Connect your bank account to receive instant payouts for completed jobs.'
            : 'Connect your bank account to receive automatic profit share from your team\'s jobs.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Account Info */}
        {entity && (
          <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Name</span>
                <span className="text-white">{entity.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Email</span>
                <span className="text-white">{entity.email}</span>
              </div>
              {type === 'staff' && 'payoutPercent' in entity && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Payout Rate</span>
                  <span className="text-white">{entity.payoutPercent}%</span>
                </div>
              )}
              {type === 'partner' && 'profitPercent' in entity && (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Profit Share</span>
                    <span className="text-white">{entity.profitPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Payout Schedule</span>
                    <span className="text-white capitalize">{entity.payoutSchedule}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* No Account Yet */}
        {!status?.hasAccount && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <h4 className="font-medium text-blue-400">Get Started with Stripe Connect</h4>
              <p className="mt-1 text-sm text-zinc-400">
                Connect your bank account to receive automatic payouts when jobs are completed and approved.
                Setup takes about 5 minutes.
              </p>
            </div>

            <Button
              onClick={handleCreateAccount}
              disabled={creating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Connect with Stripe
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Account Exists - Show Status */}
        {status?.hasAccount && connect && (
          <div className="space-y-4">
            {/* Requirements Warning */}
            {(connect.requirements.currentlyDue.length > 0 ||
              connect.requirements.pastDue.length > 0) && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                <h4 className="font-medium text-yellow-400">Action Required</h4>
                <p className="mt-1 text-sm text-zinc-400">
                  Stripe needs additional information to enable payouts.
                </p>
                {connect.requirements.pastDue.length > 0 && (
                  <p className="mt-2 text-sm text-red-400">
                    {connect.requirements.pastDue.length} item(s) past due
                  </p>
                )}
                <Button
                  onClick={handleContinueOnboarding}
                  disabled={creating}
                  variant="outline"
                  className="mt-3"
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  Complete Setup
                </Button>
              </div>
            )}

            {/* Active Account */}
            {connect.payoutsEnabled && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <h4 className="font-medium text-green-400">Payouts Enabled</h4>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  Your account is fully set up. You'll receive payouts automatically when jobs are approved.
                </p>

                {connect.dashboardUrl && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => window.open(connect.dashboardUrl!, '_blank')}
                  >
                    View Stripe Dashboard
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Pending Verification */}
            {connect.detailsSubmitted &&
             !connect.payoutsEnabled &&
             connect.requirements.currentlyDue.length === 0 && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <h4 className="font-medium text-blue-400">Verification in Progress</h4>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  Stripe is verifying your information. This usually takes 1-2 business days.
                </p>
                {connect.requirements.pendingVerification.length > 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {connect.requirements.pendingVerification.length} item(s) being verified
                  </p>
                )}
              </div>
            )}

            {/* Rejected/Restricted */}
            {(connect.status === 'rejected' || connect.status === 'restricted') && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <h4 className="font-medium text-red-400">
                    {connect.status === 'rejected' ? 'Account Rejected' : 'Account Restricted'}
                  </h4>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  {connect.status === 'rejected'
                    ? 'Your account application was rejected by Stripe. Please contact support.'
                    : 'Your account has restrictions. Please complete any pending requirements.'}
                </p>
                <Button
                  onClick={handleContinueOnboarding}
                  disabled={creating}
                  variant="outline"
                  className="mt-3"
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  Update Information
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
