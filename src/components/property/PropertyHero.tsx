'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveMediaUrl } from '@/lib/storage/resolve-url'
import type { Database } from '@/lib/supabase/types'

type MediaAsset = Database['public']['Tables']['media_assets']['Row']

interface PropertyHeroProps {
  images: MediaAsset[]
  video?: MediaAsset | null
  address: string
}

export function PropertyHero({ images, video, address }: PropertyHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)

  // Filter to only images with a valid URL
  const heroImages = images.filter(img => resolveMediaUrl(img)).slice(0, 10)

  // Helper to get resolved URL
  const getImageUrl = (image: MediaAsset) => resolveMediaUrl(image) || ''
  const videoUrl = video ? resolveMediaUrl(video) : null

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? heroImages.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === heroImages.length - 1 ? 0 : prev + 1))
  }

  if (heroImages.length === 0) {
    return (
      <div className="relative h-[50vh] min-h-[400px] bg-neutral-900 lg:h-[70vh]">
        <div className="flex h-full items-center justify-center">
          <p className="text-neutral-500">No images available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[50vh] min-h-[400px] bg-black lg:h-[70vh]">
      {/* Video Overlay */}
      {showVideo && videoUrl && (
        <div className="absolute inset-0 z-20 bg-black">
          <video
            src={videoUrl}
            autoPlay
            controls
            className="h-full w-full object-contain"
            onEnded={() => setShowVideo(false)}
          />
          <Button
            variant="outline"
            size="sm"
            className="absolute right-4 top-4 bg-black/50"
            onClick={() => setShowVideo(false)}
          >
            Close Video
          </Button>
        </div>
      )}

      {/* Image Carousel */}
      <div className="relative h-full">
        <Image
          src={getImageUrl(heroImages[currentIndex])}
          alt={`${address} - Photo ${currentIndex + 1}`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Navigation Arrows */}
        {heroImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Play Video Button */}
        {videoUrl && !showVideo && (
          <button
            onClick={() => setShowVideo(true)}
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 p-4 text-black transition-transform hover:scale-110"
            aria-label="Play video"
          >
            <Play className="h-8 w-8" fill="currentColor" />
          </button>
        )}

        {/* Thumbnail Navigation */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {heroImages.slice(0, 7).map((img, index) => (
              <button
                key={img.id}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
            {heroImages.length > 7 && (
              <span className="text-sm text-white/70">+{heroImages.length - 7}</span>
            )}
          </div>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
          {currentIndex + 1} / {heroImages.length}
        </div>
      </div>
    </div>
  )
}
