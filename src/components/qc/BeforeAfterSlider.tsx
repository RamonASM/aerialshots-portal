'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface BeforeAfterSliderProps {
  beforeImage: string
  afterImage: string
  zoom?: number
  beforeLabel?: string
  afterLabel?: string
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  zoom = 1,
  beforeLabel = 'Original',
  afterLabel = 'Processed',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100)
      setSliderPosition(percentage)
    },
    [isDragging]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent | React.TouchEvent) => {
      if (!isDragging || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100)
      setSliderPosition(percentage)
    },
    [isDragging]
  )

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false)
      const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e)
      const handleGlobalTouchEnd = () => setIsDragging(false)
      const handleGlobalTouchMove = (e: TouchEvent) => handleTouchMove(e)

      window.addEventListener('mouseup', handleGlobalMouseUp)
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('touchend', handleGlobalTouchEnd)
      window.addEventListener('touchmove', handleGlobalTouchMove)

      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp)
        window.removeEventListener('mousemove', handleGlobalMouseMove)
        window.removeEventListener('touchend', handleGlobalTouchEnd)
        window.removeEventListener('touchmove', handleGlobalTouchMove)
      }
    }
  }, [isDragging, handleMouseMove, handleTouchMove])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full max-h-full max-w-full overflow-hidden select-none cursor-ew-resize"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* After Image (Full width, behind) */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `scale(${zoom})` }}
      >
        <img
          src={afterImage}
          alt={afterLabel}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      </div>

      {/* Before Image (Clipped to slider position) */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          transform: `scale(${zoom})`,
        }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Slider Handle */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-ew-resize"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <div className="flex items-center gap-0.5">
            <svg
              className="w-3 h-3 text-neutral-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <svg
              className="w-3 h-3 text-neutral-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 z-20">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          {beforeLabel}
        </span>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          {afterLabel}
        </span>
      </div>
    </div>
  )
}
