/**
 * Analytics Report Types
 *
 * Type definitions for revenue, client, and operational reports.
 */

// ============================================
// TIME PERIOD TYPES
// ============================================

export type TimePeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom'

export interface DateRange {
  start: string // ISO date
  end: string   // ISO date
}

// ============================================
// REVENUE REPORTS
// ============================================

export interface RevenueByPhotographer {
  photographer_id: string
  photographer_name: string
  photographer_email: string
  team_role: string
  total_revenue_cents: number
  total_revenue: number // Formatted dollars
  order_count: number
  job_count: number
  avg_order_value: number
  avg_revenue_per_job: number
  // Period comparisons
  period_revenue_cents: number
  previous_period_revenue_cents: number
  revenue_change_percent: number
  // Breakdown
  revenue_by_package: Record<string, number>
  revenue_by_service: Record<string, number>
}

export interface RevenueByTerritory {
  territory: string // City, State, or custom region
  total_revenue_cents: number
  total_revenue: number
  order_count: number
  unique_agents: number
  avg_order_value: number
  top_photographer: {
    id: string
    name: string
    revenue: number
  } | null
}

export interface RevenueByPackage {
  package_key: string
  package_name: string
  total_revenue_cents: number
  total_revenue: number
  order_count: number
  avg_order_value: number
  percent_of_total: number
}

export interface RevenueByService {
  service_name: string
  service_key: string
  total_revenue_cents: number
  total_revenue: number
  order_count: number
  avg_price: number
  most_common_with: string[] // Other services commonly bundled
}

export interface RevenueSummary {
  total_revenue_cents: number
  total_revenue: number
  order_count: number
  avg_order_value: number
  unique_agents: number
  unique_photographers: number
  // Period comparisons
  previous_period_revenue_cents: number
  revenue_change_percent: number
  // Projections
  projected_monthly_revenue: number
  ytd_revenue: number
}

export interface RevenueReport {
  summary: RevenueSummary
  by_photographer: RevenueByPhotographer[]
  by_territory: RevenueByTerritory[]
  by_package: RevenueByPackage[]
  by_service: RevenueByService[]
  monthly_trend: MonthlyRevenue[]
  daily_trend: DailyRevenue[]
  period: DateRange
  generated_at: string
}

export interface MonthlyRevenue {
  month: string // YYYY-MM
  month_name: string // "January 2024"
  revenue_cents: number
  revenue: number
  order_count: number
  unique_agents: number
}

export interface DailyRevenue {
  date: string // YYYY-MM-DD
  revenue_cents: number
  revenue: number
  order_count: number
}

// ============================================
// CLIENT REPORTS
// ============================================

export interface TopClient {
  agent_id: string
  agent_name: string
  agent_email: string
  agent_phone: string | null
  company: string | null
  // Financials
  total_revenue_cents: number
  total_revenue: number
  lifetime_revenue_cents: number
  lifetime_revenue: number
  order_count: number
  avg_order_value: number
  // Activity
  first_order_date: string
  last_order_date: string
  days_since_last_order: number
  orders_last_30_days: number
  orders_last_90_days: number
  // Engagement
  referral_tier: string
  credit_balance: number
  total_referrals: number
  // Trends
  revenue_trend: 'up' | 'down' | 'stable'
  revenue_change_percent: number
}

export interface ClientSegment {
  segment_name: string
  description: string
  agent_count: number
  total_revenue_cents: number
  avg_order_value: number
  criteria: ClientSegmentCriteria
}

export interface ClientSegmentCriteria {
  min_orders?: number
  max_orders?: number
  min_revenue?: number
  max_revenue?: number
  days_since_last_order_min?: number
  days_since_last_order_max?: number
  referral_tiers?: string[]
}

export interface TopClientsReport {
  top_by_revenue: TopClient[]
  top_by_frequency: TopClient[]
  top_by_avg_order: TopClient[]
  new_clients: TopClient[] // First order in period
  growing_clients: TopClient[] // Increased spending
  declining_clients: TopClient[] // Decreased spending
  segments: ClientSegment[]
  period: DateRange
  generated_at: string
}

// ============================================
// INACTIVE CLIENT ALERTS
// ============================================

export type InactiveReason =
  | 'no_orders_30_days'
  | 'no_orders_60_days'
  | 'no_orders_90_days'
  | 'declining_orders'
  | 'cancelled_last_order'
  | 'payment_issues'

export interface InactiveClient {
  agent_id: string
  agent_name: string
  agent_email: string
  agent_phone: string | null
  company: string | null
  // History
  total_orders: number
  total_revenue_cents: number
  total_revenue: number
  avg_order_value: number
  first_order_date: string
  last_order_date: string
  days_since_last_order: number
  // Alert info
  inactive_reason: InactiveReason
  alert_priority: 'low' | 'medium' | 'high' | 'critical'
  estimated_lost_revenue: number // Based on historical avg
  // Reactivation
  last_contacted_at: string | null
  contact_attempts: number
  recommended_action: string
}

export interface InactiveClientAlert {
  alert_id: string
  agent: InactiveClient
  created_at: string
  status: 'new' | 'acknowledged' | 'contacted' | 'reactivated' | 'churned'
  assigned_to: string | null
  notes: string[]
}

export interface InactiveClientsReport {
  summary: {
    total_inactive: number
    high_priority_count: number
    estimated_lost_revenue_monthly: number
    reactivation_rate_30_days: number
  }
  alerts: InactiveClientAlert[]
  by_reason: Record<InactiveReason, number>
  by_priority: Record<string, number>
  period: DateRange
  generated_at: string
}

// ============================================
// PHOTOGRAPHER PERFORMANCE
// ============================================

export interface PhotographerPerformance {
  photographer_id: string
  photographer_name: string
  photographer_email: string
  team_role: string
  // Volume
  jobs_completed: number
  jobs_scheduled: number
  jobs_cancelled: number
  completion_rate: number
  // Quality
  avg_rating: number | null
  rating_count: number
  edit_request_rate: number
  // Revenue
  revenue_generated: number
  avg_job_value: number
  // Efficiency
  avg_shoot_duration_minutes: number
  avg_delivery_time_hours: number
  on_time_delivery_rate: number
  // Territory
  primary_territory: string
  territories_served: string[]
  avg_drive_distance_miles: number
}

export interface PhotographerLeaderboard {
  by_revenue: PhotographerPerformance[]
  by_volume: PhotographerPerformance[]
  by_rating: PhotographerPerformance[]
  by_efficiency: PhotographerPerformance[]
  period: DateRange
  generated_at: string
}

// ============================================
// REPORT REQUEST/RESPONSE
// ============================================

export interface ReportRequest {
  report_type: 'revenue' | 'clients' | 'inactive' | 'photographer' | 'custom'
  period: TimePeriod
  custom_range?: DateRange
  filters?: ReportFilters
  group_by?: string[]
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  limit?: number
}

export interface ReportFilters {
  photographer_ids?: string[]
  agent_ids?: string[]
  package_keys?: string[]
  territories?: string[]
  min_revenue?: number
  max_revenue?: number
  payment_status?: string[]
}

export interface ReportResponse<T> {
  success: boolean
  data: T
  meta: {
    generated_at: string
    period: DateRange
    filters_applied: ReportFilters
    total_records: number
    cached: boolean
    cache_expires_at?: string
  }
}
