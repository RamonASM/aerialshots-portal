'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Camera,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Package,
  RefreshCw,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Calendar,
} from 'lucide-react'

interface TeamData {
  overview: {
    totalStaff: number
    photographers: number
    qcStaff: number
    totalDelivered: number
    totalAssigned: number
    avgCompletionRate: number
    avgDeliveryDays: number | null
  }
  photographers: Array<{
    id: string
    name: string
    email: string
    role: string
    stats: {
      assigned: number
      delivered: number
      inProgress: number
      completionRate: number
      avgDeliveryDays: number | null
      thisWeek: number
      lastWeek: number
      weeklyChange: number
    }
  }>
  qcTeam: Array<{
    id: string
    name: string
    email: string
    role: string
    stats: {
      approved: number
      rejected: number
      thisWeek: number
      totalReviewed: number
    }
  }>
}

export default function TeamAnalyticsPage() {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/analytics/team')
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <p className="text-neutral-500">Failed to load team analytics</p>
        <button
          onClick={fetchData}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link
              href="/admin/analytics"
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Analytics
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Team Performance
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Last 30 days team metrics and efficiency
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.overview.totalStaff}
              </p>
              <p className="text-sm text-neutral-500">Total Staff</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.overview.totalDelivered}
              </p>
              <p className="text-sm text-neutral-500">Jobs Delivered</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.overview.avgCompletionRate}%
              </p>
              <p className="text-sm text-neutral-500">Avg Completion</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/30">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.overview.avgDeliveryDays ?? '-'}
              </p>
              <p className="text-sm text-neutral-500">Avg Days to Deliver</p>
            </div>
          </div>
        </div>
      </div>

      {/* Photographers Section */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <Camera className="h-5 w-5 text-blue-500" />
            Photographers ({data.overview.photographers})
          </h2>
        </div>

        {data.photographers.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            No photographer data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Photographer
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Assigned
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Delivered
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    In Progress
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Completion
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Avg Days
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    This Week
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {data.photographers.map((p, i) => (
                  <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {i === 0 && (
                          <Award className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {p.name}
                          </p>
                          <p className="text-sm text-neutral-500">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {p.stats.assigned}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {p.stats.delivered}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-orange-600 dark:text-orange-400">
                        {p.stats.inProgress}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          p.stats.completionRate >= 90
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : p.stats.completionRate >= 70
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {p.stats.completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-600 dark:text-neutral-400">
                      {p.stats.avgDeliveryDays ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {p.stats.thisWeek}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.stats.weeklyChange !== 0 ? (
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-medium ${
                            p.stats.weeklyChange > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {p.stats.weeklyChange > 0 ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          {Math.abs(p.stats.weeklyChange)}%
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QC Team Section */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <ClipboardCheck className="h-5 w-5 text-purple-500" />
            QC & Editing Team ({data.overview.qcStaff})
          </h2>
        </div>

        {data.qcTeam.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            No QC data available
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.qcTeam.map((member, i) => (
              <div
                key={member.id}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {i === 0 && <Award className="h-5 w-5 text-yellow-500" />}
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {member.name}
                      </p>
                      <p className="text-xs text-neutral-500 capitalize">{member.role}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {member.stats.approved}
                    </p>
                    <p className="text-xs text-neutral-500">Approved</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {member.stats.thisWeek}
                    </p>
                    <p className="text-xs text-neutral-500">This Week</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
