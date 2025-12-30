'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, Loader2, ZoomIn } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Photo {
  id: string
  url: string
  storagePath: string | null
  category: string | null
  qcStatus: string | null
  processingJobId: string | null
}

interface MediaAssetsGalleryProps {
  photos: Photo[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
}

export function MediaAssetsGallery({
  photos,
  selectedIds,
  onToggleSelect,
}: MediaAssetsGalleryProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)

  if (photos.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No photos available for this listing.</p>
      </div>
    )
  }

  // Group photos by category
  const categorizedPhotos = photos.reduce(
    (acc, photo) => {
      const category = photo.category || 'uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(photo)
      return acc
    },
    {} as Record<string, Photo[]>
  )

  const categoryOrder = ['exterior', 'interior', 'kitchen', 'bedroom', 'bathroom', 'other', 'uncategorized']
  const sortedCategories = Object.keys(categorizedPhotos).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.toLowerCase())
    const bIndex = categoryOrder.indexOf(b.toLowerCase())
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })

  return (
    <>
      <div className="space-y-6">
        {sortedCategories.map((category) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-muted-foreground capitalize mb-3">
              {category === 'uncategorized' ? 'Other' : category}
              <span className="ml-2 text-xs">({categorizedPhotos[category].length})</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {categorizedPhotos[category].map((photo) => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  isSelected={selectedIds.includes(photo.id)}
                  onToggleSelect={() => onToggleSelect(photo.id)}
                  onZoom={() => setLightboxPhoto(photo)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {lightboxPhoto && (
            <div className="relative">
              <img
                src={lightboxPhoto.url}
                alt=""
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {lightboxPhoto.category && (
                    <Badge variant="secondary" className="capitalize">
                      {lightboxPhoto.category}
                    </Badge>
                  )}
                  <QCStatusBadge status={lightboxPhoto.qcStatus} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

interface PhotoThumbnailProps {
  photo: Photo
  isSelected: boolean
  onToggleSelect: () => void
  onZoom: () => void
}

function PhotoThumbnail({
  photo,
  isSelected,
  onToggleSelect,
  onZoom,
}: PhotoThumbnailProps) {
  return (
    <div
      className={`group relative aspect-square overflow-hidden rounded-lg cursor-pointer ${
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
          : 'ring-1 ring-border hover:ring-primary/50'
      }`}
      onClick={onToggleSelect}
    >
      <img
        src={photo.url}
        alt=""
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
        loading="lazy"
      />

      {/* Selection Overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
      )}

      {/* QC Status Indicator */}
      <div className="absolute top-1 left-1">
        <QCStatusBadge status={photo.qcStatus} compact />
      </div>

      {/* Zoom Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onZoom()
        }}
        className="absolute top-1 right-1 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      {/* Processing Indicator */}
      {photo.processingJobId && photo.qcStatus === 'processing' && (
        <div className="absolute bottom-1 right-1 p-1 rounded-md bg-black/50">
          <Loader2 className="h-4 w-4 text-white animate-spin" />
        </div>
      )}
    </div>
  )
}

function QCStatusBadge({ status, compact = false }: { status: string | null; compact?: boolean }) {
  if (!status || status === 'pending') {
    if (compact) {
      return <div className="w-2 h-2 rounded-full bg-amber-500" />
    }
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    )
  }

  if (status === 'approved') {
    if (compact) {
      return <div className="w-2 h-2 rounded-full bg-green-500" />
    }
    return (
      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Approved
      </Badge>
    )
  }

  if (status === 'rejected') {
    if (compact) {
      return <div className="w-2 h-2 rounded-full bg-red-500" />
    }
    return (
      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Rejected
      </Badge>
    )
  }

  if (status === 'processing') {
    if (compact) {
      return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
    }
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Processing
      </Badge>
    )
  }

  return null
}
