'use client'

import { useState, useMemo } from 'react'
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  SortAsc,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface QCQueueItem {
  id: string
  listing_id: string
  listing_address: string
  thumbnail_url?: string
  qc_status: 'pending' | 'ready_for_qc' | 'approved' | 'rejected' | 'processing'
  is_rush: boolean
  created_at: string
  category?: string
  processed_storage_path?: string | null
  priority_score?: number
}

interface QCQueueProps {
  items: QCQueueItem[]
  selectedId?: string
  onSelectItem: (item: QCQueueItem) => void
  onStartReview: (listingId: string) => void
}

type SortOption = 'priority' | 'oldest' | 'newest' | 'rush'
type FilterOption = 'all' | 'pending' | 'ready_for_qc' | 'approved' | 'rejected'

export function QCQueue({
  items,
  selectedId,
  onSelectItem,
  onStartReview,
}: QCQueueProps) {
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')

  // Group items by listing
  const groupedItems = useMemo(() => {
    const groups = new Map<string, QCQueueItem[]>()

    items.forEach((item) => {
      const existing = groups.get(item.listing_id) || []
      existing.push(item)
      groups.set(item.listing_id, existing)
    })

    return Array.from(groups.entries()).map(([listingId, listingItems]) => {
      const rushItems = listingItems.filter((i) => i.is_rush)
      const pendingCount = listingItems.filter(
        (i) => i.qc_status === 'pending' || i.qc_status === 'ready_for_qc'
      ).length
      const approvedCount = listingItems.filter((i) => i.qc_status === 'approved').length
      const rejectedCount = listingItems.filter((i) => i.qc_status === 'rejected').length

      // Calculate priority score
      const isRush = rushItems.length > 0
      const oldestItem = listingItems.reduce((a, b) =>
        new Date(a.created_at) < new Date(b.created_at) ? a : b
      )
      const ageHours = (Date.now() - new Date(oldestItem.created_at).getTime()) / (1000 * 60 * 60)
      const priorityScore = (isRush ? 1000 : 0) + ageHours * 10 + pendingCount

      return {
        listingId,
        address: listingItems[0].listing_address,
        items: listingItems,
        isRush,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalCount: listingItems.length,
        priorityScore,
        oldestCreatedAt: oldestItem.created_at,
      }
    })
  }, [items])

  // Apply filtering
  const filteredGroups = useMemo(() => {
    if (filterBy === 'all') return groupedItems

    return groupedItems.filter((group) =>
      group.items.some((item) => {
        if (filterBy === 'pending') {
          return item.qc_status === 'pending' || item.qc_status === 'ready_for_qc'
        }
        return item.qc_status === filterBy
      })
    )
  }, [groupedItems, filterBy])

  // Apply sorting
  const sortedGroups = useMemo(() => {
    const sorted = [...filteredGroups]

    switch (sortBy) {
      case 'priority':
        sorted.sort((a, b) => b.priorityScore - a.priorityScore)
        break
      case 'oldest':
        sorted.sort(
          (a, b) =>
            new Date(a.oldestCreatedAt).getTime() - new Date(b.oldestCreatedAt).getTime()
        )
        break
      case 'newest':
        sorted.sort(
          (a, b) =>
            new Date(b.oldestCreatedAt).getTime() - new Date(a.oldestCreatedAt).getTime()
        )
        break
      case 'rush':
        sorted.sort((a, b) => (b.isRush ? 1 : 0) - (a.isRush ? 1 : 0))
        break
    }

    return sorted
  }, [filteredGroups, sortBy])

  const totalPending = items.filter(
    (i) => i.qc_status === 'pending' || i.qc_status === 'ready_for_qc'
  ).length
  const rushCount = groupedItems.filter((g) => g.isRush).length

  return (
    <div className="flex h-full flex-col bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">QC Queue</h2>
            <p className="text-sm text-neutral-400">
              {totalPending} pending across {sortedGroups.length} listings
              {rushCount > 0 && (
                <span className="ml-2 text-amber-400">
                  <Zap className="inline h-3 w-3 mr-1" />
                  {rushCount} rush
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-500" />
            <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}>
              <SelectTrigger className="h-8 w-[120px] bg-neutral-800 border-neutral-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ready_for_qc">Ready for QC</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-neutral-500" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-8 w-[120px] bg-neutral-800 border-neutral-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="rush">Rush First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto">
        {sortedGroups.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-neutral-500">
              <CheckCircle2 className="mx-auto h-12 w-12 mb-2" />
              <p>No items in queue</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {sortedGroups.map((group) => (
              <div
                key={group.listingId}
                className={`p-4 hover:bg-neutral-800/50 cursor-pointer transition-colors ${
                  group.items.some((i) => i.id === selectedId)
                    ? 'bg-neutral-800'
                    : ''
                }`}
                onClick={() => onSelectItem(group.items[0])}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {group.isRush && (
                        <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded">
                          <Zap className="h-3 w-3" />
                          Rush
                        </span>
                      )}
                      <h3 className="text-sm font-medium text-white truncate">
                        {group.address}
                      </h3>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {group.totalCount} photos
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(group.oldestCreatedAt)}
                      </span>
                    </div>

                    {/* Status breakdown */}
                    <div className="mt-2 flex items-center gap-3">
                      {group.pendingCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-cyan-400">
                          <AlertTriangle className="h-3 w-3" />
                          {group.pendingCount} pending
                        </span>
                      )}
                      {group.approvedCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {group.approvedCount} approved
                        </span>
                      )}
                      {group.rejectedCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <XCircle className="h-3 w-3" />
                          {group.rejectedCount} rejected
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-neutral-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartReview(group.listingId)
                    }}
                  >
                    Review
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return `${diffDays}d ago`
  }
}
