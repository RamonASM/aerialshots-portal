import { TrendingUp, TrendingDown, Clock, Home, DollarSign, BarChart3 } from 'lucide-react'
import type { CommunityMarketSnapshot } from '@/lib/supabase/types'

interface MarketSnapshotProps {
  marketData?: CommunityMarketSnapshot | null
  communityName: string
}

export function MarketSnapshot({ marketData, communityName }: MarketSnapshotProps) {
  if (!marketData) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e]/72 backdrop-blur-xl p-6">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          <BarChart3 className="h-5 w-5 text-[#0077ff]" />
          Market Snapshot
        </h3>
        <p className="mt-4 text-[13px] text-[#636366]">
          Market data for {communityName} coming soon.
        </p>
      </div>
    )
  }

  const isPositiveChange = (marketData.yoy_change || 0) >= 0

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e]/72 backdrop-blur-xl p-6">
      <h3 className="flex items-center gap-2 font-semibold text-white">
        <BarChart3 className="h-5 w-5 text-[#0077ff]" />
        Market Snapshot
      </h3>

      <div className="mt-6 space-y-5">
        {/* Median Price */}
        {marketData.median_price && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#a1a1a6]">
              <DollarSign className="h-4 w-4" />
              <span className="text-[13px]">Median Price</span>
            </div>
            <div className="text-[17px] font-semibold text-white">
              ${marketData.median_price.toLocaleString()}
            </div>
          </div>
        )}

        {/* YoY Change */}
        {marketData.yoy_change !== undefined && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#a1a1a6]">
              {isPositiveChange ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-[13px]">YoY Change</span>
            </div>
            <div
              className={`text-[17px] font-semibold ${
                isPositiveChange ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {isPositiveChange ? '+' : ''}
              {marketData.yoy_change}%
            </div>
          </div>
        )}

        {/* Average DOM */}
        {marketData.avg_dom && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#a1a1a6]">
              <Clock className="h-4 w-4" />
              <span className="text-[13px]">Avg Days on Market</span>
            </div>
            <div className="text-[17px] font-semibold text-white">
              {marketData.avg_dom} days
            </div>
          </div>
        )}

        {/* Price per Sqft */}
        {marketData.price_per_sqft && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#a1a1a6]">
              <Home className="h-4 w-4" />
              <span className="text-[13px]">Price per Sqft</span>
            </div>
            <div className="text-[17px] font-semibold text-white">
              ${marketData.price_per_sqft}
            </div>
          </div>
        )}

        {/* Active Listings */}
        {marketData.active_listings && (
          <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
            <span className="text-[13px] text-[#a1a1a6]">Active Listings</span>
            <div className="text-[17px] font-semibold text-[#0077ff]">
              {marketData.active_listings}
            </div>
          </div>
        )}

        {/* Sold Last 30 Days */}
        {marketData.sold_last_30 && (
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#a1a1a6]">Sold (30 days)</span>
            <div className="text-[17px] font-semibold text-green-500">
              {marketData.sold_last_30}
            </div>
          </div>
        )}
      </div>

      {/* Last Updated */}
      {marketData.updated_at && (
        <div className="mt-4 text-[11px] text-[#636366] text-center">
          Updated {new Date(marketData.updated_at).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
