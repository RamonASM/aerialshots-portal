'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PriorityQueue } from '@/components/qc/PriorityQueue'
import { QCStats } from '@/components/qc/QCStats'
import { WorkloadChart } from '@/components/qc/WorkloadChart'
import { useRouter } from 'next/navigation'

interface QueueItem {
  id: string
  address: string
  city: string
  state: string
  ops_status: string
  is_rush: boolean
  hoursWaiting: number
  priorityLevel: 'high' | 'medium' | 'low'
  photographer?: {
    name: string
  }
}

interface Stats {
  readyForQC: number
  inProgress: number
  deliveredToday: number
  avgQCTimeMinutes: number
  photographerWorkload: Array<{
    id: string
    name: string
    jobCount: number
  }>
}

export default function QCLiveDashboard() {
  const router = useRouter()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [stats, setStats] = useState<Stats>({
    readyForQC: 0,
    inProgress: 0,
    deliveredToday: 0,
    avgQCTimeMinutes: 0,
    photographerWorkload: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedPhotographer, setSelectedPhotographer] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    try {
      const url = selectedPhotographer
        ? `/api/admin/qc/queue?photographer_id=${selectedPhotographer}`
        : '/api/admin/qc/queue'

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch queue')

      const data = await response.json()
      setQueue(data.queue)
    } catch (error) {
      console.error('Error fetching queue:', error)
    }
  }, [selectedPhotographer])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/qc/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const refreshData = async () => {
    setIsLoading(true)
    await Promise.all([fetchQueue(), fetchStats()])
    setLastRefresh(new Date())
    setIsLoading(false)
  }

  const handleApprove = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/qc/listings/${id}/approve`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to approve listing')

      // Refresh data after approval
      await refreshData()
    } catch (error) {
      console.error('Error approving listing:', error)
      alert('Failed to approve listing. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async (id: string) => {
    const notes = prompt('Enter revision notes (optional):')

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/qc/listings/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) throw new Error('Failed to reject listing')

      // Refresh data after rejection
      await refreshData()
    } catch (error) {
      console.error('Error rejecting listing:', error)
      alert('Failed to reject listing. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    refreshData()
  }, [])

  // Set up polling for real-time updates (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [selectedPhotographer])

  // Refetch queue when photographer filter changes
  useEffect(() => {
    fetchQueue()
  }, [selectedPhotographer, fetchQueue])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">QC Live Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {stats.photographerWorkload.length > 0 && (
            <select
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              value={selectedPhotographer || ''}
              onChange={(e) => setSelectedPhotographer(e.target.value || null)}
            >
              <option value="">All Photographers</option>
              {stats.photographerWorkload.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.jobCount})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stats */}
      <QCStats
        readyForQC={stats.readyForQC}
        inProgress={stats.inProgress}
        deliveredToday={stats.deliveredToday}
        avgQCTimeMinutes={stats.avgQCTimeMinutes}
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Priority Queue - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Priority Queue</h2>
            <p className="text-sm text-neutral-600">
              Sorted by priority score (rush jobs + waiting time)
            </p>
          </div>
          <PriorityQueue
            queue={queue}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={isLoading}
          />
        </div>

        {/* Photographer Workload - Takes 1 column */}
        <div>
          <WorkloadChart workload={stats.photographerWorkload} />
        </div>
      </div>
    </div>
  )
}
