'use client'

/**
 * Loyalty Dashboard Client Component
 *
 * Interactive loyalty dashboard with points, tiers, and punch cards
 */

import { useState } from 'react'
import { LoyaltySummary, LoyaltyPoints, LoyaltyTier, PunchCard } from '@/lib/loyalty/service'

interface LoyaltyDashboardClientProps {
  agentId: string
  agentName: string
  summary: LoyaltySummary | null
  history: LoyaltyPoints[]
  tiers: LoyaltyTier[]
}

export function LoyaltyDashboardClient({
  agentName,
  summary,
  history,
  tiers,
}: LoyaltyDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'rewards'>('overview')

  if (!summary) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-8 text-center">
        <div className="text-4xl mb-4">🎁</div>
        <h2 className="text-xl font-semibold text-white mb-2">Welcome to Rewards!</h2>
        <p className="text-[#8e8e93]">
          Start earning points with your first booking.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Points Summary Card */}
      <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#1c1c1e] to-[#0a0a0a] p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[#8e8e93] mb-1">Your Points</p>
            <p className="text-4xl font-bold text-white mb-1">
              {summary.current_points.toLocaleString()}
            </p>
            <p className="text-sm text-[#8e8e93]">
              Lifetime: {summary.lifetime_points.toLocaleString()} points
            </p>
          </div>
          <TierBadge tier={summary.current_tier} />
        </div>
      </div>

      {/* Tier Progress */}
      {summary.next_tier && (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">Progress to {summary.next_tier.name}</h3>
            <span className="text-sm text-[#8e8e93]">
              {summary.points_to_next_tier.toLocaleString()} points away
            </span>
          </div>
          <TierProgressBar
            currentPoints={summary.lifetime_points}
            currentTier={summary.current_tier}
            nextTier={summary.next_tier}
            tiers={tiers}
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {(['overview', 'history', 'rewards'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[#0077ff] text-white'
                : 'bg-[#1c1c1e] text-[#8e8e93] hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Punch Cards */}
          <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
            <h3 className="text-lg font-medium text-white mb-4">Punch Cards</h3>
            {summary.active_punch_cards.length > 0 ? (
              <div className="space-y-4">
                {summary.active_punch_cards.map((card) => (
                  <PunchCardDisplay key={card.id} card={card} />
                ))}
              </div>
            ) : (
              <p className="text-[#8e8e93] text-sm">
                Your punch cards will appear here. Complete 10 shoots of the same type to earn a free service!
              </p>
            )}
          </div>

          {/* Tier Perks */}
          {summary.current_tier && (
            <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
              <h3 className="text-lg font-medium text-white mb-4">
                {summary.current_tier.name} Perks
              </h3>
              <ul className="space-y-2">
                {summary.current_tier.perks.map((perk, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#a1a1a6]">
                    <span className="text-[#0077ff]">✓</span>
                    {perk}
                  </li>
                ))}
                {summary.current_tier.discount_percent > 0 && (
                  <li className="flex items-center gap-2 text-sm text-[#a1a1a6]">
                    <span className="text-[#0077ff]">✓</span>
                    {summary.current_tier.discount_percent}% discount on all services
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] overflow-hidden">
          <div className="p-4 border-b border-white/[0.08]">
            <h3 className="text-lg font-medium text-white">Points History</h3>
          </div>
          {history.length > 0 ? (
            <div className="divide-y divide-white/[0.08]">
              {history.map((entry) => (
                <HistoryEntry key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-[#8e8e93]">No points history yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="space-y-6">
          {/* Available Rewards */}
          <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
            <h3 className="text-lg font-medium text-white mb-4">Available Rewards</h3>
            {summary.available_rewards > 0 ? (
              <div className="bg-[#0077ff]/10 border border-[#0077ff]/20 rounded-lg p-4">
                <p className="text-[#0077ff] font-medium">
                  You have {summary.available_rewards} reward{summary.available_rewards !== 1 ? 's' : ''} to redeem!
                </p>
                <p className="text-sm text-[#8e8e93] mt-1">
                  Use at checkout on your next order.
                </p>
              </div>
            ) : (
              <p className="text-[#8e8e93] text-sm">
                Complete punch cards to earn free services.
              </p>
            )}
          </div>

          {/* All Tiers */}
          <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
            <h3 className="text-lg font-medium text-white mb-4">Loyalty Tiers</h3>
            <div className="space-y-3">
              {tiers.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  isCurrentTier={summary.current_tier?.id === tier.id}
                  isUnlocked={summary.lifetime_points >= tier.min_points}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TierBadge({ tier }: { tier: LoyaltyTier | null }) {
  if (!tier) {
    return (
      <div className="px-3 py-1.5 rounded-full bg-[#2c2c2e] text-sm text-[#8e8e93]">
        Bronze
      </div>
    )
  }

  return (
    <div
      className="px-3 py-1.5 rounded-full text-sm font-medium"
      style={{
        backgroundColor: `${tier.badge_color}20`,
        color: tier.badge_color,
      }}
    >
      {tier.name}
    </div>
  )
}

function TierProgressBar({
  currentPoints,
  currentTier,
  nextTier,
  tiers,
}: {
  currentPoints: number
  currentTier: LoyaltyTier | null
  nextTier: LoyaltyTier | null
  tiers: LoyaltyTier[]
}) {
  const minPoints = currentTier?.min_points || 0
  const maxPoints = nextTier?.min_points || (tiers[tiers.length - 1]?.min_points || 1000)
  const progress = Math.min(100, ((currentPoints - minPoints) / (maxPoints - minPoints)) * 100)

  return (
    <div className="relative">
      <div className="h-2 bg-[#2c2c2e] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#0077ff] to-[#3395ff] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-[#8e8e93]">
        <span>{currentTier?.name || 'Start'}</span>
        <span>{nextTier?.name || 'Max'}</span>
      </div>
    </div>
  )
}

function PunchCardDisplay({ card }: { card: PunchCard }) {
  const punches = Array.from({ length: card.punches_required }, (_, i) => i < card.punches_earned)

  return (
    <div className="bg-[#0a0a0a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white capitalize">
          {card.card_type} Card
        </h4>
        <span className="text-xs text-[#8e8e93]">
          {card.punches_earned}/{card.punches_required}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {punches.map((filled, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              filled
                ? 'bg-[#0077ff] text-white'
                : 'bg-[#2c2c2e] text-[#8e8e93]'
            }`}
          >
            {filled ? '✓' : i + 1}
          </div>
        ))}
      </div>
      <p className="text-xs text-[#8e8e93] mt-3">
        Reward: Free {card.reward_value || card.card_type}
      </p>
    </div>
  )
}

function HistoryEntry({ entry }: { entry: LoyaltyPoints }) {
  const isPositive = entry.type === 'earned' || entry.type === 'bonus'
  const date = new Date(entry.created_at)

  const typeLabels: Record<string, string> = {
    earned: 'Earned',
    redeemed: 'Redeemed',
    expired: 'Expired',
    bonus: 'Bonus',
    adjustment: 'Adjustment',
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm text-white">{entry.description || typeLabels[entry.type]}</p>
        <p className="text-xs text-[#8e8e93]">
          {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : '-'}{entry.points.toLocaleString()}
      </span>
    </div>
  )
}

function TierCard({
  tier,
  isCurrentTier,
  isUnlocked,
}: {
  tier: LoyaltyTier
  isCurrentTier: boolean
  isUnlocked: boolean
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        isCurrentTier
          ? 'bg-[#0077ff]/10 border border-[#0077ff]/20'
          : 'bg-[#0a0a0a] border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: tier.badge_color }}
          />
          <span className={`font-medium ${isUnlocked ? 'text-white' : 'text-[#8e8e93]'}`}>
            {tier.name}
          </span>
          {isCurrentTier && (
            <span className="text-xs bg-[#0077ff] text-white px-2 py-0.5 rounded">
              Current
            </span>
          )}
        </div>
        <span className="text-xs text-[#8e8e93]">
          {tier.min_points.toLocaleString()} pts
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-[#8e8e93]">
        {tier.discount_percent > 0 && (
          <span>{tier.discount_percent}% off</span>
        )}
        <span>{tier.perks.length} perks</span>
      </div>
    </div>
  )
}
