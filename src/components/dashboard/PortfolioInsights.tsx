'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Eye,
  TrendingUp,
  TrendingDown,
  Download,
  Users,
  ArrowRight,
  BarChart3,
  Sparkles
} from 'lucide-react'

interface InsightsData {
  totalViews: number
  viewsLast7Days: number
  uniqueVisitors: number
  totalDownloads: number
  activeListings: number
  avgViewsPerListing: number
  marketAvgViews: number
  percentAboveMarket: number
  topListing: {
    address: string
    views: number
  } | null
}

export function PortfolioInsights() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/analytics/dashboard')
        if (!res.ok) {
          setData(null)
          return
        }
        const analytics = await res.json()

        const avgViewsPerListing = analytics.activeListings > 0
          ? Math.round(analytics.pageViews.totalViews / analytics.activeListings)
          : 0

        const marketAvg = analytics.benchmarks.avgViewsPerListing
        const percentAbove = marketAvg > 0
          ? Math.round(((avgViewsPerListing - marketAvg) / marketAvg) * 100)
          : 0

        setData({
          totalViews: analytics.pageViews.totalViews,
          viewsLast7Days: analytics.pageViews.viewsLast7Days,
          uniqueVisitors: analytics.pageViews.uniqueVisitors,
          totalDownloads: analytics.downloads.totalDownloads,
          activeListings: analytics.activeListings,
          avgViewsPerListing,
          marketAvgViews: marketAvg,
          percentAboveMarket: percentAbove,
          topListing: analytics.topListings.length > 0
            ? {
                address: analytics.topListings[0].address,
                views: analytics.topListings[0].totalViews
              }
            : null
        })
      } catch (error) {
        console.error('Failed to load insights:', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [])

  if (loading) {
    return (
      <Card className="bg-neutral-900 border-neutral-800 animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-neutral-800 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-neutral-800 rounded" />
        </CardContent>
      </Card>
    )
  }

  // Show empty state if no data or no views
  if (!data || data.totalViews === 0) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-neutral-500" />
            Portfolio Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Sparkles className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">
              Analytics will appear once your listings start getting views
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isAboveMarket = data.percentAboveMarket > 0
  const TrendIcon = isAboveMarket ? TrendingUp : TrendingDown

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Portfolio Insights
          </CardTitle>
          <Link
            href="/dashboard/analytics"
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            View details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metric */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-white">{data.totalViews.toLocaleString()}</p>
            <p className="text-sm text-neutral-400">total property views</p>
          </div>
          {data.percentAboveMarket !== 0 && (
            <Badge
              variant="secondary"
              className={
                isAboveMarket
                  ? 'bg-emerald-500/20 text-emerald-400 border-0'
                  : 'bg-amber-500/20 text-amber-400 border-0'
              }
            >
              <TrendIcon className="h-3 w-3 mr-1" />
              {Math.abs(data.percentAboveMarket)}% {isAboveMarket ? 'above' : 'below'} market
            </Badge>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-neutral-800">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
              <Eye className="h-3 w-3" />
            </div>
            <p className="text-lg font-semibold text-white">{data.viewsLast7Days}</p>
            <p className="text-xs text-neutral-500">last 7 days</p>
          </div>
          <div className="text-center border-x border-neutral-800">
            <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
              <Users className="h-3 w-3" />
            </div>
            <p className="text-lg font-semibold text-white">{data.uniqueVisitors}</p>
            <p className="text-xs text-neutral-500">unique visitors</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
              <Download className="h-3 w-3" />
            </div>
            <p className="text-lg font-semibold text-white">{data.totalDownloads}</p>
            <p className="text-xs text-neutral-500">downloads</p>
          </div>
        </div>

        {/* Top performing listing */}
        {data.topListing && (
          <div className="pt-3 border-t border-neutral-800">
            <p className="text-xs text-neutral-500 mb-2">Top Performing</p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-white truncate max-w-[200px]">
                {data.topListing.address}
              </p>
              <span className="text-sm text-neutral-400">
                {data.topListing.views.toLocaleString()} views
              </span>
            </div>
          </div>
        )}

        {/* Insight callout */}
        {isAboveMarket && data.percentAboveMarket >= 20 && (
          <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
            <p className="text-xs text-emerald-400">
              <Sparkles className="h-3 w-3 inline mr-1" />
              Your listings average {data.avgViewsPerListing.toLocaleString()} views, outperforming
              the market average of {data.marketAvgViews.toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
