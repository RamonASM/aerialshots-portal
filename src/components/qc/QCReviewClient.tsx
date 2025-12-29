'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  Clock,
  Check,
  X,
  Maximize2,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QCImageViewer } from './QCImageViewer'

interface MediaAsset {
  id: string
  listing_id: string
  aryeo_url: string
  storage_path?: string | null
  processed_storage_path?: string | null
  qc_status: string
  qc_notes?: string | null
  category?: string | null
  type: string
}

interface QCReviewClientProps {
  listingId: string
  photos: MediaAsset[]
  onApprove: (assetId: string) => Promise<void>
  onReject: (assetId: string, notes?: string) => Promise<void>
}

export function QCReviewClient({
  listingId,
  photos,
  onApprove,
  onReject,
}: QCReviewClientProps) {
  const router = useRouter()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<string, { status: string; notes?: string }>
  >(new Map())

  const handleOpenViewer = useCallback((index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }, [])

  const handleApprove = useCallback(
    async (assetId: string) => {
      // Optimistic update
      setOptimisticUpdates((prev) => {
        const next = new Map(prev)
        next.set(assetId, { status: 'approved' })
        return next
      })

      try {
        await onApprove(assetId)
        router.refresh()
      } catch (error) {
        // Rollback on error
        setOptimisticUpdates((prev) => {
          const next = new Map(prev)
          next.delete(assetId)
          return next
        })
        console.error('Failed to approve:', error)
      }
    },
    [onApprove, router]
  )

  const handleReject = useCallback(
    async (assetId: string, notes?: string) => {
      // Optimistic update
      setOptimisticUpdates((prev) => {
        const next = new Map(prev)
        next.set(assetId, { status: 'rejected', notes })
        return next
      })

      try {
        await onReject(assetId, notes)
        router.refresh()
      } catch (error) {
        // Rollback on error
        setOptimisticUpdates((prev) => {
          const next = new Map(prev)
          next.delete(assetId)
          return next
        })
        console.error('Failed to reject:', error)
      }
    },
    [onReject, router]
  )

  // Apply optimistic updates to photos
  const displayPhotos = photos.map((photo) => {
    const update = optimisticUpdates.get(photo.id)
    if (update) {
      return {
        ...photo,
        qc_status: update.status,
        qc_notes: update.notes || photo.qc_notes,
      }
    }
    return photo
  })

  // Get pending photos for batch operations
  const pendingPhotos = useMemo(
    () =>
      displayPhotos.filter(
        (p) => p.qc_status === 'pending' || p.qc_status === 'ready_for_qc'
      ),
    [displayPhotos]
  )

  // Toggle selection for a photo
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all pending photos
  const selectAllPending = useCallback(() => {
    setSelectedIds(new Set(pendingPhotos.map((p) => p.id)))
  }, [pendingPhotos])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Batch approve selected photos
  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.size === 0) return

    setIsBatchProcessing(true)
    const idsToApprove = Array.from(selectedIds)

    // Optimistic updates for all selected
    setOptimisticUpdates((prev) => {
      const next = new Map(prev)
      idsToApprove.forEach((id) => next.set(id, { status: 'approved' }))
      return next
    })

    try {
      // Process in parallel (batches of 5)
      for (let i = 0; i < idsToApprove.length; i += 5) {
        const batch = idsToApprove.slice(i, i + 5)
        await Promise.all(batch.map((id) => onApprove(id)))
      }
      router.refresh()
      setSelectedIds(new Set())
      setSelectionMode(false)
    } catch (error) {
      // Rollback on error
      setOptimisticUpdates((prev) => {
        const next = new Map(prev)
        idsToApprove.forEach((id) => next.delete(id))
        return next
      })
      console.error('Batch approve failed:', error)
    } finally {
      setIsBatchProcessing(false)
    }
  }, [selectedIds, onApprove, router])

  // Batch reject selected photos
  const handleBatchReject = useCallback(async () => {
    if (selectedIds.size === 0) return

    const notes = window.prompt('Rejection notes for all selected (optional):')

    setIsBatchProcessing(true)
    const idsToReject = Array.from(selectedIds)

    // Optimistic updates
    setOptimisticUpdates((prev) => {
      const next = new Map(prev)
      idsToReject.forEach((id) => next.set(id, { status: 'rejected', notes: notes || undefined }))
      return next
    })

    try {
      for (let i = 0; i < idsToReject.length; i += 5) {
        const batch = idsToReject.slice(i, i + 5)
        await Promise.all(batch.map((id) => onReject(id, notes || undefined)))
      }
      router.refresh()
      setSelectedIds(new Set())
      setSelectionMode(false)
    } catch (error) {
      setOptimisticUpdates((prev) => {
        const next = new Map(prev)
        idsToReject.forEach((id) => next.delete(id))
        return next
      })
      console.error('Batch reject failed:', error)
    } finally {
      setIsBatchProcessing(false)
    }
  }, [selectedIds, onReject, router])

  return (
    <>
      {/* Batch Selection Bar */}
      {pendingPhotos.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-neutral-100 p-3">
          <div className="flex items-center gap-3">
            <Button
              variant={selectionMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectionMode(!selectionMode)
                if (selectionMode) {
                  clearSelection()
                }
              }}
            >
              {selectionMode ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Select Multiple
                </>
              )}
            </Button>

            {selectionMode && (
              <>
                <Button variant="ghost" size="sm" onClick={selectAllPending}>
                  Select All ({pendingPhotos.length})
                </Button>
                {selectedIds.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear ({selectedIds.size})
                  </Button>
                )}
              </>
            )}
          </div>

          {selectionMode && selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              {isBatchProcessing && (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchReject}
                disabled={isBatchProcessing}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject {selectedIds.size}
              </Button>
              <Button
                size="sm"
                onClick={handleBatchApprove}
                disabled={isBatchProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve {selectedIds.size}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {displayPhotos.map((photo, index) => {
          const isPending =
            photo.qc_status === 'pending' || photo.qc_status === 'ready_for_qc'
          const isSelected = selectedIds.has(photo.id)

          return (
            <div
              key={photo.id}
              className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-cyan-500 ring-2 ring-cyan-200'
                  : photo.qc_status === 'approved'
                    ? 'border-green-500'
                    : photo.qc_status === 'rejected'
                      ? 'border-red-500'
                      : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {/* Selection Checkbox */}
              {selectionMode && isPending && (
                <button
                  type="button"
                  onClick={() => toggleSelection(photo.id)}
                  className="absolute left-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded bg-white shadow-md transition-colors hover:bg-neutral-100"
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 text-cyan-600" />
                  ) : (
                    <Square className="h-5 w-5 text-neutral-400" />
                  )}
                </button>
              )}

              {/* Clickable Image */}
              <button
                type="button"
                onClick={() => {
                  if (selectionMode && isPending) {
                    toggleSelection(photo.id)
                  } else {
                    handleOpenViewer(index)
                  }
                }}
                className="aspect-square w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
              <img
                src={
                  photo.processed_storage_path
                    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/processed-photos/${photo.processed_storage_path}`
                    : photo.aryeo_url
                }
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20">
                <Maximize2 className="h-8 w-8 text-white opacity-0 transition-opacity hover:opacity-100" />
              </div>
            </button>

            {/* Status Badge */}
            <div
              className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full ${
                photo.qc_status === 'approved'
                  ? 'bg-green-500 text-white'
                  : photo.qc_status === 'rejected'
                    ? 'bg-red-500 text-white'
                    : photo.qc_status === 'processing'
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {photo.qc_status === 'approved' ? (
                <Check className="h-4 w-4" />
              ) : photo.qc_status === 'rejected' ? (
                <X className="h-4 w-4" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
            </div>

            {/* Category - adjust position when selection checkbox is shown */}
            {photo.category && (
              <div
                className={`absolute rounded bg-black/50 px-2 py-0.5 text-xs text-white ${
                  selectionMode && isPending ? 'left-10 top-2' : 'left-2 top-2'
                }`}
              >
                {photo.category}
              </div>
            )}

            {/* HDR Indicator */}
            {photo.processed_storage_path && (
              <div className="absolute bottom-2 left-2 rounded bg-cyan-500/80 px-2 py-0.5 text-xs text-white">
                HDR
              </div>
            )}

            {/* Actions for pending/ready_for_qc photos - hide in selection mode */}
            {isPending && !selectionMode && (
              <div className="flex border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => handleApprove(photo.id)}
                  className="flex flex-1 items-center justify-center gap-1 bg-green-50 py-2 text-green-600 transition-colors hover:bg-green-100"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const notes = window.prompt('Rejection notes (optional):')
                    handleReject(photo.id, notes || undefined)
                  }}
                  className="flex flex-1 items-center justify-center gap-1 border-l border-neutral-100 bg-red-50 py-2 text-red-600 transition-colors hover:bg-red-100"
                >
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">Reject</span>
                </button>
              </div>
            )}

            {/* Rejection notes */}
            {photo.qc_status === 'rejected' && photo.qc_notes && (
              <div className="bg-red-50 p-2 text-xs text-red-600">{photo.qc_notes}</div>
            )}
          </div>
          )
        })}
      </div>

      {displayPhotos.length === 0 && (
        <p className="py-8 text-center text-neutral-500">
          No photos have been uploaded yet.
        </p>
      )}

      {/* Full-screen Viewer */}
      {viewerOpen && (
        <QCImageViewer
          assets={displayPhotos}
          initialIndex={viewerIndex}
          listingId={listingId}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
