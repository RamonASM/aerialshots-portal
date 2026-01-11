/**
 * Agent Loyalty Dashboard
 *
 * Shows points balance, tier status, punch cards, and history
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentLoyaltySummary, getPointsHistory, getLoyaltyTiers } from '@/lib/loyalty/service'
import { LoyaltyDashboardClient } from '@/components/dashboard/LoyaltyDashboardClient'

// Auth bypass for development
const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

export const metadata = {
  title: 'Rewards | ASM Portal',
  description: 'View your loyalty points, tier status, and punch cards',
}

async function getLoyaltyData(agentId: string) {
  const [summary, history, tiers] = await Promise.all([
    getAgentLoyaltySummary(agentId),
    getPointsHistory(agentId, 20),
    getLoyaltyTiers(),
  ])

  return { summary, history, tiers }
}

export default async function LoyaltyPage() {
  // Get user email - either from bypass or Clerk
  let userEmail: string

  if (authBypassEnabled) {
    userEmail = process.env.AUTH_BYPASS_EMAIL || 'bypass@aerialshots.media'
  } else {
    const user = await currentUser()
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      redirect('/sign-in')
    }
    userEmail = user.emailAddresses[0].emailAddress.toLowerCase()
  }

  const supabase = createAdminClient()

  // Get agent ID from user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agent } = await (supabase as any)
    .from('agents')
    .select('id, name, email')
    .eq('email', userEmail)
    .maybeSingle()

  if (!agent) {
    // User exists but no agent profile - show empty state
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold text-white mb-6">Rewards</h1>
          <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-8 text-center">
            <p className="text-[#8e8e93]">
              Your loyalty profile is being set up. Check back soon!
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { summary, history, tiers } = await getLoyaltyData(agent.id)

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold text-white mb-6">Rewards</h1>

        <Suspense fallback={<LoyaltyLoadingSkeleton />}>
          <LoyaltyDashboardClient
            agentId={agent.id}
            agentName={agent.name}
            summary={summary}
            history={history}
            tiers={tiers}
          />
        </Suspense>
      </div>
    </div>
  )
}

function LoyaltyLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Points Card Skeleton */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <div className="h-6 w-32 bg-white/10 rounded mb-4" />
        <div className="h-12 w-48 bg-white/10 rounded mb-2" />
        <div className="h-4 w-24 bg-white/10 rounded" />
      </div>

      {/* Tier Progress Skeleton */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <div className="h-6 w-40 bg-white/10 rounded mb-4" />
        <div className="h-3 w-full bg-white/10 rounded mb-2" />
        <div className="h-4 w-32 bg-white/10 rounded" />
      </div>

      {/* Punch Cards Skeleton */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <div className="h-6 w-32 bg-white/10 rounded mb-4" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-8 w-8 bg-white/10 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
