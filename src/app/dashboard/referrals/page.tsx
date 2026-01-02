'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Star,
  TrendingUp,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
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

  const shareMessage = "Book professional real estate photography with Aerial Shots Media and save 10% on your first order! Use my referral link:"

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent("Get 10% Off Your First Shoot")
    const body = encodeURIComponent(`${shareMessage}\n\n${referralLink}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const shareViaSMS = () => {
    const text = encodeURIComponent(`${shareMessage} ${referralLink}`)
    window.open(`sms:?body=${text}`)
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`${shareMessage} ${referralLink}`)
    window.open(`https://wa.me/?text=${text}`)
  }

  const shareNative = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Get 10% Off Your First Shoot',
        text: shareMessage,
        url: referralLink,
      })
    } else {
      copyLink()
    }
  }

  const completedReferrals = referrals.filter((r) => r.status === 'credited')
  const pendingReferrals = referrals.filter((r) => r.status !== 'credited')

  // Tier calculation
  const getTier = (lifetimeCredits: number) => {
    if (lifetimeCredits >= 2000) return { name: 'Platinum', color: 'bg-purple-500', next: null, required: 2000 }
    if (lifetimeCredits >= 1000) return { name: 'Gold', color: 'bg-amber-500', next: 'Platinum', required: 2000 }
    if (lifetimeCredits >= 500) return { name: 'Silver', color: 'bg-[#636366]', next: 'Gold', required: 1000 }
    return { name: 'Bronze', color: 'bg-orange-700', next: 'Silver', required: 500 }
  }

  const lifetimeCredits = agent?.lifetime_credits || 0
  const tier = getTier(lifetimeCredits)
  const progressToNext = tier.next ? Math.min(100, (lifetimeCredits / tier.required) * 100) : 100
  const creditsToNext = tier.next ? tier.required - lifetimeCredits : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#636366]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold text-white">Referral Program</h1>
        <p className="mt-1 text-[#a1a1a6]">
          Earn credits by referring new clients to Aerial Shots Media.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            <span className="text-[13px] text-[#636366]">Available Credits</span>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-white">
            {agent?.credit_balance ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-[13px] text-[#636366]">Lifetime Earned</span>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-white">
            {lifetimeCredits}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#0077ff]" />
            <span className="text-[13px] text-[#636366]">Total Referrals</span>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-white">{referrals.length}</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${tier.color}`} />
            <span className="text-[13px] text-[#636366]">Your Tier</span>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-white">{tier.name}</p>
          {tier.next && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full ${tier.color} transition-all`}
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[#636366]">
                {creditsToNext} credits to {tier.next}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Referral Link & Sharing */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <h2 className="font-semibold text-white">Your Referral Link</h2>
        <p className="mt-1 text-[13px] text-[#636366]">
          Share this link with other agents. They get 10% off their first shoot, and you earn credits when they book!
        </p>

        <div className="mt-4 flex gap-2">
          <div className="flex-1 overflow-x-auto rounded-xl bg-[#0a0a0a] border border-white/[0.08] px-4 py-3 font-mono text-[13px] text-[#a1a1a6]">
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
        </div>

        {/* Share Buttons */}
        <div className="mt-4">
          <p className="text-[13px] text-[#636366] mb-3">Share via:</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={shareViaEmail}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button variant="outline" size="sm" onClick={shareViaSMS}>
              <MessageSquare className="mr-2 h-4 w-4" />
              SMS
            </Button>
            <Button variant="outline" size="sm" onClick={shareViaWhatsApp}>
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={shareNative}>
              <Share2 className="mr-2 h-4 w-4" />
              More
            </Button>
          </div>
        </div>

        {/* Credit Earning Table */}
        <div className="mt-6 overflow-x-auto">
          <h3 className="mb-2 text-[13px] font-medium text-[#a1a1a6]">How Credits Work</h3>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="py-2 text-left font-medium text-[#636366]">Referral Type</th>
                <th className="py-2 text-right font-medium text-[#636366]">Credits Earned</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.08]">
                <td className="py-2 text-[#a1a1a6]">Photo Package Referral</td>
                <td className="py-2 text-right font-medium text-green-400">+100</td>
              </tr>
              <tr className="border-b border-white/[0.08]">
                <td className="py-2 text-[#a1a1a6]">Video Package Referral</td>
                <td className="py-2 text-right font-medium text-green-400">+200</td>
              </tr>
              <tr className="border-b border-white/[0.08]">
                <td className="py-2 text-[#a1a1a6]">Premium Package Referral</td>
                <td className="py-2 text-right font-medium text-green-400">+300</td>
              </tr>
              <tr className="border-b border-white/[0.08]">
                <td className="py-2 text-[#a1a1a6]">5 Referrals Milestone</td>
                <td className="py-2 text-right font-medium text-purple-400">+100 Bonus</td>
              </tr>
              <tr>
                <td className="py-2 text-[#a1a1a6]">10 Referrals Milestone</td>
                <td className="py-2 text-right font-medium text-purple-400">+250 Bonus</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Referral History */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <h2 className="font-semibold text-white">Referral History</h2>

        {referrals.length > 0 ? (
          <div className="mt-4 space-y-3">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between rounded-xl bg-[#0a0a0a] border border-white/[0.08] p-4"
              >
                <div>
                  <p className="font-medium text-white">
                    {referral.referred_email}
                  </p>
                  <p className="text-[13px] text-[#636366]">
                    {referral.order_type
                      ? `${referral.order_type} package`
                      : 'Signed up'}
                    {' - '}
                    {referral.created_at ? new Date(referral.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full border px-2 py-1 text-[11px] font-medium ${
                      referral.status === 'credited'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : referral.status === 'signed_up'
                          ? 'bg-[#0077ff]/20 text-[#3395ff] border-[#0077ff]/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {referral.status?.replace('_', ' ').toUpperCase()}
                  </span>
                  {referral.credits_awarded && referral.credits_awarded > 0 && (
                    <p className="mt-1 text-[13px] font-medium text-green-400">
                      +{referral.credits_awarded} credits
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center">
            <Gift className="mx-auto h-12 w-12 text-[#636366]" />
            <p className="mt-4 text-[#a1a1a6]">No referrals yet</p>
            <p className="mt-1 text-[13px] text-[#636366]">
              Share your link to start earning credits!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
