'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  XCircle,
  Pencil,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Keyboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BeforeAfterSlider } from './BeforeAfterSlider'
import { InpaintModal } from './InpaintModal'

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

interface QCImageViewerProps {
  assets: MediaAsset[]
  initialIndex?: number
  listingId: string
  onApprove: (assetId: string) => Promise<void>
  onReject: (assetId: string, notes?: string) => Promise<void>
  onClose: () => void
  onImageEdited?: (assetId: string, newImageUrl: string) => void
}

export function QCImageViewer({
  assets,
  initialIndex = 0,
  listingId,
  onApprove,
  onReject,
  onClose,
  onImageEdited,
}: QCImageViewerProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [showComparison, setShowComparison] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showInpaintModal, setShowInpaintModal] = useState(false)

  const currentAsset = assets[currentIndex]
  const pendingAssets = assets.filter((a) => a.qc_status === 'pending' || a.qc_status === 'ready_for_qc')
  const currentPendingIndex = pendingAssets.findIndex((a) => a.id === currentAsset?.id)

  const goToNext = useCallback(() => {
    if (currentIndex < assets.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setZoom(1)
    }
  }, [currentIndex, assets.length])

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setZoom(1)
    }
  }, [currentIndex])

  const goToNextPending = useCallback(() => {
    const nextPending = assets.findIndex(
      (a, i) => i > currentIndex && (a.qc_status === 'pending' || a.qc_status === 'ready_for_qc')
    )
    if (nextPending !== -1) {
      setCurrentIndex(nextPending)
      setZoom(1)
    }
  }, [currentIndex, assets])

  const handleApprove = useCallback(async () => {
    if (!currentAsset || isProcessing) return
    setIsProcessing(true)
    try {
      await onApprove(currentAsset.id)
      goToNextPending()
    } finally {
      setIsProcessing(false)
    }
  }, [currentAsset, isProcessing, onApprove, goToNextPending])

  const handleReject = useCallback(async () => {
    if (!currentAsset || isProcessing) return
    const notes = window.prompt('Rejection notes (optional):')
    setIsProcessing(true)
    try {
      await onReject(currentAsset.id, notes || undefined)
      goToNextPending()
    } finally {
      setIsProcessing(false)
    }
  }, [currentAsset, isProcessing, onReject, goToNextPending])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'a':
          handleApprove()
          break
        case 'r':
          handleReject()
          break
        case 'e':
          // Check if current asset is pending for QC
          const assetIsPending = currentAsset?.qc_status === 'pending' || currentAsset?.qc_status === 'ready_for_qc'
          if (assetIsPending && !showInpaintModal) {
            setShowInpaintModal(true)
          }
          break
        case 'n':
        case 'arrowright':
          e.preventDefault()
          goToNext()
          break
        case 'p':
        case 'arrowleft':
          e.preventDefault()
          goToPrev()
          break
        case 'c':
          setShowComparison(!showComparison)
          break
        case '+':
        case '=':
          setZoom(Math.min(zoom + 0.25, 3))
          break
        case '-':
          setZoom(Math.max(zoom - 0.25, 0.5))
          break
        case '0':
          setZoom(1)
          break
        case 'escape':
          onClose()
          break
        case '?':
          setShowShortcuts(!showShortcuts)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    handleApprove,
    handleReject,
    goToNext,
    goToPrev,
    showComparison,
    zoom,
    onClose,
    showShortcuts,
    showInpaintModal,
    currentAsset,
  ])

  // Handle successful inpainting
  const handleInpaintSuccess = useCallback(
    (newImageUrl: string) => {
      setShowInpaintModal(false)
      if (onImageEdited && currentAsset) {
        onImageEdited(currentAsset.id, newImageUrl)
      }
      // Refresh the page to show the updated image
      router.refresh()
    },
    [currentAsset, onImageEdited, router]
  )

  if (!currentAsset) return null

  const hasProcessedVersion = !!currentAsset.processed_storage_path
  const isPending = currentAsset.qc_status === 'pending' || currentAsset.qc_status === 'ready_for_qc'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white">
            <X className="h-4 w-4" />
          </Button>
          <div className="text-white">
            <span className="font-medium">
              {currentIndex + 1} / {assets.length}
            </span>
            {pendingAssets.length > 0 && (
              <span className="ml-2 text-neutral-400">
                ({currentPendingIndex + 1} of {pendingAssets.length} pending)
              </span>
            )}
          </div>
          {currentAsset.category && (
            <span className="rounded bg-neutral-700 px-2 py-1 text-xs text-white">
              {currentAsset.category}
            </span>
          )}
          <span
            className={`rounded px-2 py-1 text-xs ${
              currentAsset.qc_status === 'approved'
                ? 'bg-green-600 text-white'
                : currentAsset.qc_status === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-cyan-600 text-white'
            }`}
          >
            {currentAsset.qc_status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasProcessedVersion && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className={`text-white ${showComparison ? 'bg-white/20' : ''}`}
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Compare
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.max(zoom - 0.25, 0.5))}
            className="text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[4rem] text-center text-sm text-white">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.min(zoom + 0.25, 3))}
            className="text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(1)}
            className="text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="text-white"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Navigation Arrows */}
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70 disabled:opacity-30"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex === assets.length - 1}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70 disabled:opacity-30"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Image Content */}
        <div className="flex h-full items-center justify-center p-8">
          {showComparison && hasProcessedVersion ? (
            <BeforeAfterSlider
              beforeImage={currentAsset.aryeo_url}
              afterImage={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/processed-photos/${currentAsset.processed_storage_path}`}
              zoom={zoom}
            />
          ) : (
            <img
              src={
                hasProcessedVersion
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/processed-photos/${currentAsset.processed_storage_path}`
                  : currentAsset.aryeo_url
              }
              alt=""
              className="max-h-full max-w-full object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          )}
        </div>
      </div>

      {/* Action Bar */}
      {isPending && (
        <div className="flex items-center justify-center gap-4 border-t border-neutral-800 bg-neutral-900 px-4 py-4">
          <Button
            size="lg"
            variant="outline"
            onClick={handleReject}
            disabled={isProcessing}
            className="border-red-600 bg-red-600/10 text-red-400 hover:bg-red-600/20"
          >
            <XCircle className="mr-2 h-5 w-5" />
            Reject (R)
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowInpaintModal(true)}
            disabled={isProcessing}
            className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/20"
          >
            <Pencil className="mr-2 h-5 w-5" />
            Edit (E)
          </Button>
          <Button
            size="lg"
            onClick={handleApprove}
            disabled={isProcessing}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            <Check className="mr-2 h-5 w-5" />
            Approve (A)
          </Button>
        </div>
      )}

      {/* Rejection Notes */}
      {currentAsset.qc_status === 'rejected' && currentAsset.qc_notes && (
        <div className="border-t border-red-800 bg-red-900/50 px-4 py-3">
          <p className="text-sm text-red-300">
            <strong>Rejection Notes:</strong> {currentAsset.qc_notes}
          </p>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-96 rounded-lg bg-neutral-900 p-6">
            <h3 className="mb-4 text-lg font-bold text-white">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-300">
                <span>Approve photo</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">A</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Reject photo</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">R</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Edit photo</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">E</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Next photo</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">N</kbd> or{' '}
                <kbd className="rounded bg-neutral-700 px-2 py-1">&rarr;</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Previous photo</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">P</kbd> or{' '}
                <kbd className="rounded bg-neutral-700 px-2 py-1">&larr;</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Toggle comparison</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">C</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Zoom in</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">+</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Zoom out</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">-</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Reset zoom</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">0</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Close viewer</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">Esc</kbd>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Show shortcuts</span>
                <kbd className="rounded bg-neutral-700 px-2 py-1">?</kbd>
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => setShowShortcuts(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Inpaint Modal */}
      {showInpaintModal && currentAsset && (
        <InpaintModal
          imageUrl={
            currentAsset.processed_storage_path
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/processed-photos/${currentAsset.processed_storage_path}`
              : currentAsset.aryeo_url
          }
          assetId={currentAsset.id}
          listingId={listingId}
          onClose={() => setShowInpaintModal(false)}
          onSuccess={handleInpaintSuccess}
        />
      )}
    </div>
  )
}
