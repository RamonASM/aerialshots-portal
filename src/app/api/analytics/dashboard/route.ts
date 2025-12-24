import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AnalyticsDashboardData, ViewTrend } from '@/lib/analytics/types'

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

    // Fetch analytics data using type assertions for tables not in generated types
    const [
      pageViewsResult,
      downloadsResult,
      leadsResult,
      benchmarksResult,
      listingsResult,
      viewTrendsResult
    ] = await Promise.all([
      // Page view metrics
      (supabase as any)
        .from('page_views')
        .select('*')
        .eq('agent_id', agent.id),

      // Download metrics
      (supabase as any)
        .from('media_downloads')
        .select('*')
        .eq('agent_id', agent.id),

      // Lead metrics
      (supabase as any)
        .from('lead_conversions')
        .select('*')
        .eq('agent_id', agent.id),

      // Market benchmarks
      (supabase as any)
        .from('market_benchmarks')
        .select('*'),

      // Agent's listings for top performers
      supabase
        .from('listings')
        .select('id, address')
        .eq('agent_id', agent.id)
        .neq('ops_status', 'cancelled')
        .limit(10),

      // View trends (last 30 days)
      (supabase as any)
        .from('page_views')
        .select('created_at, visitor_id')
        .eq('agent_id', agent.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ])

    const pageViews = pageViewsResult.data || []
    const downloads = downloadsResult.data || []
    const leads = leadsResult.data || []
    const benchmarks = benchmarksResult.data || []
    const listings = listingsResult.data || []
    const recentViews = viewTrendsResult.data || []

    // Calculate page view metrics
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const viewsLast7Days = pageViews.filter((v: any) =>
      new Date(v.created_at) > sevenDaysAgo
    ).length

    const viewsLast30Days = pageViews.filter((v: any) =>
      new Date(v.created_at) > thirtyDaysAgo
    ).length

    const uniqueVisitors = new Set(pageViews.map((v: any) => v.visitor_id)).size

    const durations = pageViews
      .filter((v: any) => v.duration_seconds)
      .map((v: any) => v.duration_seconds)
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
      : null

    const scrollDepths = pageViews
      .filter((v: any) => v.scroll_depth)
      .map((v: any) => v.scroll_depth)
    const avgScrollDepth = scrollDepths.length > 0
      ? Math.round(scrollDepths.reduce((a: number, b: number) => a + b, 0) / scrollDepths.length)
      : null

    // Device breakdown
    const devices = {
      mobile: pageViews.filter((v: any) => v.device_type === 'mobile').length,
      desktop: pageViews.filter((v: any) => v.device_type === 'desktop').length,
      tablet: pageViews.filter((v: any) => v.device_type === 'tablet').length,
      unknown: pageViews.filter((v: any) => v.device_type === 'unknown').length,
    }

    // Download metrics
    const downloadsLast30Days = downloads.filter((d: any) =>
      new Date(d.downloaded_at) > thirtyDaysAgo
    ).length

    const downloadsByType: Record<string, number> = {}
    downloads.forEach((d: any) => {
      downloadsByType[d.asset_type] = (downloadsByType[d.asset_type] || 0) + 1
    })

    // Lead metrics
    const leadsLast30Days = leads.filter((l: any) =>
      new Date(l.converted_at) > thirtyDaysAgo
    ).length

    const leadsByType: Record<string, number> = {}
    leads.forEach((l: any) => {
      leadsByType[l.conversion_type] = (leadsByType[l.conversion_type] || 0) + 1
    })

    const conversionRate = pageViews.length > 0
      ? (leads.length / pageViews.length) * 100
      : 0

    // Top referrers
    const referrerCounts: Record<string, number> = {}
    pageViews.forEach((v: any) => {
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
    recentViews.forEach((v: any) => {
      const date = new Date(v.created_at).toISOString().split('T')[0]
      if (!trendMap[date]) {
        trendMap[date] = { views: 0, visitors: new Set() }
      }
      trendMap[date].views++
      if (v.visitor_id) {
        trendMap[date].visitors.add(v.visitor_id)
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
      listings.map(async (listing: any) => {
        const { data: listingViews } = await (supabase as any)
          .from('page_views')
          .select('*')
          .eq('listing_id', listing.id)

        const { data: listingDownloads } = await (supabase as any)
          .from('media_downloads')
          .select('id')
          .eq('listing_id', listing.id)

        const { data: listingLeads } = await (supabase as any)
          .from('lead_conversions')
          .select('id')
          .eq('listing_id', listing.id)

        const views = listingViews || []
        const viewsLast7 = views.filter((v: any) =>
          new Date(v.created_at) > sevenDaysAgo
        ).length

        const uniqueListingVisitors = new Set(views.map((v: any) => v.visitor_id)).size
        const listingDurations = views
          .filter((v: any) => v.duration_seconds)
          .map((v: any) => v.duration_seconds)
        const avgListingDuration = listingDurations.length > 0
          ? Math.round(listingDurations.reduce((a: number, b: number) => a + b, 0) / listingDurations.length)
          : null

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
    benchmarks.forEach((b: any) => {
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
