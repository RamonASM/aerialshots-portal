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
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Trash2,
  Check,
  X,
  Image as ImageIcon,
  Video,
  Star,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MediaItem {
  id: string
  url: string
  type: 'image' | 'video'
  name?: string
  category?: string
  isFeatured?: boolean
  isApproved?: boolean
}

interface SortableMediaGridProps {
  items: MediaItem[]
  onReorder?: (items: MediaItem[]) => void
  onDelete?: (id: string) => void
  onToggleFeatured?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onPreview?: (item: MediaItem) => void
  className?: string
  showActions?: boolean
  showQcActions?: boolean
}

interface SortableItemProps {
  item: MediaItem
  onDelete?: (id: string) => void
  onToggleFeatured?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onPreview?: (item: MediaItem) => void
  showActions?: boolean
  showQcActions?: boolean
  isDragging?: boolean
}

function SortableItem({
  item,
  onDelete,
  onToggleFeatured,
  onApprove,
  onReject,
  onPreview,
  showActions = true,
  showQcActions = false,
  isDragging = false,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isVideo = item.type === 'video'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800',
        isSorting && 'opacity-50',
        isDragging && 'ring-2 ring-blue-500'
      )}
    >
      {/* Media Preview */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {isVideo ? (
          <div className="flex h-full items-center justify-center">
            <Video className="h-12 w-12 text-neutral-400" />
          </div>
        ) : (
          <img
            src={item.url}
            alt={item.name || 'Media'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}

        {/* Featured badge */}
        {item.isFeatured && (
          <div className="absolute left-2 top-2 rounded-full bg-yellow-500 p-1">
            <Star className="h-3 w-3 text-white" fill="currentColor" />
          </div>
        )}

        {/* Approved/Rejected badge */}
        {item.isApproved !== undefined && (
          <div
            className={cn(
              'absolute right-2 top-2 rounded-full p-1',
              item.isApproved ? 'bg-green-500' : 'bg-red-500'
            )}
          >
            {item.isApproved ? (
              <Check className="h-3 w-3 text-white" />
            ) : (
              <X className="h-3 w-3 text-white" />
            )}
          </div>
        )}

        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="absolute left-2 top-2 cursor-grab rounded bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-white" />
        </button>

        {/* Hover Actions */}
        {showActions && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            {onPreview && (
              <button
                onClick={() => onPreview(item)}
                className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30"
                title="Preview"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {onToggleFeatured && (
              <button
                onClick={() => onToggleFeatured(item.id)}
                className={cn(
                  'rounded-full p-1.5 text-white hover:bg-white/30',
                  item.isFeatured ? 'bg-yellow-500/50' : 'bg-white/20'
                )}
                title={item.isFeatured ? 'Remove from featured' : 'Mark as featured'}
              >
                <Star className="h-4 w-4" fill={item.isFeatured ? 'currentColor' : 'none'} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="rounded-full bg-red-500/50 p-1.5 text-white hover:bg-red-500/70"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* QC Actions */}
        {showQcActions && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            {onApprove && (
              <button
                onClick={() => onApprove(item.id)}
                className="rounded-full bg-green-500 p-2 text-white hover:bg-green-600"
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(item.id)}
                className="rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                title="Reject"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info Footer */}
      {item.name && (
        <div className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-700">
          <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{item.name}</p>
          {item.category && (
            <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700">
              {item.category}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function MediaOverlay({ item }: { item: MediaItem }) {
  const isVideo = item.type === 'video'

  return (
    <div className="overflow-hidden rounded-lg border-2 border-blue-500 bg-white shadow-2xl dark:bg-neutral-800">
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {isVideo ? (
          <div className="flex h-full items-center justify-center">
            <Video className="h-12 w-12 text-neutral-400" />
          </div>
        ) : (
          <img
            src={item.url}
            alt={item.name || 'Media'}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </div>
  )
}

export function SortableMediaGrid({
  items,
  onReorder,
  onDelete,
  onToggleFeatured,
  onApprove,
  onReject,
  onPreview,
  className,
  showActions = true,
  showQcActions = false,
}: SortableMediaGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        onReorder?.(newItems)
      }
    },
    [items, onReorder]
  )

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50',
          className
        )}
      >
        <div className="text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-2 text-sm text-neutral-500">No media files</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div
          className={cn(
            'grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
            className
          )}
        >
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              onDelete={onDelete}
              onToggleFeatured={onToggleFeatured}
              onApprove={onApprove}
              onReject={onReject}
              onPreview={onPreview}
              showActions={showActions}
              showQcActions={showQcActions}
              isDragging={activeId === item.id}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay adjustScale={true}>
        {activeItem ? <MediaOverlay item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

export default SortableMediaGrid
