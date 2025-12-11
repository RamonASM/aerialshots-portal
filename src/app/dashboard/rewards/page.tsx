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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type Agent = Database['public']['Tables']['agents']['Row']

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

      if (data) setAgent(data)
      setLoading(false)
    }

    loadAgent()
  }, [supabase])

  const handleRedeem = async (reward: Reward) => {
    if (!agent || agent.credit_balance < reward.credits) return

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
        credit_balance: agent.credit_balance - reward.credits,
      })
      setRedeemed(reward.id)
      setTimeout(() => setRedeemed(null), 3000)
    }

    setRedeeming(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  const creditBalance = agent?.credit_balance ?? 0

  const aiRewards = rewards.filter((r) => r.tier === 'ai')
  const discountRewards = rewards.filter((r) => r.tier === 'discount')
  const premiumRewards = rewards.filter((r) => r.tier === 'premium')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Rewards Store</h1>
          <p className="mt-1 text-neutral-600">
            Redeem your credits for AI tools, discounts, and free services.
          </p>
        </div>
        <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-white">
          <p className="text-sm font-medium">Available Credits</p>
          <p className="text-3xl font-bold">{creditBalance}</p>
        </div>
      </div>

      {/* AI Tools Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-neutral-900">AI Tools</h2>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
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
          <Tag className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-neutral-900">Service Discounts</h2>
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
          <Star className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-neutral-900">Premium Rewards</h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
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
      <div className="rounded-lg border border-neutral-200 bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 text-white">
        <h2 className="font-semibold">Need more credits?</h2>
        <p className="mt-1 text-neutral-300">
          Refer other agents to earn credits. They get 10% off their first shoot!
        </p>
        <Button variant="secondary" className="mt-4" asChild>
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
    ai: 'border-purple-200 bg-purple-50',
    discount: 'border-blue-200 bg-blue-50',
    premium: 'border-amber-200 bg-amber-50',
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${tierColors[reward.tier]}`}>
          <reward.icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-neutral-900">{reward.name}</h3>
          <p className="mt-0.5 text-sm text-neutral-600">{reward.description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-neutral-900">{reward.credits}</span>
          <span className="text-sm text-neutral-500">credits</span>
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
