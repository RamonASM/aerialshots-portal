/**
 * Portfolio Stats Component
 *
 * Displays agent portfolio statistics with visual enhancements
 */

'use client'

import { TrendingUp, DollarSign, Clock, Home, Award, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PortfolioStatsProps {
  totalListings: number
  activeListings: number
  soldListings: number
  totalVolume: number
  avgDaysOnMarket: number
  avgPrice: number
  brandColor?: string
  className?: string
}

export function PortfolioStats({
  totalListings,
  activeListings,
  soldListings,
  totalVolume,
  avgDaysOnMarket,
  avgPrice,
  brandColor = '#0077ff',
  className,
}: PortfolioStatsProps) {
  const stats = [
    {
      icon: Home,
      label: 'Total Listings',
      value: totalListings.toString(),
      highlight: false,
    },
    {
      icon: Target,
      label: 'Active',
      value: activeListings.toString(),
      highlight: activeListings > 0,
    },
    {
      icon: Award,
      label: 'Sold',
      value: soldListings.toString(),
      highlight: false,
    },
    {
      icon: DollarSign,
      label: 'Total Volume',
      value: formatVolume(totalVolume),
      highlight: true,
    },
    {
      icon: Clock,
      label: 'Avg Days on Market',
      value: avgDaysOnMarket > 0 ? avgDaysOnMarket.toString() : '-',
      highlight: false,
    },
    {
      icon: TrendingUp,
      label: 'Avg Sale Price',
      value: avgPrice > 0 ? formatPrice(avgPrice) : '-',
      highlight: false,
    },
  ]

  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6', className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            'rounded-xl border p-4 text-center transition-all',
            stat.highlight
              ? 'border-transparent'
              : 'border-white/[0.08] bg-[#1c1c1e]'
          )}
          style={
            stat.highlight
              ? {
                  backgroundColor: `${brandColor}15`,
                  borderColor: `${brandColor}30`,
                }
              : undefined
          }
        >
          <div
            className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              backgroundColor: stat.highlight ? brandColor : `${brandColor}15`,
            }}
          >
            <stat.icon
              className="h-5 w-5"
              style={{
                color: stat.highlight ? '#ffffff' : brandColor,
              }}
            />
          </div>
          <p
            className="text-[22px] font-semibold"
            style={{ color: stat.highlight ? brandColor : '#ffffff' }}
          >
            {stat.value}
          </p>
          <p className="text-[11px] text-[#636366] uppercase tracking-wider">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function formatVolume(amount: number): string {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${amount}`
}

function formatPrice(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`
  }
  return `$${(amount / 1000).toFixed(0)}K`
}

/**
 * Compact Stats Bar for smaller spaces
 */
interface CompactStatsProps {
  soldCount: number
  totalVolume: number
  avgDOM: number
  brandColor?: string
}

export function CompactStats({
  soldCount,
  totalVolume,
  avgDOM,
  brandColor = '#0077ff',
}: CompactStatsProps) {
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4" style={{ color: brandColor }} />
        <span className="text-white font-medium">{soldCount}</span>
        <span className="text-[#636366]">Sold</span>
      </div>
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4" style={{ color: brandColor }} />
        <span className="text-white font-medium">{formatVolume(totalVolume)}</span>
        <span className="text-[#636366]">Volume</span>
      </div>
      {avgDOM > 0 && (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: brandColor }} />
          <span className="text-white font-medium">{avgDOM}</span>
          <span className="text-[#636366]">Avg DOM</span>
        </div>
      )}
    </div>
  )
}
