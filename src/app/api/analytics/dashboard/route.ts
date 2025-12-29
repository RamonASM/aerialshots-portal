import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AnalyticsDashboardData, ViewTrend } from '@/lib/analytics/types'

import type { Database } from '@/lib/supabase/types'

// Use actual database types
type PageViewRow = Database['public']['Tables']['page_views']['Row']
type MediaDownloadRow = Database['public']['Tables']['media_downloads']['Row']

// Extended interface for computed properties
interface PageView extends PageViewRow {
  // Computed properties for UI (may not be in DB)
  visitor_id?: string | null
  duration_seconds?: number | null
  scroll_depth?: number | null
  device_type?: string | null
}

interface MediaDownload extends MediaDownloadRow {
  // Additional computed properties
}

// Lead uses standard leads table
interface Lead {
  id: string
  created_at: string
  converted_at?: string | null
  agent_id?: string | null
  listing_id?: string | null
  conversion_type?: string | null
}

interface MarketBenchmark {
  id: string
  metric_name: string
  metric_value: string
}

interface ListingBasic {
  id: string
  address: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get agent for this user
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('email', user.email)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Fetch analytics data
    const [
      pageViewsResult,
      downloadsResult,
      leadsResult,
      benchmarksResult,
      listingsResult,
      viewTrendsResult
    ] = await Promise.all([
      // Page view metrics
      supabase
        .from('page_views')
        .select('*')
        .eq('agent_id', agent.id),

      // Download metrics
      supabase
        .from('media_downloads')
        .select('*')
        .eq('listing_id', agent.id), // Note: media_downloads doesn't have agent_id directly

      // Lead metrics - using leads table since lead_conversions doesn't exist
      supabase
        .from('leads')
        .select('*')
        .eq('agent_id', agent.id),

      // Market benchmarks - may not exist, handle gracefully
      Promise.resolve({ data: [] as MarketBenchmark[], error: null }),

      // Agent's listings for top performers
      supabase
        .from('listings')
        .select('id, address')
        .eq('agent_id', agent.id)
        .neq('ops_status', 'cancelled')
        .limit(10),

      // View trends (last 30 days)
      supabase
        .from('page_views')
        .select('created_at, session_id')
        .eq('agent_id', agent.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ])

    const pageViews = (pageViewsResult.data || []) as PageView[]
    const downloads = (downloadsResult.data || []) as MediaDownload[]
    const leads = (leadsResult.data || []) as Lead[]
    const benchmarks = benchmarksResult.data || []
    const listings = (listingsResult.data || []) as ListingBasic[]
    const recentViews = (viewTrendsResult.data || []) as Array<{ created_at: string; session_id: string | null }>

    // Calculate page view metrics
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const viewsLast7Days = pageViews.filter((v) =>
      new Date(v.created_at) > sevenDaysAgo
    ).length

    const viewsLast30Days = pageViews.filter((v) =>
      new Date(v.created_at) > thirtyDaysAgo
    ).length

    const uniqueVisitors = new Set(pageViews.map((v) => v.session_id)).size

    // Duration and scroll depth might not be tracked - use defaults
    const avgDuration: number | null = null
    const avgScrollDepth: number | null = null

    // Device breakdown - parse from user_agent if available
    const devices = {
      mobile: 0,
      desktop: 0,
      tablet: 0,
      unknown: pageViews.length,
    }

    // Download metrics
    const downloadsLast30Days = downloads.filter((d) =>
      new Date(d.created_at) > thirtyDaysAgo
    ).length

    const downloadsByType: Record<string, number> = {}
    downloads.forEach((d) => {
      downloadsByType[d.download_type] = (downloadsByType[d.download_type] || 0) + 1
    })

    // Lead metrics
    const leadsLast30Days = leads.filter((l) =>
      l.converted_at && new Date(l.converted_at) > thirtyDaysAgo
    ).length

    const leadsByType: Record<string, number> = {}
    leads.forEach((l) => {
      if (l.conversion_type) {
        leadsByType[l.conversion_type] = (leadsByType[l.conversion_type] || 0) + 1
      }
    })

    const conversionRate = pageViews.length > 0
      ? (leads.length / pageViews.length) * 100
      : 0

    // Top referrers
    const referrerCounts: Record<string, number> = {}
    pageViews.forEach((v) => {
      if (v.referrer) {
        try {
          const url = new URL(v.referrer)
          const source = url.hostname
          referrerCounts[source] = (referrerCounts[source] || 0) + 1
        } catch {
          referrerCounts[v.referrer] = (referrerCounts[v.referrer] || 0) + 1
        }
      }
    })

    const topReferrers = Object.entries(referrerCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // View trends by day
    const trendMap: Record<string, { views: number; visitors: Set<string> }> = {}
    recentViews.forEach((v) => {
      const date = new Date(v.created_at).toISOString().split('T')[0]
      if (!trendMap[date]) {
        trendMap[date] = { views: 0, visitors: new Set() }
      }
      trendMap[date].views++
      if (v.session_id) {
        trendMap[date].visitors.add(v.session_id)
      }
    })

    const viewTrends: ViewTrend[] = Object.entries(trendMap)
      .map(([date, data]) => ({
        date,
        views: data.views,
        uniqueVisitors: data.visitors.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate listing analytics
    const topListings = await Promise.all(
      listings.map(async (listing) => {
        const { data: listingViews } = await supabase
          .from('page_views')
          .select('*')
          .eq('listing_id', listing.id)

        const { data: listingDownloads } = await supabase
          .from('media_downloads')
          .select('id')
          .eq('listing_id', listing.id)

        const { data: listingLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('listing_id', listing.id)

        const views = (listingViews || []) as PageView[]
        const viewsLast7 = views.filter((v) =>
          new Date(v.created_at) > sevenDaysAgo
        ).length

        const uniqueListingVisitors = new Set(views.map((v) => v.session_id)).size
        const avgListingDuration: number | null = null

        return {
          listingId: listing.id,
          address: listing.address,
          totalViews: views.length,
          viewsLast7Days: viewsLast7,
          uniqueVisitors: uniqueListingVisitors,
          avgDuration: avgListingDuration,
          downloads: listingDownloads?.length || 0,
          leads: listingLeads?.length || 0
        }
      })
    )

    // Sort by total views and take top 5
    topListings.sort((a, b) => b.totalViews - a.totalViews)

    // Parse benchmarks
    const benchmarkMap: Record<string, number> = {}
    benchmarks.forEach((b) => {
      benchmarkMap[b.metric_name] = parseFloat(b.metric_value)
    })

    const dashboardData: AnalyticsDashboardData = {
      agentId: agent.id,
      agentName: agent.name,
      pageViews: {
        totalViews: pageViews.length,
        uniqueVisitors,
        viewsLast7Days,
        viewsLast30Days,
        avgDurationSeconds: avgDuration,
        avgScrollDepth
      },
      devices,
      downloads: {
        totalDownloads: downloads.length,
        downloadsLast30Days,
        byAssetType: downloadsByType
      },
      leads: {
        totalLeads: leads.length,
        leadsLast30Days,
        conversionRate: Math.round(conversionRate * 100) / 100,
        byType: leadsByType
      },
      topReferrers,
      activeListings: listings.length,
      topListings: topListings.slice(0, 5),
      viewTrends,
      benchmarks: {
        avgViewsPerListing: benchmarkMap['avg_views_per_listing'] || 1203,
        avgSessionDuration: benchmarkMap['avg_session_duration'] || 45,
        avgLeadConversionRate: benchmarkMap['avg_lead_conversion_rate'] || 2.5,
        avgDownloadRate: benchmarkMap['avg_download_rate'] || 15
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Analytics dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to load analytics' },
      { status: 500 }
    )
  }
}
