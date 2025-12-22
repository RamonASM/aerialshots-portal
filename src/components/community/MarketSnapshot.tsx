import { TrendingUp, TrendingDown, Clock, Home, DollarSign, BarChart3 } from 'lucide-react'
import type { CommunityMarketSnapshot } from '@/lib/supabase/types'

interface MarketSnapshotProps {
  marketData?: CommunityMarketSnapshot | null
  communityName: string
}

export function MarketSnapshot({ marketData, communityName }: MarketSnapshotProps) {
  if (!marketData) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Market Snapshot
        </h3>
        <p className="mt-4 text-sm text-neutral-500">
          Market data for {communityName} coming soon.
        </p>
      </div>
    )
  }

  const isPositiveChange = (marketData.yoy_change || 0) >= 0

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        Market Snapshot
      </h3>

      <div className="mt-6 space-y-5">
        {/* Median Price */}
        {marketData.median_price && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-600">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Median Price</span>
            </div>
            <div className="text-lg font-bold text-neutral-900">
              ${marketData.median_price.toLocaleString()}
            </div>
          </div>
        )}

        {/* YoY Change */}
        {marketData.yoy_change !== undefined && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-600">
              {isPositiveChange ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">YoY Change</span>
            </div>
            <div
              className={`text-lg font-bold ${
                isPositiveChange ? 'text-green-600' : 'text-red-600'
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
            <div className="flex items-center gap-2 text-neutral-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Avg Days on Market</span>
            </div>
            <div className="text-lg font-bold text-neutral-900">
              {marketData.avg_dom} days
            </div>
          </div>
        )}

        {/* Price per Sqft */}
        {marketData.price_per_sqft && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-600">
              <Home className="h-4 w-4" />
              <span className="text-sm">Price per Sqft</span>
            </div>
            <div className="text-lg font-bold text-neutral-900">
              ${marketData.price_per_sqft}
            </div>
          </div>
        )}

        {/* Active Listings */}
        {marketData.active_listings && (
          <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
            <span className="text-sm text-neutral-600">Active Listings</span>
            <div className="text-lg font-bold text-blue-600">
              {marketData.active_listings}
            </div>
          </div>
        )}

        {/* Sold Last 30 Days */}
        {marketData.sold_last_30 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Sold (30 days)</span>
            <div className="text-lg font-bold text-green-600">
              {marketData.sold_last_30}
            </div>
          </div>
        )}
      </div>

      {/* Last Updated */}
      {marketData.updated_at && (
        <div className="mt-4 text-xs text-neutral-400 text-center">
          Updated {new Date(marketData.updated_at).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
