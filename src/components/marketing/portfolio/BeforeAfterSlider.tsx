'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { GripVertical, Camera, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BeforeAfterSliderProps {
  beforeImage: string
  afterImage: string
  beforeLabel?: string
  afterLabel?: string
  title?: string
  description?: string
  className?: string
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  title,
  description,
  className,
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100)
    setSliderPosition(percentage)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    handleMove(e.clientX)
  }, [handleMove])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    handleMove(e.touches[0].clientX)
  }, [handleMove])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientX)
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, handleMove])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Title */}
      {(title || description) && (
        <div className="text-center">
          {title && (
            <h3 className="text-xl font-bold text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}

      {/* Slider Container */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-2xl cursor-ew-resize select-none',
          isDragging && 'cursor-grabbing'
        )}
        style={{ aspectRatio: '16/10' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* After Image (Full Width Background) */}
        <div className="absolute inset-0">
          <Image
            src={afterImage}
            alt={afterLabel}
            fill
            className="object-cover"
            draggable={false}
          />
        </div>

        {/* Before Image (Clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <Image
            src={beforeImage}
            alt={beforeLabel}
            fill
            className="object-cover"
            draggable={false}
          />
        </div>

        {/* Slider Handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          {/* Handle Grip */}
          <div
            className={cn(
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'flex h-12 w-12 items-center justify-center rounded-full',
              'bg-white shadow-xl transition-transform',
              isDragging && 'scale-110'
            )}
          >
            <GripVertical className="h-6 w-6 text-neutral-600" />
          </div>

          {/* Top Arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white" />
          </div>

          {/* Bottom Arrow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white bg-black/60 backdrop-blur-sm transition-opacity',
              sliderPosition < 15 && 'opacity-0'
            )}
          >
            <Camera className="h-3.5 w-3.5" />
            {beforeLabel}
          </div>
        </div>

        <div className="absolute top-4 right-4 pointer-events-none">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 transition-opacity',
              sliderPosition > 85 && 'opacity-0'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {afterLabel}
          </div>
        </div>

        {/* Instruction Hint */}
        <div
          className={cn(
            'absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-sm text-white/80 pointer-events-none transition-opacity',
            isDragging && 'opacity-0'
          )}
        >
          Drag to compare
        </div>
      </div>
    </div>
  )
}

// Showcase component with multiple before/after examples
interface StagingShowcaseProps {
  examples: Array<{
    id: string
    before: string
    after: string
    room: string
    style: string
  }>
  className?: string
}

export function StagingShowcase({ examples, className }: StagingShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeExample = examples[activeIndex]

  if (!examples.length) return null

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Slider */}
      <BeforeAfterSlider
        beforeImage={activeExample.before}
        afterImage={activeExample.after}
        beforeLabel="Empty"
        afterLabel="Staged"
        title={activeExample.room}
        description={`${activeExample.style} style`}
      />

      {/* Example Selector */}
      {examples.length > 1 && (
        <div className="flex justify-center gap-3">
          {examples.map((example, index) => (
            <button
              key={example.id}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative w-20 h-14 rounded-lg overflow-hidden transition-all',
                index === activeIndex
                  ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black'
                  : 'opacity-60 hover:opacity-100'
              )}
            >
              <Image
                src={example.after}
                alt={example.room}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white text-center truncate">
                {example.room}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Simple comparison for inline use
interface InlineComparisonProps {
  before: string
  after: string
  className?: string
}

export function InlineComparison({ before, after, className }: InlineComparisonProps) {
  const [showAfter, setShowAfter] = useState(false)

  return (
    <div
      className={cn('relative rounded-xl overflow-hidden cursor-pointer', className)}
      style={{ aspectRatio: '16/10' }}
      onMouseEnter={() => setShowAfter(true)}
      onMouseLeave={() => setShowAfter(false)}
      onClick={() => setShowAfter(!showAfter)}
    >
      {/* Before */}
      <Image
        src={before}
        alt="Before"
        fill
        className={cn(
          'object-cover transition-opacity duration-500',
          showAfter && 'opacity-0'
        )}
      />

      {/* After */}
      <Image
        src={after}
        alt="After"
        fill
        className={cn(
          'object-cover transition-opacity duration-500',
          !showAfter && 'opacity-0'
        )}
      />

      {/* Label */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm">
          {showAfter ? (
            <>
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-white">Staged</span>
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 text-white" />
              <span className="text-sm font-medium text-white">Original</span>
            </>
          )}
        </div>
      </div>

      {/* Hover hint */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity',
          showAfter ? 'opacity-0' : 'opacity-100'
        )}
      >
        <span className="text-white/60 text-sm">Hover to see staged</span>
      </div>
    </div>
  )
}
