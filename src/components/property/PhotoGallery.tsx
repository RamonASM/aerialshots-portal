'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Grid, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveMediaUrl } from '@/lib/storage/resolve-url'
import type { Database } from '@/lib/supabase/types'

type MediaAsset = Database['public']['Tables']['media_assets']['Row']

interface PhotoGalleryProps {
  images: MediaAsset[]
  address: string
}

export function PhotoGallery({ images, address }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showAll, setShowAll] = useState(false)

  // Filter to only images with a valid URL
  const validImages = images.filter(img => resolveMediaUrl(img))
  const displayImages = showAll ? validImages : validImages.slice(0, 8)

  // Helper to get resolved URL
  const getImageUrl = (image: MediaAsset) => resolveMediaUrl(image) || ''

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const goToPrevious = () => {
    setLightboxIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setLightboxIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1))
  }

  if (validImages.length === 0) return null

  return (
    <section className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[22px] font-semibold text-white">Photo Gallery</h2>
        <span className="text-[13px] text-[#636366]">{validImages.length} Photos</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {displayImages.map((image, index) => (
          <button
            key={image.id}
            onClick={() => openLightbox(showAll ? index : index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#0a0a0a] border border-white/[0.08]"
          >
            <Image
              src={getImageUrl(image)}
              alt={`${address} - Photo ${index + 1}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/30" />
            <div className="absolute bottom-2 right-2 rounded-full bg-black/70 backdrop-blur-sm p-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
              <Maximize2 className="h-4 w-4 text-white" />
            </div>
          </button>
        ))}
      </div>

      {/* Show More Button */}
      {validImages.length > 8 && !showAll && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => setShowAll(true)}>
            <Grid className="mr-2 h-4 w-4" />
            View All {validImages.length} Photos
          </Button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-full bg-[#1c1c1e] border border-white/[0.08] p-2.5 text-white transition-colors hover:bg-[#2c2c2e]"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Navigation */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[#1c1c1e] border border-white/[0.08] p-3 text-white transition-colors hover:bg-[#2c2c2e]"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[#1c1c1e] border border-white/[0.08] p-3 text-white transition-colors hover:bg-[#2c2c2e]"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Image */}
          <div className="relative h-[80vh] w-[90vw] max-w-6xl">
            <Image
              src={getImageUrl(validImages[lightboxIndex])}
              alt={`${address} - Photo ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#1c1c1e] border border-white/[0.08] px-4 py-2 text-[13px] text-white">
            {lightboxIndex + 1} / {validImages.length}
          </div>

          {/* Thumbnails */}
          <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-2 overflow-x-auto">
            {validImages.slice(0, 10).map((image, index) => (
              <button
                key={image.id}
                onClick={() => setLightboxIndex(index)}
                className={`relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                  index === lightboxIndex ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-80'
                }`}
              >
                <Image
                  src={getImageUrl(image)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
