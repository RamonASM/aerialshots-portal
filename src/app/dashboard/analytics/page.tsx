'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Eye,
  Users,
  Download,
  Phone,
  TrendingUp,
  TrendingDown,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  BarChart3,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import type { AnalyticsDashboardData } from '@/lib/analytics/types'

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  benchmark,
  benchmarkLabel
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  benchmark?: number
  benchmarkLabel?: string
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-neutral-400'

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-neutral-400">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {subtitle && (
              <p className="text-xs text-neutral-500">{subtitle}</p>
            )}
          </div>
          <div className="p-3 bg-neutral-800 rounded-lg">
            <Icon className="h-5 w-5 text-neutral-400" />
          </div>
        </div>
        {(trend || benchmark !== undefined) && (
          <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between">
            {trend && (
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
                <span className="text-sm">vs last period</span>
              </div>
            )}
            {benchmark !== undefined && benchmarkLabel && (
              <div className="text-xs text-neutral-500">
                Market avg: {benchmark} {benchmarkLabel}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeviceBreakdownChart({ devices }: { devices: AnalyticsDashboardData['devices'] }) {
  const total = devices.mobile + devices.desktop + devices.tablet + devices.unknown
  if (total === 0) return null

  const segments = [
    { label: 'Mobile', value: devices.mobile, icon: Smartphone, color: 'bg-blue-500' },
    { label: 'Desktop', value: devices.desktop, icon: Monitor, color: 'bg-emerald-500' },
    { label: 'Tablet', value: devices.tablet, icon: Tablet, color: 'bg-amber-500' },
  ].filter(s => s.value > 0)

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg text-white">Device Breakdown</CardTitle>
        <CardDescription className="text-neutral-400">How visitors view your content</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="h-3 rounded-full bg-neutral-800 overflow-hidden flex">
            {segments.map((segment) => (
              <div
                key={segment.label}
                className={`${segment.color} transition-all`}
                style={{ width: `${(segment.value / total) * 100}%` }}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-4">
            {segments.map((segment) => (
              <div key={segment.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${segment.color}`} />
                <div>
                  <p className="text-sm text-white">{segment.label}</p>
                  <p className="text-xs text-neutral-400">
                    {Math.round((segment.value / total) * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TopReferrersCard({ referrers }: { referrers: AnalyticsDashboardData['topReferrers'] }) {
  if (referrers.length === 0) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-lg text-white">Top Referrers</CardTitle>
          <CardDescription className="text-neutral-400">Where your traffic comes from</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-500 text-sm">No referrer data yet</p>
        </CardContent>
      </Card>
    )
  }

  const total = referrers.reduce((sum, r) => sum + r.count, 0)

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg text-white">Top Referrers</CardTitle>
        <CardDescription className="text-neutral-400">Where your traffic comes from</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {referrers.map((referrer, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-neutral-500" />
                <span className="text-sm text-white truncate max-w-[180px]">
                  {referrer.source}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(referrer.count / total) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-neutral-400 w-10 text-right">
                  {referrer.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TopListingsCard({ listings }: { listings: AnalyticsDashboardData['topListings'] }) {
  if (listings.length === 0) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-lg text-white">Top Performing Listings</CardTitle>
          <CardDescription className="text-neutral-400">Your most viewed properties</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-500 text-sm">No listing data yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg text-white">Top Performing Listings</CardTitle>
        <CardDescription className="text-neutral-400">Your most viewed properties</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {listings.map((listing, i) => (
            <div key={listing.listingId} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-neutral-600">#{i + 1}</span>
                <div>
                  <p className="text-sm text-white truncate max-w-[200px]">{listing.address}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {listing.totalViews}
                    </span>
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Users className="h-3 w-3" /> {listing.uniqueVisitors}
                    </span>
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Download className="h-3 w-3" /> {listing.downloads}
                    </span>
                  </div>
                </div>
              </div>
              {listing.leads > 0 && (
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                  {listing.leads} lead{listing.leads !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ViewTrendsChart({ trends }: { trends: AnalyticsDashboardData['viewTrends'] }) {
  if (trends.length === 0) {
    return (
      <Card className="bg-neutral-900 border-neutral-800 col-span-2">
        <CardHeader>
          <CardTitle className="text-lg text-white">Views Over Time</CardTitle>
          <CardDescription className="text-neutral-400">Last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <p className="text-neutral-500 text-sm">No view data yet</p>
        </CardContent>
      </Card>
    )
  }

  const maxViews = Math.max(...trends.map(t => t.views), 1)

  return (
    <Card className="bg-neutral-900 border-neutral-800 col-span-2">
      <CardHeader>
        <CardTitle className="text-lg text-white">Views Over Time</CardTitle>
        <CardDescription className="text-neutral-400">Last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] flex items-end gap-1">
          {trends.map((day, i) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-blue-500/80 rounded-t hover:bg-blue-400 transition-colors cursor-pointer group relative"
                style={{ height: `${(day.views / maxViews) * 160}px`, minHeight: day.views > 0 ? '4px' : '0' }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800 px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                  <p className="text-white font-medium">{day.views} views</p>
                  <p className="text-neutral-400">{day.uniqueVisitors} unique</p>
                  <p className="text-neutral-500">{new Date(day.date).toLocaleDateString()}</p>
                </div>
              </div>
              {i % 7 === 0 && (
                <span className="text-[10px] text-neutral-600">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LeadConversionsCard({ leads, benchmarkRate }: { leads: AnalyticsDashboardData['leads']; benchmarkRate: number }) {
  const conversionTypes = [
    { key: 'contact_form', label: 'Contact Forms', color: 'bg-emerald-500' },
    { key: 'phone_click', label: 'Phone Clicks', color: 'bg-blue-500' },
    { key: 'email_click', label: 'Email Clicks', color: 'bg-amber-500' },
    { key: 'schedule_showing', label: 'Showing Requests', color: 'bg-purple-500' },
  ]

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg text-white">Lead Conversions</CardTitle>
        <CardDescription className="text-neutral-400">
          {leads.conversionRate.toFixed(2)}% conversion rate
          <span className="text-neutral-600 ml-2">(market avg: {benchmarkRate}%)</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {conversionTypes.map((type) => {
            const count = leads.byType[type.key] || 0
            return (
              <div key={type.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${type.color}`} />
                  <span className="text-sm text-neutral-300">{type.label}</span>
                </div>
                <span className="text-sm font-medium text-white">{count}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Total Leads</span>
            <span className="text-lg font-bold text-white">{leads.totalLeads}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics/dashboard')
        if (!res.ok) {
          throw new Error('Failed to load analytics')
        }
        const analyticsData = await res.json()
        setData(analyticsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-800 rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-36 bg-neutral-900 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6 flex items-center justify-center">
        <Card className="bg-neutral-900 border-neutral-800 max-w-md">
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Analytics Coming Soon</h2>
            <p className="text-neutral-400">
              {error || 'Start tracking views on your property pages to see analytics here.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-neutral-400">Track performance across your listings</p>
          </div>
          <Badge variant="outline" className="border-neutral-700 text-neutral-400">
            Updated just now
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Views"
            value={data.pageViews.totalViews.toLocaleString()}
            subtitle={`${data.pageViews.viewsLast7Days} in last 7 days`}
            icon={Eye}
            benchmark={data.benchmarks.avgViewsPerListing}
            benchmarkLabel="per listing"
          />
          <MetricCard
            title="Unique Visitors"
            value={data.pageViews.uniqueVisitors.toLocaleString()}
            subtitle={`${data.activeListings} active listings`}
            icon={Users}
          />
          <MetricCard
            title="Avg. Session Duration"
            value={data.pageViews.avgDurationSeconds ? `${data.pageViews.avgDurationSeconds}s` : '-'}
            subtitle="Time spent on pages"
            icon={Clock}
            benchmark={data.benchmarks.avgSessionDuration}
            benchmarkLabel="seconds"
          />
          <MetricCard
            title="Total Downloads"
            value={data.downloads.totalDownloads.toLocaleString()}
            subtitle={`${data.downloads.downloadsLast30Days} in last 30 days`}
            icon={Download}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ViewTrendsChart trends={data.viewTrends} />
          <DeviceBreakdownChart devices={data.devices} />
        </div>

        {/* Details Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TopListingsCard listings={data.topListings} />
          <TopReferrersCard referrers={data.topReferrers} />
          <LeadConversionsCard leads={data.leads} benchmarkRate={data.benchmarks.avgLeadConversionRate} />
        </div>

        {/* Insights Section */}
        {data.pageViews.totalViews > 0 && (
          <Card className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-neutral-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Performance Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.pageViews.totalViews / Math.max(data.activeListings, 1) > data.benchmarks.avgViewsPerListing && (
                  <div className="space-y-1">
                    <p className="text-emerald-400 font-medium">Above Average Views</p>
                    <p className="text-sm text-neutral-400">
                      Your listings average {Math.round(data.pageViews.totalViews / Math.max(data.activeListings, 1)).toLocaleString()} views
                      vs market average of {data.benchmarks.avgViewsPerListing.toLocaleString()}
                    </p>
                  </div>
                )}
                {data.leads.conversionRate > data.benchmarks.avgLeadConversionRate && (
                  <div className="space-y-1">
                    <p className="text-emerald-400 font-medium">Strong Conversion Rate</p>
                    <p className="text-sm text-neutral-400">
                      Your {data.leads.conversionRate.toFixed(2)}% conversion beats the {data.benchmarks.avgLeadConversionRate}% average
                    </p>
                  </div>
                )}
                {data.devices.mobile > data.devices.desktop && (
                  <div className="space-y-1">
                    <p className="text-blue-400 font-medium">Mobile-First Audience</p>
                    <p className="text-sm text-neutral-400">
                      {Math.round((data.devices.mobile / (data.devices.mobile + data.devices.desktop + data.devices.tablet)) * 100)}% of your visitors browse on mobile devices
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
