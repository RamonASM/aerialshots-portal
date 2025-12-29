'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  Type,
  ChevronUp,
  ChevronDown,
  Eye,
  Smartphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export interface CarouselSlide {
  id: string
  position: number
  headline: string
  body: string
  background_image_url?: string | null
  text_position: 'bottom_left' | 'bottom_center' | 'top_left' | 'center'
  overlay_style: 'gradient_bottom' | 'gradient_top' | 'solid_bar' | 'minimal'
}

interface CarouselBuilderProps {
  slides: CarouselSlide[]
  onChange: (slides: CarouselSlide[]) => void
  onSelectImage?: (slideId: string) => void
  readOnly?: boolean
}

interface SortableSlideProps {
  slide: CarouselSlide
  index: number
  onUpdate: (id: string, updates: Partial<CarouselSlide>) => void
  onDelete: (id: string) => void
  onSelectImage?: (slideId: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
  readOnly?: boolean
}

const TEXT_POSITIONS: { value: CarouselSlide['text_position']; label: string }[] = [
  { value: 'bottom_left', label: 'Bottom Left' },
  { value: 'bottom_center', label: 'Bottom Center' },
  { value: 'top_left', label: 'Top Left' },
  { value: 'center', label: 'Center' },
]

const OVERLAY_STYLES: { value: CarouselSlide['overlay_style']; label: string }[] = [
  { value: 'gradient_bottom', label: 'Gradient (Bottom)' },
  { value: 'gradient_top', label: 'Gradient (Top)' },
  { value: 'solid_bar', label: 'Solid Bar' },
  { value: 'minimal', label: 'Minimal' },
]

function SortableSlide({
  slide,
  index,
  onUpdate,
  onDelete,
  onSelectImage,
  isExpanded,
  onToggleExpand,
  readOnly,
}: SortableSlideProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800',
        isDragging && 'opacity-50 shadow-lg',
        isExpanded && 'ring-2 ring-blue-500'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2 dark:border-neutral-700">
        {!readOnly && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 active:cursor-grabbing dark:hover:bg-neutral-700"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
            {slide.headline || 'Untitled Slide'}
          </p>
        </div>
        <button
          onClick={onToggleExpand}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {!readOnly && (
          <button
            onClick={() => onDelete(slide.id)}
            className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: Form */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Headline
                </label>
                <Input
                  value={slide.headline}
                  onChange={(e) => onUpdate(slide.id, { headline: e.target.value })}
                  placeholder="Enter headline..."
                  disabled={readOnly}
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  {slide.headline.length}/100 characters
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Body Text
                </label>
                <textarea
                  value={slide.body}
                  onChange={(e) => onUpdate(slide.id, { body: e.target.value })}
                  placeholder="Enter body text..."
                  disabled={readOnly}
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  {slide.body.length}/500 characters
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Text Position
                  </label>
                  <select
                    value={slide.text_position}
                    onChange={(e) =>
                      onUpdate(slide.id, { text_position: e.target.value as CarouselSlide['text_position'] })
                    }
                    disabled={readOnly}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    {TEXT_POSITIONS.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Overlay Style
                  </label>
                  <select
                    value={slide.overlay_style}
                    onChange={(e) =>
                      onUpdate(slide.id, { overlay_style: e.target.value as CarouselSlide['overlay_style'] })
                    }
                    disabled={readOnly}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    {OVERLAY_STYLES.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!readOnly && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Background Image
                  </label>
                  <button
                    onClick={() => onSelectImage?.(slide.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 py-3 text-sm text-neutral-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-500"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {slide.background_image_url ? 'Change Image' : 'Select Image'}
                  </button>
                </div>
              )}
            </div>

            {/* Right: Preview */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Smartphone className="mr-1 inline-block h-4 w-4" />
                Preview
              </label>
              <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-neutral-900">
                {/* Background */}
                {slide.background_image_url ? (
                  <img
                    src={slide.background_image_url}
                    alt="Slide background"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                    <ImageIcon className="h-12 w-12 text-neutral-700" />
                  </div>
                )}

                {/* Overlay */}
                <div
                  className={cn(
                    'absolute inset-0',
                    slide.overlay_style === 'gradient_bottom' && 'bg-gradient-to-t from-black/80 via-black/20 to-transparent',
                    slide.overlay_style === 'gradient_top' && 'bg-gradient-to-b from-black/80 via-black/20 to-transparent',
                    slide.overlay_style === 'solid_bar' && 'bg-transparent',
                    slide.overlay_style === 'minimal' && 'bg-black/20'
                  )}
                />

                {/* Text Content */}
                <div
                  className={cn(
                    'absolute p-4',
                    slide.text_position === 'bottom_left' && 'bottom-0 left-0 right-0',
                    slide.text_position === 'bottom_center' && 'bottom-0 left-0 right-0 text-center',
                    slide.text_position === 'top_left' && 'left-0 right-0 top-0',
                    slide.text_position === 'center' && 'inset-0 flex flex-col items-center justify-center text-center'
                  )}
                >
                  {slide.overlay_style === 'solid_bar' && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 py-4" />
                  )}
                  <div className="relative z-10">
                    <p className="text-lg font-bold leading-tight text-white">
                      {slide.headline || 'Your Headline'}
                    </p>
                    {slide.body && (
                      <p className="mt-1 text-sm leading-snug text-white/90">
                        {slide.body}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CarouselBuilder({
  slides,
  onChange,
  onSelectImage,
  readOnly = false,
}: CarouselBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(slides[0]?.id || null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = slides.findIndex((s) => s.id === active.id)
        const newIndex = slides.findIndex((s) => s.id === over.id)
        const newSlides = arrayMove(slides, oldIndex, newIndex).map((slide, idx) => ({
          ...slide,
          position: idx,
        }))
        onChange(newSlides)
      }
    },
    [slides, onChange]
  )

  const handleAddSlide = () => {
    const newSlide: CarouselSlide = {
      id: crypto.randomUUID(),
      position: slides.length,
      headline: '',
      body: '',
      background_image_url: null,
      text_position: 'bottom_left',
      overlay_style: 'gradient_bottom',
    }
    onChange([...slides, newSlide])
    setExpandedId(newSlide.id)
  }

  const handleUpdateSlide = (id: string, updates: Partial<CarouselSlide>) => {
    onChange(slides.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const handleDeleteSlide = (id: string) => {
    const newSlides = slides
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, position: idx }))
    onChange(newSlides)
    if (expandedId === id) {
      setExpandedId(newSlides[0]?.id || null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Slides List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={slides.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {slides.map((slide, index) => (
              <SortableSlide
                key={slide.id}
                slide={slide}
                index={index}
                onUpdate={handleUpdateSlide}
                onDelete={handleDeleteSlide}
                onSelectImage={onSelectImage}
                isExpanded={expandedId === slide.id}
                onToggleExpand={() => setExpandedId(expandedId === slide.id ? null : slide.id)}
                readOnly={readOnly}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {slides.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-neutral-100 p-4 dark:bg-neutral-800">
              <ImageIcon className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-lg font-medium text-neutral-900 dark:text-white">No slides yet</p>
            <p className="mt-1 text-sm text-neutral-500">Add your first slide to get started</p>
            {!readOnly && (
              <Button onClick={handleAddSlide} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add First Slide
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Button */}
      {!readOnly && slides.length > 0 && (
        <button
          onClick={handleAddSlide}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-neutral-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
        >
          <Plus className="h-4 w-4" />
          Add Slide
        </button>
      )}

      {/* Slide Count */}
      {slides.length > 0 && (
        <div className="text-center text-sm text-neutral-500">
          {slides.length} {slides.length === 1 ? 'slide' : 'slides'} in carousel
        </div>
      )}
    </div>
  )
}

export default CarouselBuilder
