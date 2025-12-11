'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Gift,
  Copy,
  Check,
  Share2,
  QrCode,
  Users,
  Star,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type Agent = Database['public']['Tables']['agents']['Row']
type Referral = Database['public']['Tables']['referrals']['Row']

export default function ReferralsPage() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .single()

      if (agentData) {
        setAgent(agentData)

        // Load referrals
        const { data: referralsData } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', agentData.id)
          .order('created_at', { ascending: false })

        if (referralsData) setReferrals(referralsData)
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

  const referralLink = agent
    ? `${window.location.origin}/ref/${agent.referral_code || agent.id.slice(0, 8)}`
    : ''

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Get 10% Off Your First Shoot',
        text: 'Book professional real estate photography with Aerial Shots Media and save 10% on your first order!',
        url: referralLink,
      })
    } else {
      copyLink()
    }
  }

  const completedReferrals = referrals.filter((r) => r.status === 'credited')
  const pendingReferrals = referrals.filter((r) => r.status !== 'credited')
  const totalCreditsEarned = completedReferrals.reduce(
    (sum, r) => sum + (r.credits_awarded || 0),
    0
  )

  // Tier calculation
  const getTier = (lifetimeCredits: number) => {
    if (lifetimeCredits >= 2000) return { name: 'Platinum', color: 'bg-purple-500' }
    if (lifetimeCredits >= 1000) return { name: 'Gold', color: 'bg-amber-500' }
    if (lifetimeCredits >= 500) return { name: 'Silver', color: 'bg-neutral-400' }
    return { name: 'Bronze', color: 'bg-orange-700' }
  }

  const tier = getTier(agent?.lifetime_credits || 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Referral Program</h1>
        <p className="mt-1 text-neutral-600">
          Earn credits by referring new clients to Aerial Shots Media.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-neutral-600">Available Credits</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-neutral-900">
            {agent?.credit_balance ?? 0}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-sm text-neutral-600">Lifetime Earned</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-neutral-900">
            {agent?.lifetime_credits ?? 0}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-neutral-600">Total Referrals</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{referrals.length}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${tier.color}`} />
            <span className="text-sm text-neutral-600">Your Tier</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{tier.name}</p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold text-neutral-900">Your Referral Link</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Share this link with other agents. They get 10% off their first shoot, and you earn credits when they book!
        </p>

        <div className="mt-4 flex gap-2">
          <div className="flex-1 overflow-x-auto rounded-lg bg-neutral-100 px-4 py-3 font-mono text-sm">
            {referralLink}
          </div>
          <Button variant="outline" onClick={copyLink}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          <Button variant="outline" onClick={shareLink}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Credit Earning Table */}
        <div className="mt-6 overflow-x-auto">
          <h3 className="mb-2 text-sm font-medium text-neutral-700">How Credits Work</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="py-2 text-left font-medium text-neutral-600">Referral Type</th>
                <th className="py-2 text-right font-medium text-neutral-600">Credits Earned</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-100">
                <td className="py-2">Photo Package Referral</td>
                <td className="py-2 text-right font-medium text-green-600">+100</td>
              </tr>
              <tr className="border-b border-neutral-100">
                <td className="py-2">Video Package Referral</td>
                <td className="py-2 text-right font-medium text-green-600">+200</td>
              </tr>
              <tr className="border-b border-neutral-100">
                <td className="py-2">Premium Package Referral</td>
                <td className="py-2 text-right font-medium text-green-600">+300</td>
              </tr>
              <tr className="border-b border-neutral-100">
                <td className="py-2">5 Referrals Milestone</td>
                <td className="py-2 text-right font-medium text-purple-600">+100 Bonus</td>
              </tr>
              <tr>
                <td className="py-2">10 Referrals Milestone</td>
                <td className="py-2 text-right font-medium text-purple-600">+250 Bonus</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Referral History */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold text-neutral-900">Referral History</h2>

        {referrals.length > 0 ? (
          <div className="mt-4 space-y-3">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between rounded-lg bg-neutral-50 p-4"
              >
                <div>
                  <p className="font-medium text-neutral-900">
                    {referral.referred_email}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {referral.order_type
                      ? `${referral.order_type} package`
                      : 'Signed up'}
                    {' - '}
                    {new Date(referral.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                      referral.status === 'credited'
                        ? 'bg-green-100 text-green-700'
                        : referral.status === 'signed_up'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {referral.status?.replace('_', ' ').toUpperCase()}
                  </span>
                  {referral.credits_awarded > 0 && (
                    <p className="mt-1 text-sm font-medium text-green-600">
                      +{referral.credits_awarded} credits
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center">
            <Gift className="mx-auto h-12 w-12 text-neutral-300" />
            <p className="mt-4 text-neutral-600">No referrals yet</p>
            <p className="mt-1 text-sm text-neutral-500">
              Share your link to start earning credits!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
