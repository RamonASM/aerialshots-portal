'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Camera,
  Package,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RevenueStats {
  // Summary
  totalRevenue: number
  revenueThisMonth: number
  revenueLastMonth: number
  revenueGrowth: number

  // Breakdowns
  revenueByPhotographer: Array<{
    id: string
    name: string
    revenue: number
    jobs: number
    avgPerJob: number
  }>

  revenueByService: Array<{
    service: string
    revenue: number
    count: number
  }>

  revenueByMonth: Array<{
    month: string
    revenue: number
    jobs: number
  }>

  // Top Performers
  topAgents: Array<{
    id: string
    name: string
    company: string
    totalSpend: number
    orderCount: number
  }>

  // Metrics
  averageOrderValue: number
  averageJobsPerMonth: number
  projectedMonthlyRevenue: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export default function RevenueAnalyticsPage() {
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics/revenue?year=${year}`)

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate max values for charts
  const maxMonthlyRevenue = stats?.revenueByMonth?.length
    ? Math.max(...stats.revenueByMonth.map((m) => m.revenue))
    : 1

  const maxPhotographerRevenue = stats?.revenueByPhotographer?.length
    ? Math.max(...stats.revenueByPhotographer.map((p) => p.revenue))
    : 1

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (!stats) return

    const rows: string[][] = []

    // Summary section
    rows.push(['Revenue Report - ' + year])
    rows.push([])
    rows.push(['Summary Metrics'])
    rows.push(['Total Revenue', formatCurrency(stats.totalRevenue)])
    rows.push(['This Month', formatCurrency(stats.revenueThisMonth)])
    rows.push(['Last Month', formatCurrency(stats.revenueLastMonth)])
    rows.push(['Growth', formatPercent(stats.revenueGrowth)])
    rows.push(['Average Order Value', formatCurrency(stats.averageOrderValue)])
    rows.push(['Projected Monthly', formatCurrency(stats.projectedMonthlyRevenue)])
    rows.push([])

    // Monthly revenue
    rows.push(['Monthly Revenue'])
    rows.push(['Month', 'Revenue', 'Jobs'])
    stats.revenueByMonth.forEach(month => {
      rows.push([month.month, formatCurrency(month.revenue), String(month.jobs)])
    })
    rows.push([])

    // Revenue by photographer
    rows.push(['Revenue by Photographer'])
    rows.push(['Name', 'Revenue', 'Jobs', 'Avg Per Job'])
    stats.revenueByPhotographer.forEach(p => {
      rows.push([p.name, formatCurrency(p.revenue), String(p.jobs), formatCurrency(p.avgPerJob)])
    })
    rows.push([])

    // Revenue by service
    rows.push(['Revenue by Service'])
    rows.push(['Service', 'Revenue', 'Count'])
    stats.revenueByService.forEach(s => {
      rows.push([s.service, formatCurrency(s.revenue), String(s.count)])
    })
    rows.push([])

    // Top agents
    rows.push(['Top Spending Agents'])
    rows.push(['Name', 'Company', 'Total Spend', 'Order Count'])
    stats.topAgents.forEach(a => {
      rows.push([a.name, a.company || '', formatCurrency(a.totalSpend), String(a.orderCount)])
    })

    // Convert to CSV string
    const csv = rows.map(row =>
      row.map(cell =>
        // Escape quotes and wrap in quotes if contains comma
        cell.includes(',') || cell.includes('"')
          ? `"${cell.replace(/"/g, '""')}"`
          : cell
      ).join(',')
    ).join('\n')

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `revenue-report-${year}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [stats, year])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Revenue Analytics
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Financial performance and revenue tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {[2024, 2025].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!stats}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : stats ? (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Monthly Revenue</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(stats.revenueThisMonth)}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {stats.revenueGrowth >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatPercent(stats.revenueGrowth)}
                    </span>
                    <span className="text-sm text-neutral-500">vs last month</span>
                  </div>
                </div>
                <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">YTD Revenue</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Avg Order Value</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(stats.averageOrderValue)}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
                  <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Projected Monthly</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(stats.projectedMonthlyRevenue)}
                  </p>
                </div>
                <div className="rounded-lg bg-orange-100 p-2.5 dark:bg-orange-900/30">
                  <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Chart */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 font-semibold text-neutral-900 dark:text-white">
              Monthly Revenue Trend
            </h2>
            <div className="flex h-48 items-end gap-2">
              {stats.revenueByMonth.map((month) => {
                const height = maxMonthlyRevenue > 0
                  ? (month.revenue / maxMonthlyRevenue) * 100
                  : 0
                return (
                  <div
                    key={month.month}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div className="w-full text-center text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {formatCurrency(month.revenue)}
                    </div>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400 transition-all hover:from-blue-700 hover:to-blue-500"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${month.month}: ${formatCurrency(month.revenue)}`}
                    />
                    <div className="text-xs text-neutral-500">{month.month}</div>
                    <div className="text-xs text-neutral-400">{month.jobs} jobs</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue by Photographer */}
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <h2 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                  <Camera className="h-5 w-5 text-blue-500" />
                  Revenue by Photographer
                </h2>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stats.revenueByPhotographer.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500">
                    No photographer data available
                  </div>
                ) : (
                  stats.revenueByPhotographer.slice(0, 8).map((photographer, i) => (
                    <div
                      key={photographer.id}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {photographer.name}
                          </span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {formatCurrency(photographer.revenue)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{
                              width: `${(photographer.revenue / maxPhotographerRevenue) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {photographer.jobs} jobs • {formatCurrency(photographer.avgPerJob)} avg
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Spending Agents */}
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <h2 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                  <Users className="h-5 w-5 text-green-500" />
                  Top Spending Agents
                </h2>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stats.topAgents.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500">
                    No agent data available
                  </div>
                ) : (
                  stats.topAgents.slice(0, 8).map((agent, i) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {agent.name}
                            </span>
                            {agent.company && (
                              <span className="ml-2 text-sm text-neutral-500">
                                {agent.company}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(agent.totalSpend)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {agent.orderCount} orders •{' '}
                          {formatCurrency(agent.totalSpend / (agent.orderCount || 1))} avg
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Revenue by Service */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 font-semibold text-neutral-900 dark:text-white">
              Revenue by Service Type
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.revenueByService.map((service) => (
                <div
                  key={service.service}
                  className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800"
                >
                  <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    {service.service}
                  </div>
                  <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(service.revenue)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {service.count} orders
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <DollarSign className="mx-auto h-12 w-12 text-neutral-400" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900 dark:text-white">
            No revenue data available
          </h3>
          <p className="mt-2 text-neutral-500">
            Revenue data will appear as orders are processed.
          </p>
        </div>
      )}
    </div>
  )
}
