'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity,
  Clock,
  TrendingUp,
  Users,
  Camera,
  Package,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

interface RealtimeMetrics {
  ordersToday: number
  ordersTodayChange: number
  revenueToday: number
  revenueTodayChange: number
  activeShoots: number
  pendingQC: number
  leadsToday: number
  leadsTodayChange: number
  avgQCTime: number
  avgDeliveryTime: number
  lastUpdated: string
}

interface ActiveJob {
  id: string
  address: string
  city: string
  status: string
  photographer: string
  startedAt: string
  estimatedCompletion: string
}

interface RecentActivity {
  id: string
  type: 'order' | 'delivery' | 'lead' | 'qc' | 'shoot'
  message: string
  timestamp: string
  metadata?: Record<string, string>
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  format = 'number',
  color = 'blue',
}: {
  label: string
  value: number
  change?: number
  icon: React.ComponentType<{ className?: string }>
  format?: 'number' | 'currency' | 'time'
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}) {
  const formatValue = () => {
    if (format === 'currency') {
      return `$${value.toLocaleString()}`
    }
    if (format === 'time') {
      const hours = Math.floor(value / 60)
      const mins = value % 60
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    }
    return value.toLocaleString()
  }

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500',
    red: 'bg-red-500/10 text-red-500',
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-5">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2.5 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-sm font-medium ${
              change >= 0 ? 'text-green-400' : 'text-red-400'
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
        <p className="text-2xl font-bold text-white">{formatValue()}</p>
        <p className="text-sm text-[#8e8e93]">{label}</p>
      </div>
    </div>
  )
}

function ActivityFeed({ activities }: { activities: RecentActivity[] }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-4 w-4 text-blue-400" />
      case 'delivery':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'lead':
        return <Users className="h-4 w-4 text-purple-400" />
      case 'qc':
        return <Activity className="h-4 w-4 text-orange-400" />
      case 'shoot':
        return <Camera className="h-4 w-4 text-cyan-400" />
      default:
        return <Zap className="h-4 w-4 text-[#8e8e93]" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="divide-y divide-white/[0.08]">
      {activities.length === 0 ? (
        <div className="py-8 text-center text-[#8e8e93]">
          No recent activity
        </div>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 py-3">
            <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{activity.message}</p>
              <p className="text-xs text-[#8e8e93]">{formatTime(activity.timestamp)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function ActiveJobCard({ job }: { job: ActiveJob }) {
  const statusColors: Record<string, string> = {
    shooting: 'bg-green-500/20 text-green-400',
    uploading: 'bg-blue-500/20 text-blue-400',
    editing: 'bg-purple-500/20 text-purple-400',
    in_qc: 'bg-orange-500/20 text-orange-400',
  }

  return (
    <div className="rounded-lg bg-[#0a0a0a] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-white">{job.address}</p>
          <p className="text-sm text-[#8e8e93]">{job.city}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[job.status] || 'bg-[#8e8e93]/20 text-[#8e8e93]'}`}>
          {job.status.replace('_', ' ')}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-[#8e8e93]">
        <span className="flex items-center gap-1">
          <Camera className="h-3 w-3" />
          {job.photographer}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Est. {job.estimatedCompletion}
        </span>
      </div>
    </div>
  )
}

export default function RealtimeAnalyticsPage() {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics/realtime')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
        setActivities(data.activities || [])
        setActiveJobs(data.activeJobs || [])
      }
    } catch (error) {
      console.error('Error fetching realtime data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Auto-refresh every 30 seconds when live
    let interval: NodeJS.Timeout | null = null
    if (isLive) {
      interval = setInterval(fetchData, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [fetchData, isLive])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#8e8e93]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-500" />
            Real-Time Dashboard
          </h1>
          <p className="text-[#8e8e93]">
            Live business activity and metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isLive
                ? 'bg-green-500/20 text-green-400'
                : 'bg-[#1c1c1e] text-[#8e8e93]'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-[#8e8e93]'}`} />
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#1c1c1e] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c2c2e] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Last Updated */}
      {metrics?.lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-[#8e8e93]">
          <Clock className="h-4 w-4" />
          Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Orders Today"
          value={metrics?.ordersToday || 0}
          change={metrics?.ordersTodayChange}
          icon={Package}
          color="blue"
        />
        <MetricCard
          label="Revenue Today"
          value={metrics?.revenueToday || 0}
          change={metrics?.revenueTodayChange}
          icon={TrendingUp}
          format="currency"
          color="green"
        />
        <MetricCard
          label="Active Shoots"
          value={metrics?.activeShoots || 0}
          icon={Camera}
          color="purple"
        />
        <MetricCard
          label="Pending QC"
          value={metrics?.pendingQC || 0}
          icon={CheckCircle}
          color="orange"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Leads Today"
          value={metrics?.leadsToday || 0}
          change={metrics?.leadsTodayChange}
          icon={Users}
          color="purple"
        />
        <MetricCard
          label="Avg QC Time"
          value={metrics?.avgQCTime || 0}
          icon={Clock}
          format="time"
          color="orange"
        />
        <MetricCard
          label="Avg Delivery Time"
          value={metrics?.avgDeliveryTime || 0}
          icon={Zap}
          format="time"
          color="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Jobs */}
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e]">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-400" />
              Active Jobs
            </h2>
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
              {activeJobs.length} active
            </span>
          </div>
          <div className="p-4 space-y-3">
            {activeJobs.length === 0 ? (
              <div className="py-8 text-center text-[#8e8e93]">
                No active jobs
              </div>
            ) : (
              activeJobs.slice(0, 5).map((job) => (
                <ActiveJobCard key={job.id} job={job} />
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e]">
          <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              Recent Activity
            </h2>
            <span className="text-xs text-[#8e8e93]">
              Last 24 hours
            </span>
          </div>
          <div className="p-4 max-h-[400px] overflow-y-auto">
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <h2 className="mb-4 font-semibold text-white">System Status</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { name: 'API', status: 'operational' },
            { name: 'Storage', status: 'operational' },
            { name: 'Integrations', status: 'operational' },
            { name: 'Notifications', status: 'operational' },
          ].map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-lg bg-[#0a0a0a] p-3"
            >
              <span className="text-sm text-white">{service.name}</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-400">Operational</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
