'use client'

import { useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PortfolioItem } from './PortfolioGrid'

interface LightboxProps {
  items: PortfolioItem[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
}

export function Lightbox({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: LightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const currentItem = items[currentIndex]
  const hasNext = currentIndex < items.length - 1
  const hasPrev = currentIndex > 0

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasPrev) onNavigate(currentIndex - 1)
          break
        case 'ArrowRight':
          if (hasNext) onNavigate(currentIndex + 1)
          break
        case ' ':
          e.preventDefault()
          if (currentItem?.type === 'video') {
            setIsPlaying(!isPlaying)
          }
          break
        case 'z':
          setIsZoomed(!isZoomed)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, hasPrev, hasNext, isZoomed, isPlaying, currentItem, onClose, onNavigate])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Auto-hide controls
  useEffect(() => {
    if (!isOpen) return

    let timeout: NodeJS.Timeout

    const resetTimer = () => {
      setShowControls(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => setShowControls(false), 3000)
    }

    const handleMouseMove = () => resetTimer()
    document.addEventListener('mousemove', handleMouseMove)
    resetTimer()

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(timeout)
    }
  }, [isOpen])

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1)
  }, [hasPrev, currentIndex, onNavigate])

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1)
  }, [hasNext, currentIndex, onNavigate])

  const handleShare = useCallback(async () => {
    if (!currentItem) return

    try {
      await navigator.share({
        title: currentItem.title,
        url: window.location.href,
      })
    } catch {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
    }
  }, [currentItem])

  if (!isOpen || !currentItem) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onClick={() => setShowControls(!showControls)}
    >
      {/* Header */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title & Counter */}
        <div>
          <h2 className="text-lg font-semibold text-white">{currentItem.title}</h2>
          <p className="text-sm text-white/60">
            {currentIndex + 1} of {items.length}
            {currentItem.location && ` • ${currentItem.location}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title={isZoomed ? 'Zoom out' : 'Zoom in'}
          >
            {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
          <button
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Share"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <a
            href={currentItem.src}
            download
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Download"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-5 w-5" />
          </a>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center p-16">
        {currentItem.type === 'video' ? (
          <VideoPlayer
            src={currentItem.src}
            poster={currentItem.thumbnail}
            isPlaying={isPlaying}
            onPlayingChange={setIsPlaying}
          />
        ) : (
          <div
            className={cn(
              'relative w-full h-full transition-transform duration-300',
              isZoomed && 'scale-150 cursor-zoom-out'
            )}
            onClick={(e) => {
              e.stopPropagation()
              if (isZoomed) setIsZoomed(false)
            }}
          >
            <Image
              src={currentItem.src}
              alt={currentItem.title}
              fill
              className="object-contain"
              priority
            />
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      <div
        className={cn(
          'transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
            title="Previous (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
            title="Next (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Thumbnail Strip */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center gap-2 overflow-x-auto pb-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onNavigate(index)}
              className={cn(
                'relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all',
                index === currentIndex
                  ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black'
                  : 'opacity-50 hover:opacity-100'
              )}
            >
              <Image
                src={item.thumbnail}
                alt={item.title}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Hints */}
      <div
        className={cn(
          'absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-white/40 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        <span>← → Navigate</span>
        <span>Esc Close</span>
        <span>Z Zoom</span>
        {currentItem.type === 'video' && <span>Space Play/Pause</span>}
      </div>
    </div>
  )
}

// Video Player Component
function VideoPlayer({
  src,
  poster,
  isPlaying,
  onPlayingChange,
}: {
  src: string
  poster: string
  isPlaying: boolean
  onPlayingChange: (playing: boolean) => void
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <video
        src={src}
        poster={poster}
        className="max-w-full max-h-full rounded-lg"
        controls={false}
        autoPlay={isPlaying}
        onPlay={() => onPlayingChange(true)}
        onPause={() => onPlayingChange(false)}
        onClick={(e) => {
          e.stopPropagation()
          onPlayingChange(!isPlaying)
        }}
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onPlayingChange(true)
          }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
            <Play className="h-10 w-10 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Video Controls */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onPlayingChange(!isPlaying)}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white fill-white" />
          )}
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-white" />
          ) : (
            <Maximize2 className="h-4 w-4 text-white" />
          )}
        </button>
      </div>
    </div>
  )
}

// Hook for lightbox state
export function useLightbox(items: PortfolioItem[]) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const open = useCallback((index: number) => {
    setCurrentIndex(index)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const navigate = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index)
    }
  }, [items.length])

  return {
    isOpen,
    currentIndex,
    open,
    close,
    navigate,
  }
}
