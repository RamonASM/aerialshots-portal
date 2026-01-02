'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Star,
  Sparkles,
  FileText,
  MessageSquare,
  Home,
  Users,
  Video,
  Tag,
  Camera,
  Loader2,
  CheckCircle,
  ExternalLink,
  TrendingUp,
  Award,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

// Credit packages available for purchase
const CREDIT_PACKAGES = [
  { id: 'starter', credits: 100, price: 25, popular: false },
  { id: 'standard', credits: 250, price: 50, popular: true, savings: '20%' },
  { id: 'professional', credits: 500, price: 85, popular: false, savings: '32%' },
  { id: 'enterprise', credits: 1000, price: 150, popular: false, savings: '40%' },
] as const

interface CreditTransaction {
  id: string
  amount: number
  type: string
  description: string
  created_at: string
  balance_after: number
}

type Agent = Database['public']['Tables']['agents']['Row']

// Tier calculation (matching referrals page)
const getTier = (lifetimeCredits: number) => {
  if (lifetimeCredits >= 2000) return { name: 'Platinum', color: 'bg-purple-500', textColor: 'text-purple-400', next: null, required: 2000 }
  if (lifetimeCredits >= 1000) return { name: 'Gold', color: 'bg-amber-500', textColor: 'text-amber-400', next: 'Platinum', required: 2000 }
  if (lifetimeCredits >= 500) return { name: 'Silver', color: 'bg-[#636366]', textColor: 'text-[#a1a1a6]', next: 'Gold', required: 1000 }
  return { name: 'Bronze', color: 'bg-orange-700', textColor: 'text-orange-400', next: 'Silver', required: 500 }
}

interface Reward {
  id: string
  name: string
  description: string
  credits: number
  icon: any
  tier: 'ai' | 'discount' | 'premium'
  available: boolean
}

const rewards: Reward[] = [
  // AI Tools (Zero marginal cost)
  {
    id: 'listing_description',
    name: 'Listing Description Generator',
    description: '3 MLS-ready property descriptions',
    credits: 25,
    icon: FileText,
    tier: 'ai',
    available: true,
  },
  {
    id: 'social_captions',
    name: 'Social Media Caption Pack',
    description: '5 ready-to-post captions with hashtags',
    credits: 20,
    icon: MessageSquare,
    tier: 'ai',
    available: true,
  },
  {
    id: 'property_highlights',
    name: 'Property Feature Highlights',
    description: 'Marketing bullet points for any property',
    credits: 15,
    icon: Star,
    tier: 'ai',
    available: true,
  },
  {
    id: 'neighborhood_guide',
    name: 'Neighborhood Guide Generator',
    description: 'Local expertise content for your area',
    credits: 30,
    icon: Home,
    tier: 'ai',
    available: true,
  },
  {
    id: 'buyer_personas',
    name: 'Buyer Persona Analysis',
    description: '3 target buyer profiles with motivations',
    credits: 35,
    icon: Users,
    tier: 'ai',
    available: true,
  },
  {
    id: 'video_script',
    name: 'Video Script Generator',
    description: 'Walkthrough narration script',
    credits: 40,
    icon: Video,
    tier: 'ai',
    available: true,
  },
  // Service Discounts
  {
    id: 'discount_10_percent',
    name: '10% Off Next Shoot',
    description: 'Apply to any service package',
    credits: 150,
    icon: Tag,
    tier: 'discount',
    available: true,
  },
  {
    id: 'discount_25_dollars',
    name: '$25 Off Any Service',
    description: 'One-time discount code',
    credits: 200,
    icon: Tag,
    tier: 'discount',
    available: true,
  },
  {
    id: 'discount_50_dollars',
    name: '$50 Off Premium Package',
    description: 'For premium packages only',
    credits: 350,
    icon: Tag,
    tier: 'discount',
    available: true,
  },
  // Premium Rewards
  {
    id: 'free_basic_shoot',
    name: 'Free Basic Photo Shoot',
    description: 'Complete photo package for one property',
    credits: 750,
    icon: Camera,
    tier: 'premium',
    available: true,
  },
  {
    id: 'free_video',
    name: 'Free Property Video',
    description: 'Cinematic video walkthrough',
    credits: 1200,
    icon: Video,
    tier: 'premium',
    available: true,
  },
]

export default function RewardsPage() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [purchaseMessage, setPurchaseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadAgent() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .single()

      if (data) {
        setAgent(data)
        // Load transactions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: txns } = await (supabase as any)
          .from('credit_transactions')
          .select('*')
          .eq('agent_id', data.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (txns) setTransactions(txns)
      }
      setLoading(false)
    }

    loadAgent()
  }, [supabase])

  // Verify Stripe session on page load if session_id is present
  useEffect(() => {
    async function verifyPurchase() {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')
      const cancelled = params.get('purchase')

      if (cancelled === 'cancelled') {
        setPurchaseMessage({ type: 'error', text: 'Purchase was cancelled' })
        // Clean URL
        window.history.replaceState({}, '', '/dashboard/rewards')
        return
      }

      if (!sessionId) return

      try {
        const response = await fetch('/api/credits/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })

        const data = await response.json()

        if (data.success) {
          setPurchaseMessage({
            type: 'success',
            text: data.alreadyFulfilled
              ? `${data.credits} credits were already added to your account`
              : `Successfully added ${data.credits} credits to your account!`,
          })

          // Update local agent balance
          if (agent && data.newBalance) {
            setAgent({ ...agent, credit_balance: data.newBalance })
          }

          // Reload transactions
          if (agent) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: txns } = await (supabase as any)
              .from('credit_transactions')
              .select('*')
              .eq('agent_id', agent.id)
              .order('created_at', { ascending: false })
              .limit(10)

            if (txns) setTransactions(txns)
          }
        } else {
          setPurchaseMessage({
            type: 'error',
            text: data.message || 'Failed to verify purchase',
          })
        }
      } catch (error) {
        console.error('Verification error:', error)
        setPurchaseMessage({ type: 'error', text: 'Failed to verify purchase' })
      }

      // Clean URL
      window.history.replaceState({}, '', '/dashboard/rewards')
    }

    if (!loading && agent) {
      verifyPurchase()
    }
  }, [loading, agent, supabase])

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId)
    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        console.error('Purchase failed:', data.error)
      }
    } catch (error) {
      console.error('Purchase error:', error)
    } finally {
      setPurchasing(null)
    }
  }

  const handleRedeem = async (reward: Reward) => {
    if (!agent || (agent.credit_balance || 0) < reward.credits) return

    setRedeeming(reward.id)

    // Call API to redeem reward
    const response = await fetch('/api/rewards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: agent.id,
        reward_id: reward.id,
        credits_cost: reward.credits,
        reward_type: reward.tier,
      }),
    })

    if (response.ok) {
      // Update local balance
      setAgent({
        ...agent,
        credit_balance: (agent.credit_balance || 0) - reward.credits,
      })
      setRedeemed(reward.id)
      setTimeout(() => setRedeemed(null), 3000)
    }

    setRedeeming(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#636366]" />
      </div>
    )
  }

  const creditBalance = agent?.credit_balance ?? 0
  const lifetimeCredits = agent?.lifetime_credits ?? 0
  const tier = getTier(lifetimeCredits)
  const progressToNext = tier.next ? Math.min(100, (lifetimeCredits / tier.required) * 100) : 100
  const creditsToNext = tier.next ? tier.required - lifetimeCredits : 0

  const aiRewards = rewards.filter((r) => r.tier === 'ai')
  const discountRewards = rewards.filter((r) => r.tier === 'discount')
  const premiumRewards = rewards.filter((r) => r.tier === 'premium')

  return (
    <div className="space-y-8">
      {/* Purchase Result Banner */}
      {purchaseMessage && (
        <div
          className={`rounded-xl p-4 flex items-center gap-3 ${
            purchaseMessage.type === 'success'
              ? 'bg-green-500/20 border border-green-500/30'
              : 'bg-red-500/20 border border-red-500/30'
          }`}
        >
          {purchaseMessage.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          ) : (
            <Zap className="h-5 w-5 text-red-400 flex-shrink-0" />
          )}
          <p className={purchaseMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {purchaseMessage.text}
          </p>
          <button
            onClick={() => setPurchaseMessage(null)}
            className="ml-auto text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <div>
        <h1 className="text-[22px] font-semibold text-white">Rewards Store</h1>
        <p className="mt-1 text-[#a1a1a6]">
          Redeem your credits for AI tools, discounts, and free services.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            <span className="text-[13px] text-[#636366]">Available Credits</span>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-white">{creditBalance}</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-[13px] text-[#636366]">Lifetime Earned</span>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-white">{lifetimeCredits}</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${tier.color}`} />
            <span className="text-[13px] text-[#636366]">Your Tier</span>
          </div>
          <p className={`mt-2 text-[28px] font-semibold ${tier.textColor}`}>{tier.name}</p>
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

      {/* Purchase Credits Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-green-400" />
          <h2 className="text-[17px] font-semibold text-white">Purchase Credits</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-xl border ${
                pkg.popular
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-white/[0.08] bg-[#1c1c1e]'
              } p-4 relative`}
            >
              {pkg.popular && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  BEST VALUE
                </span>
              )}
              <div className="text-center">
                <p className="text-[28px] font-bold text-white">{pkg.credits}</p>
                <p className="text-[13px] text-[#636366]">credits</p>
              </div>
              <div className="mt-4 text-center">
                <p className="text-[22px] font-semibold text-white">${pkg.price}</p>
                {'savings' in pkg && pkg.savings && (
                  <p className="text-[12px] text-green-400">Save {pkg.savings}</p>
                )}
              </div>
              <Button
                className="mt-4 w-full"
                variant={pkg.popular ? 'default' : 'outline'}
                disabled={purchasing !== null}
                onClick={() => handlePurchase(pkg.id)}
              >
                {purchasing === pkg.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Buy Now'
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#636366]" />
              <h2 className="text-[17px] font-semibold text-white">Recent Activity</h2>
            </div>
            {transactions.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllTransactions(!showAllTransactions)}
              >
                {showAllTransactions ? 'Show Less' : 'Show All'}
              </Button>
            )}
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] divide-y divide-white/[0.08]">
            {(showAllTransactions ? transactions : transactions.slice(0, 5)).map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      txn.amount > 0
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {txn.amount > 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{txn.description}</p>
                    <p className="text-[12px] text-[#636366]">
                      {new Date(txn.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      txn.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {txn.amount > 0 ? '+' : ''}{txn.amount}
                  </p>
                  <p className="text-[12px] text-[#636366]">
                    Balance: {txn.balance_after}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Tools Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h2 className="text-[17px] font-semibold text-white">AI Tools</h2>
          <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[11px] text-purple-400">
            Best Value
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aiRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              creditBalance={creditBalance}
              redeeming={redeeming}
              redeemed={redeemed}
              onRedeem={handleRedeem}
            />
          ))}
        </div>
      </div>

      {/* Discounts Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Tag className="h-5 w-5 text-[#0077ff]" />
          <h2 className="text-[17px] font-semibold text-white">Service Discounts</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {discountRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              creditBalance={creditBalance}
              redeeming={redeeming}
              redeemed={redeemed}
              onRedeem={handleRedeem}
            />
          ))}
        </div>
      </div>

      {/* Premium Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400" />
          <h2 className="text-[17px] font-semibold text-white">Premium Rewards</h2>
          <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-400">
            Top Referrers
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {premiumRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              creditBalance={creditBalance}
              redeeming={redeeming}
              redeemed={redeemed}
              onRedeem={handleRedeem}
            />
          ))}
        </div>
      </div>

      {/* Earn More */}
      <div className="rounded-xl border border-white/[0.08] bg-gradient-to-r from-[#0077ff]/20 to-transparent p-6">
        <h2 className="font-semibold text-white">Need more credits?</h2>
        <p className="mt-1 text-[#a1a1a6]">
          Refer other agents to earn credits. They get 10% off their first shoot!
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <a href="/dashboard/referrals">
            View Referral Program
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}

function RewardCard({
  reward,
  creditBalance,
  redeeming,
  redeemed,
  onRedeem,
}: {
  reward: Reward
  creditBalance: number
  redeeming: string | null
  redeemed: string | null
  onRedeem: (reward: Reward) => void
}) {
  const canAfford = creditBalance >= reward.credits
  const isRedeeming = redeeming === reward.id
  const wasRedeemed = redeemed === reward.id

  const tierColors = {
    ai: 'bg-purple-500/20 border-purple-500/30',
    discount: 'bg-[#0077ff]/20 border-[#0077ff]/30',
    premium: 'bg-amber-500/20 border-amber-500/30',
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
      <div className="flex items-start gap-3">
        <div className={`rounded-xl border p-2 ${tierColors[reward.tier]}`}>
          <reward.icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-white">{reward.name}</h3>
          <p className="mt-0.5 text-[13px] text-[#636366]">{reward.description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-amber-400" />
          <span className="font-semibold text-white">{reward.credits}</span>
          <span className="text-[13px] text-[#636366]">credits</span>
        </div>

        <Button
          size="sm"
          disabled={!canAfford || isRedeeming}
          onClick={() => onRedeem(reward)}
          className={wasRedeemed ? 'bg-green-500 hover:bg-green-500' : ''}
        >
          {wasRedeemed ? (
            <>
              <CheckCircle className="mr-1 h-4 w-4" />
              Redeemed!
            </>
          ) : isRedeeming ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Redeeming...
            </>
          ) : canAfford ? (
            'Redeem'
          ) : (
            'Not enough'
          )}
        </Button>
      </div>
    </div>
  )
}
