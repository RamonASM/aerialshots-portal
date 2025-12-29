'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MapPin,
  Loader2,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CityData {
  city: string
  state: string
  count: number
  revenue: number
  lat?: number
  lng?: number
}

interface ZipData {
  zip: string
  city: string
  count: number
}

interface GeographicStats {
  topCities: CityData[]
  topZips: ZipData[]
  totalLocations: number
  averagePerCity: number
}

const PERIODS = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '365d', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function GeographicAnalyticsPage() {
  const [stats, setStats] = useState<GeographicStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('90d')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics/geographic?period=${period}`)

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching geographic data:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate max values for bar widths
  const maxCityCount = stats?.topCities?.length
    ? Math.max(...stats.topCities.map((c) => c.count))
    : 1

  const maxZipCount = stats?.topZips?.length
    ? Math.max(...stats.topZips.map((z) => z.count))
    : 1

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Geographic Analytics
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Order distribution by location
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
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
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Cities Served</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {stats.topCities.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
                  <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Total Jobs</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {stats.totalLocations}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Avg per City</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {stats.averagePerCity.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2.5 dark:bg-orange-900/30">
                  <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Top City Revenue</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {stats.topCities[0]
                      ? formatCurrency(stats.topCities[0].revenue)
                      : '$0'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Cities */}
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <h2 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  Top Cities by Orders
                </h2>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stats.topCities.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500">
                    No location data available
                  </div>
                ) : (
                  stats.topCities.slice(0, 10).map((city, i) => (
                    <div
                      key={`${city.city}-${city.state}`}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {city.city}, {city.state}
                          </span>
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            {city.count} jobs
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{
                              width: `${(city.count / maxCityCount) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {formatCurrency(city.revenue)} revenue
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top ZIP Codes */}
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <h2 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  Top ZIP Codes
                </h2>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stats.topZips.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500">
                    No ZIP code data available
                  </div>
                ) : (
                  stats.topZips.slice(0, 10).map((zip, i) => (
                    <div key={zip.zip} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {zip.zip}
                            </span>
                            <span className="ml-2 text-sm text-neutral-500">
                              {zip.city}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            {zip.count} jobs
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className="h-2 rounded-full bg-green-500"
                            style={{
                              width: `${(zip.count / maxZipCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* City Distribution Visual */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 font-semibold text-neutral-900 dark:text-white">
              Order Distribution
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.topCities.map((city) => {
                const size = Math.max(
                  24,
                  Math.min(80, (city.count / maxCityCount) * 80 + 24)
                )
                const hue = 210 + (city.count / maxCityCount) * 40 // Blue spectrum

                return (
                  <div
                    key={`${city.city}-${city.state}`}
                    className="flex items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: `hsl(${hue}, 70%, 50%)`,
                      fontSize: Math.max(10, size / 5),
                    }}
                    title={`${city.city}: ${city.count} jobs`}
                  >
                    {city.count}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-400" />
                <span>Fewer orders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-600" />
                <span>More orders</span>
              </div>
            </div>
          </div>

          {/* Service Area Recommendations */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 font-semibold text-neutral-900 dark:text-white">
              Service Area Insights
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-800 dark:text-green-300">
                    High Demand
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {stats.topCities.slice(0, 3).map((city) => (
                    <div
                      key={`${city.city}-${city.state}`}
                      className="text-sm text-green-700 dark:text-green-400"
                    >
                      {city.city} ({city.count} jobs)
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-800 dark:text-blue-300">
                    Steady Markets
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {stats.topCities.slice(3, 6).map((city) => (
                    <div
                      key={`${city.city}-${city.state}`}
                      className="text-sm text-blue-700 dark:text-blue-400"
                    >
                      {city.city} ({city.count} jobs)
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-purple-800 dark:text-purple-300">
                    Growth Opportunities
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {stats.topCities.slice(6, 9).map((city) => (
                    <div
                      key={`${city.city}-${city.state}`}
                      className="text-sm text-purple-700 dark:text-purple-400"
                    >
                      {city.city} ({city.count} jobs)
                    </div>
                  ))}
                  {stats.topCities.length <= 6 && (
                    <div className="text-sm text-purple-600 dark:text-purple-400">
                      Expand to new areas
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <MapPin className="mx-auto h-12 w-12 text-neutral-400" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900 dark:text-white">
            No geographic data available
          </h3>
          <p className="mt-2 text-neutral-500">
            Start processing orders to see geographic analytics.
          </p>
        </div>
      )}
    </div>
  )
}
