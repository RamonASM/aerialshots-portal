'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Grid, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  const displayImages = showAll ? images : images.slice(0, 8)

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const goToPrevious = () => {
    setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  if (images.length === 0) return null

  return (
    <section className="bg-neutral-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900">Photo Gallery</h2>
          <span className="text-sm text-neutral-500">{images.length} Photos</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:gap-3">
          {displayImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => openLightbox(showAll ? index : index)}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-200"
            >
              <Image
                src={image.aryeo_url}
                alt={`${address} - Photo ${index + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
              <div className="absolute bottom-2 right-2 rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-4 w-4 text-white" />
              </div>
            </button>
          ))}
        </div>

        {/* Show More Button */}
        {images.length > 8 && !showAll && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setShowAll(true)}>
              <Grid className="mr-2 h-4 w-4" />
              View All {images.length} Photos
            </Button>
          </div>
        )}

        {/* Lightbox */}
        {lightboxOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute right-4 top-4 z-10 rounded-full bg-neutral-800 p-2 text-white hover:bg-neutral-700"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation */}
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-neutral-800 p-3 text-white hover:bg-neutral-700"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-neutral-800 p-3 text-white hover:bg-neutral-700"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Image */}
            <div className="relative h-[80vh] w-[90vw] max-w-6xl">
              <Image
                src={images[lightboxIndex]?.aryeo_url ?? ''}
                alt={`${address} - Photo ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-neutral-800 px-4 py-2 text-sm text-white">
              {lightboxIndex + 1} / {images.length}
            </div>

            {/* Thumbnails */}
            <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-2 overflow-x-auto">
              {images.slice(0, 10).map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setLightboxIndex(index)}
                  className={`relative h-12 w-16 flex-shrink-0 overflow-hidden rounded ${
                    index === lightboxIndex ? 'ring-2 ring-white' : 'opacity-60'
                  }`}
                >
                  <Image
                    src={image.aryeo_url}
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
      </div>
    </section>
  )
}
