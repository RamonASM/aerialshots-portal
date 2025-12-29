'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  SplitSquareHorizontal,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProcessedPhoto {
  id: string
  originalUrl: string
  processedUrl: string | null
  filename: string
  category: string
  qcStatus: string
  processingTime?: number
}

interface ProcessedGalleryProps {
  photos: ProcessedPhoto[]
}

export function ProcessedGallery({ photos }: ProcessedGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null

  const downloadPhoto = (photo: ProcessedPhoto) => {
    const url = photo.processedUrl || photo.originalUrl
    const link = document.createElement('a')
    link.href = url
    link.download = photo.filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (selectedIndex === null) return

    if (direction === 'prev') {
      setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : photos.length - 1)
    } else {
      setSelectedIndex(selectedIndex < photos.length - 1 ? selectedIndex + 1 : 0)
    }
    setShowOriginal(false)
  }

  const getStatusBadge = (qcStatus: string, hasProcessed: boolean) => {
    if (qcStatus === 'approved') {
      return (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </span>
      )
    }
    if (qcStatus === 'processing') {
      return (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      )
    }
    if (hasProcessed) {
      return (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
          <Clock className="h-3 w-3" />
          Pending QC
        </span>
      )
    }
    return (
      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-neutral-500 px-2 py-0.5 text-xs font-medium text-white">
        <Clock className="h-3 w-3" />
        Queued
      </span>
    )
  }

  return (
    <>
      {/* Grid View */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[4/3]">
              <img
                src={photo.processedUrl || photo.originalUrl}
                alt={photo.filename}
                className="h-full w-full object-cover"
              />

              {/* Status Badge */}
              {getStatusBadge(photo.qcStatus, !!photo.processedUrl)}

              {/* Hover Overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedIndex(index)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {photo.processedUrl && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadPhoto(photo)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Category label */}
              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs capitalize text-white">
                {photo.category}
              </span>
            </div>

            {/* Filename */}
            <div className="p-2">
              <p className="truncate text-xs text-neutral-600">{photo.filename}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          {/* Close button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          <button
            onClick={() => navigatePhoto('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={() => navigatePhoto('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          {/* Image */}
          <div className="relative max-h-[80vh] max-w-[90vw]">
            <img
              src={showOriginal ? selectedPhoto.originalUrl : (selectedPhoto.processedUrl || selectedPhoto.originalUrl)}
              alt={selectedPhoto.filename}
              className="max-h-[80vh] max-w-[90vw] object-contain"
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-black/50 px-4 py-2">
            {/* Before/After toggle */}
            {selectedPhoto.processedUrl && (
              <Button
                variant={showOriginal ? 'secondary' : 'default'}
                size="sm"
                onClick={() => setShowOriginal(!showOriginal)}
              >
                <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                {showOriginal ? 'Original' : 'Processed'}
              </Button>
            )}

            {/* Download */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadPhoto(selectedPhoto)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>

            {/* Counter */}
            <span className="text-sm text-white">
              {(selectedIndex ?? 0) + 1} / {photos.length}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Before/After comparison slider component
 */
export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  className = '',
}: {
  beforeUrl: string
  afterUrl: string
  className?: string
}) {
  const [sliderPosition, setSliderPosition] = useState(50)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, percentage)))
  }

  return (
    <div
      className={`relative cursor-ew-resize overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onTouchMove={(e) => {
        const touch = e.touches[0]
        const rect = e.currentTarget.getBoundingClientRect()
        const x = touch.clientX - rect.left
        const percentage = (x / rect.width) * 100
        setSliderPosition(Math.max(0, Math.min(100, percentage)))
      }}
    >
      {/* After image (full) */}
      <img
        src={afterUrl}
        alt="After"
        className="h-full w-full object-cover"
      />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeUrl}
          alt="Before"
          className="h-full w-full object-cover"
          style={{ width: `${100 / sliderPosition * 100}%` }}
        />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg">
          <SplitSquareHorizontal className="h-4 w-4 text-neutral-600" />
        </div>
      </div>

      {/* Labels */}
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        Before
      </span>
      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        After
      </span>
    </div>
  )
}
