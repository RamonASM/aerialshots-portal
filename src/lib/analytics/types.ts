// Analytics Types

export interface PageViewMetrics {
  totalViews: number
  uniqueVisitors: number
  viewsLast7Days: number
  viewsLast30Days: number
  avgDurationSeconds: number | null
  avgScrollDepth: number | null
}

export interface DeviceBreakdown {
  mobile: number
  desktop: number
  tablet: number
  unknown: number
}

export interface DownloadMetrics {
  totalDownloads: number
  downloadsLast30Days: number
  byAssetType: Record<string, number>
}

export interface LeadMetrics {
  totalLeads: number
  leadsLast30Days: number
  conversionRate: number
  byType: Record<string, number>
}

export interface TopReferrer {
  source: string
  count: number
}

export interface ListingAnalytics {
  listingId: string
  address: string
  totalViews: number
  viewsLast7Days: number
  uniqueVisitors: number
  avgDuration: number | null
  downloads: number
  leads: number
}

export interface AgentAnalyticsSummary {
  agentId: string
  agentName: string
  pageViews: PageViewMetrics
  devices: DeviceBreakdown
  downloads: DownloadMetrics
  leads: LeadMetrics
  topReferrers: TopReferrer[]
  activeListings: number
  topListings: ListingAnalytics[]
  benchmarks: {
    avgViewsPerListing: number
    avgSessionDuration: number
    avgLeadConversionRate: number
    avgDownloadRate: number
  }
}

export interface ViewTrend {
  date: string
  views: number
  uniqueVisitors: number
}

export interface AnalyticsDashboardData extends AgentAnalyticsSummary {
  viewTrends: ViewTrend[]
}
