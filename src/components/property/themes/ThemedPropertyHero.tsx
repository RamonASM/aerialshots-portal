/**
 * Themed Property Hero
 *
 * Hero component that adapts to the current theme
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveMediaUrl } from '@/lib/storage/resolve-url'
import type { Database } from '@/lib/supabase/types'
import type { Theme } from '@/lib/themes/property/themes'

type MediaAsset = Database['public']['Tables']['media_assets']['Row']

interface ThemedPropertyHeroProps {
  images: MediaAsset[]
  video?: MediaAsset | null
  address: string
  theme: Theme
}

export function ThemedPropertyHero({
  images,
  video,
  address,
  theme,
}: ThemedPropertyHeroProps) {
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

  // Theme-based styles
  const heroHeight = theme.layout.heroHeight
  const overlayStyle = theme.layout.heroOverlay
  const cardRadius = theme.layout.cardRadius
  const bgColor = theme.colors.background

  if (heroImages.length === 0) {
    return (
      <div
        className="relative min-h-[400px]"
        style={{ height: heroHeight, backgroundColor: bgColor }}
      >
        <div className="flex h-full items-center justify-center">
          <p style={{ color: theme.colors.textMuted }}>No images available</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-[400px]"
      style={{ height: heroHeight, backgroundColor: bgColor }}
    >
      {/* Video Overlay */}
      {showVideo && videoUrl && (
        <div
          className="absolute inset-0 z-20"
          style={{ backgroundColor: bgColor }}
        >
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
            className="absolute right-4 top-4"
            style={{
              backgroundColor: `${bgColor}80`,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
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

        {/* Theme-specific Gradient Overlay */}
        {overlayStyle !== 'none' && (
          <div
            className="absolute inset-0"
            style={{ background: overlayStyle }}
          />
        )}

        {/* Navigation Arrows */}
        {heroImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 p-2 transition-colors"
              style={{
                backgroundColor: `${bgColor}80`,
                borderRadius: cardRadius,
                color: theme.colors.text,
              }}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 p-2 transition-colors"
              style={{
                backgroundColor: `${bgColor}80`,
                borderRadius: cardRadius,
                color: theme.colors.text,
              }}
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
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 p-4 transition-transform hover:scale-110"
            style={{
              backgroundColor: `${theme.colors.text}E6`,
              borderRadius: '9999px',
              color: bgColor,
            }}
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
                className="h-2 w-2 transition-colors"
                style={{
                  backgroundColor:
                    index === currentIndex
                      ? theme.colors.text
                      : `${theme.colors.text}80`,
                  borderRadius: '9999px',
                }}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
            {heroImages.length > 7 && (
              <span
                className="text-sm"
                style={{ color: `${theme.colors.text}B3` }}
              >
                +{heroImages.length - 7}
              </span>
            )}
          </div>
        )}

        {/* Image Counter */}
        <div
          className="absolute bottom-4 right-4 z-10 px-3 py-1 text-sm"
          style={{
            backgroundColor: `${bgColor}80`,
            borderRadius: cardRadius,
            color: theme.colors.text,
          }}
        >
          {currentIndex + 1} / {heroImages.length}
        </div>
      </div>
    </div>
  )
}
