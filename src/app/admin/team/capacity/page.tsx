'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart3,
  Users,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StaffMember {
  id: string
  name: string
  team_role: string | null
  max_daily_jobs: number
  is_active: boolean
  territories: Array<{ id: string; name: string }>
}

interface Territory {
  id: string
  name: string
  is_active: boolean
  assigned_staff: number
}

interface DayCapacity {
  date: string
  dayName: string
  totalCapacity: number
  bookedJobs: number
  availableSlots: number
  utilizationPercent: number
}

interface TerritoryCapacity {
  territory: Territory
  staffCount: number
  dailyCapacity: number
  weeklyCapacity: number
  currentWeekBooked: number
  utilizationPercent: number
}

export default function CapacityPlanningPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [dailyCapacity, setDailyCapacity] = useState<DayCapacity[]>([])
  const [territoryCapacity, setTerritoryCapacity] = useState<TerritoryCapacity[]>([])
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Calculate date range (next 30 days)
      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 30)

      const formatDate = (d: Date) => d.toISOString().split('T')[0]

      const [staffResponse, territoriesResponse, assignmentsResponse] = await Promise.all([
        fetch('/api/admin/team/staff'),
        fetch('/api/admin/team/territories'),
        fetch(
          `/api/admin/team/assignments?from=${formatDate(today)}&to=${formatDate(endDate)}`
        ),
      ])

      let staffData: StaffMember[] = []
      let territoriesData: Territory[] = []
      let assignmentsData: Array<{ scheduled_date: string; photographer_id: string }> = []

      if (staffResponse.ok) {
        const data = await staffResponse.json()
        staffData = (data.staff || []).filter(
          (s: StaffMember) =>
            s.is_active &&
            ['photographer', 'videographer'].includes(s.team_role || '')
        )
        setStaff(staffData)
      }

      if (territoriesResponse.ok) {
        const data = await territoriesResponse.json()
        territoriesData = (data.territories || []).filter((t: Territory) => t.is_active)
        setTerritories(territoriesData)
      }

      if (assignmentsResponse.ok) {
        const data = await assignmentsResponse.json()
        assignmentsData = data.assignments || []
      }

      // Count assignments per date
      const assignmentsByDate: Record<string, number> = {}
      for (const a of assignmentsData) {
        assignmentsByDate[a.scheduled_date] = (assignmentsByDate[a.scheduled_date] || 0) + 1
      }
      setAssignments(assignmentsByDate)

      // Calculate daily capacity for next 14 days
      const dailyData: DayCapacity[] = []
      const totalDailyCapacity = staffData.reduce(
        (sum, s) => sum + (s.max_daily_jobs || 6),
        0
      )

      for (let i = 0; i < 14; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        const dateStr = formatDate(date)
        const booked = assignmentsByDate[dateStr] || 0
        const available = Math.max(0, totalDailyCapacity - booked)

        dailyData.push({
          date: dateStr,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          totalCapacity: totalDailyCapacity,
          bookedJobs: booked,
          availableSlots: available,
          utilizationPercent: totalDailyCapacity > 0
            ? Math.round((booked / totalDailyCapacity) * 100)
            : 0,
        })
      }
      setDailyCapacity(dailyData)

      // Calculate territory capacity
      const territoryData: TerritoryCapacity[] = territoriesData.map((territory) => {
        // Find staff assigned to this territory
        const assignedStaff = staffData.filter((s) =>
          s.territories?.some((t) => t.id === territory.id)
        )
        const staffCount = assignedStaff.length
        const dailyCap = assignedStaff.reduce((sum, s) => sum + (s.max_daily_jobs || 6), 0)
        const weeklyCap = dailyCap * 7

        // For simplicity, just estimate based on staff ratio
        const staffRatio = staffCount / (staffData.length || 1)
        const estimatedBooked = Math.round(
          Object.values(assignmentsByDate).reduce((sum, v) => sum + v, 0) * staffRatio
        )

        return {
          territory,
          staffCount,
          dailyCapacity: dailyCap,
          weeklyCapacity: weeklyCap,
          currentWeekBooked: estimatedBooked,
          utilizationPercent: weeklyCap > 0
            ? Math.round((estimatedBooked / weeklyCap) * 100)
            : 0,
        }
      })
      setTerritoryCapacity(territoryData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate summary stats
  const totalWeeklyCapacity = staff.reduce((sum, s) => sum + (s.max_daily_jobs || 6) * 7, 0)
  const totalBookedNext7Days = dailyCapacity
    .slice(0, 7)
    .reduce((sum, d) => sum + d.bookedJobs, 0)
  const overallUtilization = totalWeeklyCapacity > 0
    ? Math.round((totalBookedNext7Days / totalWeeklyCapacity) * 100)
    : 0

  // Find days at risk (>80% capacity)
  const daysAtRisk = dailyCapacity.filter((d) => d.utilizationPercent >= 80).length

  // Find territories needing staff
  const territoriesNeedingStaff = territoryCapacity.filter(
    (t) => t.staffCount === 0 || t.utilizationPercent >= 90
  )

  const getUtilizationColor = (percent: number): string => {
    if (percent < 50) return 'bg-green-500'
    if (percent < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getUtilizationBgColor = (percent: number): string => {
    if (percent < 50) return 'bg-green-100 dark:bg-green-900/30'
    if (percent < 80) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Capacity Planning
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            30-day forward capacity analysis and recommendations
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="mr-2 h-4 w-4" />
          )}
          Refresh Data
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Active Team</div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {staff.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
                  <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Weekly Capacity</div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {totalWeeklyCapacity} jobs
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${getUtilizationBgColor(overallUtilization)}`}>
                  <BarChart3
                    className={`h-5 w-5 ${
                      overallUtilization < 50
                        ? 'text-green-600 dark:text-green-400'
                        : overallUtilization < 80
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">7-Day Utilization</div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {overallUtilization}%
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2.5 ${
                    daysAtRisk > 0
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}
                >
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      daysAtRisk > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Days at Risk</div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {daysAtRisk}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(daysAtRisk > 0 || territoriesNeedingStaff.length > 0) && (
            <div className="space-y-3">
              {daysAtRisk > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-900/20">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <span className="font-medium text-red-800 dark:text-red-200">
                      Capacity Alert:
                    </span>{' '}
                    <span className="text-red-700 dark:text-red-300">
                      {daysAtRisk} day{daysAtRisk > 1 ? 's' : ''} in the next 2 weeks are at or
                      near full capacity. Consider adding team members or limiting bookings.
                    </span>
                  </div>
                </div>
              )}
              {territoriesNeedingStaff.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-900 dark:bg-yellow-900/20">
                  <MapPin className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <div className="flex-1">
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">
                      Staffing Needed:
                    </span>{' '}
                    <span className="text-yellow-700 dark:text-yellow-300">
                      {territoriesNeedingStaff.map((t) => t.territory.name).join(', ')}{' '}
                      {territoriesNeedingStaff.length === 1 ? 'needs' : 'need'} additional coverage.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Daily Capacity Chart */}
          <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                14-Day Capacity Forecast
              </h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
                {dailyCapacity.map((day) => (
                  <div key={day.date} className="text-center">
                    <div className="text-xs text-neutral-500">{day.dayName}</div>
                    <div className="text-xs text-neutral-400">
                      {new Date(day.date).getDate()}
                    </div>
                    <div className="mt-2">
                      <div className="mx-auto h-24 w-6 rounded-t-sm bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
                        <div
                          className={`absolute bottom-0 left-0 right-0 transition-all ${getUtilizationColor(
                            day.utilizationPercent
                          )}`}
                          style={{ height: `${Math.min(100, day.utilizationPercent)}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {day.bookedJobs}/{day.totalCapacity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Territory Capacity */}
          <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Capacity by Territory
              </h2>
            </div>
            {territoryCapacity.length === 0 ? (
              <div className="p-8 text-center">
                <MapPin className="mx-auto h-12 w-12 text-neutral-400" />
                <p className="mt-4 text-neutral-500">
                  No territories defined. Create territories to see regional capacity.
                </p>
                <Button variant="outline" className="mt-4" asChild>
                  <a href="/admin/team/territories">
                    Manage Territories
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {territoryCapacity.map((tc) => (
                  <div
                    key={tc.territory.id}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`rounded-lg p-2 ${getUtilizationBgColor(
                          tc.utilizationPercent
                        )}`}
                      >
                        <MapPin
                          className={`h-5 w-5 ${
                            tc.utilizationPercent < 50
                              ? 'text-green-600 dark:text-green-400'
                              : tc.utilizationPercent < 80
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {tc.territory.name}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {tc.staffCount} photographer{tc.staffCount !== 1 ? 's' : ''} •{' '}
                          {tc.dailyCapacity} jobs/day capacity
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold ${
                          tc.utilizationPercent < 50
                            ? 'text-green-600 dark:text-green-400'
                            : tc.utilizationPercent < 80
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {tc.utilizationPercent}%
                      </div>
                      <div className="text-sm text-neutral-500">utilization</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team List */}
          <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Team Capacity Details
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                    <th className="px-5 py-3 text-left text-sm font-medium text-neutral-500">
                      Name
                    </th>
                    <th className="px-5 py-3 text-left text-sm font-medium text-neutral-500">
                      Role
                    </th>
                    <th className="px-5 py-3 text-left text-sm font-medium text-neutral-500">
                      Territories
                    </th>
                    <th className="px-5 py-3 text-center text-sm font-medium text-neutral-500">
                      Daily Max
                    </th>
                    <th className="px-5 py-3 text-center text-sm font-medium text-neutral-500">
                      Weekly Capacity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {staff.map((member) => (
                    <tr key={member.id}>
                      <td className="px-5 py-4">
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {member.name}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-neutral-600 dark:text-neutral-400">
                        {member.team_role || 'Staff'}
                      </td>
                      <td className="px-5 py-4">
                        {member.territories?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {member.territories.map((t) => (
                              <span
                                key={t.id}
                                className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400">No territories</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-neutral-900 dark:text-white">
                        {member.max_daily_jobs || 6}
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-neutral-900 dark:text-white">
                        {(member.max_daily_jobs || 6) * 7}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
