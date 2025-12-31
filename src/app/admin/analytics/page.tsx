'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Camera,
  DollarSign,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalListings: number
    activeAgents: number
    totalStaff: number
    deliveredThisMonth: number
    deliveredLastMonth: number
    deliveredThisWeek: number
    deliveredToday: number
    deliveryChange: number
    revenueThisMonth: number
    revenueLastMonth: number
    revenueChange: number
  }
  jobsByStatus: Record<string, number>
  teamPerformance: Array<{
    id: string
    name: string
    total: number
    delivered: number
    inProgress: number
    completionRate: number
  }>
  topAgents: Array<{
    id: string
    name: string
    company: string
    orderCount: number
  }>
  dailyDeliveries: Array<{
    date: string
    count: number
  }>
  integrationStats: {
    cubicasa: { total: number; delivered: number; failed: number }
    zillow_3d: { total: number; delivered: number; failed: number }
  }
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  subtitle,
}: {
  title: string
  value: string | number
  change?: number
  icon: React.ComponentType<{ className?: string }>
  subtitle?: string
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
          <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">
          {typeof value === 'number' && title.toLowerCase().includes('revenue')
            ? `$${value.toLocaleString()}`
            : value.toLocaleString()}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{title}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function SimpleBarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-20 truncate text-sm text-neutral-600 dark:text-neutral-400">
            {item.label}
          </div>
          <div className="flex-1">
            <div className="h-6 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="w-12 text-right text-sm font-medium text-neutral-900 dark:text-white">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function DailyChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((day, i) => {
        const height = (day.count / maxCount) * 100
        const date = new Date(day.date)
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)

        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-blue-500 transition-all duration-300 hover:bg-blue-600"
              style={{ height: `${Math.max(height, 4)}%` }}
              title={`${day.date}: ${day.count} deliveries`}
            />
            <span className="text-[10px] text-neutral-400">{dayLabel}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchAnalytics() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/analytics')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-neutral-600 dark:text-neutral-400">{error || 'Failed to load analytics'}</p>
        <button
          onClick={fetchAnalytics}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const statusLabels: Record<string, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    uploading: 'Uploading',
    editing: 'Editing',
    staged: 'Staged',
    ready_for_qc: 'Ready for QC',
    in_qc: 'In QC',
    delivered: 'Delivered',
  }

  const statusData = Object.entries(data.jobsByStatus)
    .map(([status, count]) => ({
      label: statusLabels[status] || status,
      value: count,
    }))
    .sort((a, b) => b.value - a.value)

  const maxStatusCount = Math.max(...statusData.map(s => s.value), 1)

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Analytics</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Business performance metrics and insights
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Delivered This Month"
          value={data.overview.deliveredThisMonth}
          change={data.overview.deliveryChange}
          icon={Package}
          subtitle={`${data.overview.deliveredLastMonth} last month`}
        />
        <StatCard
          title="Revenue This Month"
          value={data.overview.revenueThisMonth}
          change={data.overview.revenueChange}
          icon={DollarSign}
          subtitle={`$${data.overview.revenueLastMonth.toLocaleString()} last month`}
        />
        <StatCard
          title="Active Agents"
          value={data.overview.activeAgents}
          icon={Users}
        />
        <StatCard
          title="Total Jobs"
          value={data.overview.totalListings}
          icon={Camera}
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.overview.deliveredToday}
              </p>
              <p className="text-sm text-neutral-500">Delivered Today</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.overview.deliveredThisWeek}
              </p>
              <p className="text-sm text-neutral-500">Delivered This Week</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.overview.totalStaff}
              </p>
              <p className="text-sm text-neutral-500">Team Members</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Deliveries Chart */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Daily Deliveries (14 days)
          </h3>
          <DailyChart data={data.dailyDeliveries} />
        </div>

        {/* Jobs by Status */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Jobs by Status
          </h3>
          <SimpleBarChart data={statusData} maxValue={maxStatusCount} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Performance */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <Camera className="h-5 w-5 text-blue-500" />
            Photographer Performance (30 days)
          </h3>
          {data.teamPerformance.length === 0 ? (
            <p className="text-center text-neutral-500 dark:text-neutral-400">
              No data available
            </p>
          ) : (
            <div className="space-y-4">
              {data.teamPerformance.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800"
                >
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{member.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {member.delivered} delivered / {member.total} total
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">
                      {member.completionRate}%
                    </p>
                    <p className="text-xs text-neutral-400">completion</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Agents */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <Users className="h-5 w-5 text-blue-500" />
            Top Agents (30 days)
          </h3>
          {data.topAgents.length === 0 ? (
            <p className="text-center text-neutral-500 dark:text-neutral-400">
              No data available
            </p>
          ) : (
            <div className="space-y-3">
              {data.topAgents.slice(0, 5).map((agent, i) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-white">{agent.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{agent.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">
                      {agent.orderCount}
                    </p>
                    <p className="text-xs text-neutral-400">orders</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Integration Stats */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
          <Clock className="h-5 w-5 text-blue-500" />
          Integration Performance (30 days)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { name: 'Cubicasa', ...data.integrationStats.cubicasa },
            { name: 'Zillow 3D', ...data.integrationStats.zillow_3d },
          ].map((integration) => {
            const successRate = integration.total > 0
              ? Math.round((integration.delivered / integration.total) * 100)
              : 0

            return (
              <div
                key={integration.name}
                className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {integration.name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      successRate >= 90
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : successRate >= 70
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {successRate}% success
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {integration.total} total
                  </span>
                  <span className="text-green-600 dark:text-green-400">
                    {integration.delivered} delivered
                  </span>
                  {integration.failed > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      {integration.failed} failed
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
