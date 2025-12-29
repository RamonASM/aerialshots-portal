'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { UserPlus, ArrowRight, Download, RefreshCw } from 'lucide-react'
import { BulkActionsBar } from '@/components/admin/BulkActionsBar'

interface Job {
  id: string
  address: string
  city: string | null
  state: string | null
  ops_status: string | null
  scheduled_at: string | null
  is_rush: boolean | null
  agent?: { id: string; name: string } | null
}

interface StatusColumn {
  key: string
  label: string
  color: string
}

interface OpsKanbanBoardProps {
  jobsByStatus: Record<string, Job[]>
  statusColumns: StatusColumn[]
}

export function OpsKanbanBoard({ jobsByStatus, statusColumns }: OpsKanbanBoardProps) {
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  const [isAssigning, setIsAssigning] = useState(false)

  const toggleJobSelection = useCallback((jobId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    setSelectedJobs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedJobs(new Set())
  }, [])

  const handleBulkAssign = useCallback(async () => {
    if (selectedJobs.size === 0) return

    // Navigate to assign page with selected job IDs
    const jobIds = Array.from(selectedJobs).join(',')
    window.location.href = `/admin/ops/assign?jobs=${jobIds}`
  }, [selectedJobs])

  const handleBulkExport = useCallback(() => {
    // Get all selected jobs data
    const allJobs = Object.values(jobsByStatus).flat()
    const selected = allJobs.filter(job => selectedJobs.has(job.id))

    // Create CSV content
    const headers = ['Address', 'City', 'State', 'Status', 'Scheduled', 'Rush', 'Agent']
    const rows = selected.map(job => [
      job.address,
      job.city || '',
      job.state || '',
      job.ops_status || '',
      job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : '',
      job.is_rush ? 'Yes' : 'No',
      job.agent?.name || ''
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobs-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    clearSelection()
  }, [selectedJobs, jobsByStatus, clearSelection])

  const handleBulkStatusChange = useCallback(async (newStatus: string) => {
    if (selectedJobs.size === 0) return

    setIsAssigning(true)
    try {
      const response = await fetch('/api/admin/ops/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobIds: Array.from(selectedJobs),
          newStatus
        })
      })

      if (response.ok) {
        clearSelection()
        // Trigger refresh
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsAssigning(false)
    }
  }, [selectedJobs, clearSelection])

  const bulkActions = [
    {
      id: 'assign',
      label: 'Assign',
      icon: <UserPlus className="h-4 w-4" />,
      onClick: handleBulkAssign,
      variant: 'default' as const,
    },
    {
      id: 'export',
      label: 'Export',
      icon: <Download className="h-4 w-4" />,
      onClick: handleBulkExport,
      variant: 'default' as const,
    },
    {
      id: 'refresh',
      label: 'Move to QC',
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: () => handleBulkStatusChange('ready_for_qc'),
      variant: 'success' as const,
      disabled: isAssigning,
    },
  ]

  return (
    <>
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-[1200px] gap-4">
          {statusColumns.map((column) => (
            <div
              key={column.key}
              className="w-[200px] flex-shrink-0 rounded-lg bg-neutral-100 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${column.color}`} />
                  <span className="text-sm font-medium text-neutral-700">
                    {column.label}
                  </span>
                </div>
                <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                  {jobsByStatus[column.key]?.length || 0}
                </span>
              </div>

              <div className="space-y-2">
                {jobsByStatus[column.key]?.slice(0, 10).map((job) => (
                  <div
                    key={job.id}
                    className={`group relative rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
                      job.is_rush ? 'border-l-4 border-amber-500' : ''
                    } ${selectedJobs.has(job.id) ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => toggleJobSelection(job.id, e)}
                      className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border transition-all ${
                        selectedJobs.has(job.id)
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-neutral-300 bg-white opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {selectedJobs.has(job.id) && (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                        </svg>
                      )}
                    </button>

                    {/* Job Content */}
                    <Link
                      href={`/admin/ops/jobs/${job.id}`}
                      className="block pl-6"
                    >
                      <p className="text-sm font-medium text-neutral-900 line-clamp-1">
                        {job.address}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {job.city}, {job.state}
                      </p>
                      {job.scheduled_at && (
                        <p className="mt-1 text-xs text-neutral-400">
                          {new Date(job.scheduled_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                      {job.is_rush && (
                        <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          RUSH
                        </span>
                      )}
                    </Link>
                  </div>
                ))}

                {(jobsByStatus[column.key]?.length || 0) > 10 && (
                  <p className="text-center text-xs text-neutral-500">
                    +{(jobsByStatus[column.key]?.length || 0) - 10} more
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedJobs.size}
        onClearSelection={clearSelection}
        actions={bulkActions}
      />
    </>
  )
}
