'use client'

import { useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import {
  Camera,
  Video,
  Plane,
  Home,
  Image as ImageIcon,
  Sparkles,
  Play,
  Expand,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface PortfolioItem {
  id: string
  type: 'photo' | 'video' | 'drone' | '3d-tour' | 'staging' | 'floor-plan'
  src: string
  thumbnail: string
  title: string
  location?: string
  propertyType?: string
  sqft?: number
  width: number
  height: number
  featured?: boolean
}

interface PortfolioGridProps {
  items: PortfolioItem[]
  onItemClick?: (item: PortfolioItem, index: number) => void
  className?: string
}

// Filter categories
const categories = [
  { id: 'all', label: 'All', icon: Filter },
  { id: 'photo', label: 'Photography', icon: Camera },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'drone', label: 'Aerial', icon: Plane },
  { id: '3d-tour', label: '3D Tours', icon: Home },
  { id: 'staging', label: 'Staging', icon: Sparkles },
  { id: 'floor-plan', label: 'Floor Plans', icon: ImageIcon },
] as const

type CategoryId = typeof categories[number]['id']

export function PortfolioGrid({ items, onItemClick, className }: PortfolioGridProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter((item) => item.type === activeCategory)
  }, [items, activeCategory])

  // Distribute items into columns for masonry layout
  const columns = useMemo(() => {
    const cols: PortfolioItem[][] = [[], [], []]
    filteredItems.forEach((item, i) => {
      cols[i % 3].push(item)
    })
    return cols
  }, [filteredItems])

  const handleItemClick = useCallback((item: PortfolioItem) => {
    const index = filteredItems.findIndex((i) => i.id === item.id)
    onItemClick?.(item, index)
  }, [filteredItems, onItemClick])

  return (
    <div className={cn('space-y-8', className)}>
      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon
          const count = cat.id === 'all'
            ? items.length
            : items.filter((i) => i.type === cat.id).length

          if (count === 0 && cat.id !== 'all') return null

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                activeCategory === cat.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
              <span className={cn(
                'ml-1 text-xs',
                activeCategory === cat.id ? 'text-blue-200' : 'text-neutral-500'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Masonry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {columns.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {column.map((item) => (
              <PortfolioCard
                key={item.id}
                item={item}
                isHovered={hoveredId === item.id}
                onHover={(hovered) => setHoveredId(hovered ? item.id : null)}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 mx-auto mb-4">
            <Camera className="h-8 w-8 text-neutral-500" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No items found
          </h3>
          <p className="text-muted-foreground">
            Try selecting a different category
          </p>
        </div>
      )}
    </div>
  )
}

interface PortfolioCardProps {
  item: PortfolioItem
  isHovered: boolean
  onHover: (hovered: boolean) => void
  onClick: () => void
}

function PortfolioCard({ item, isHovered, onHover, onClick }: PortfolioCardProps) {
  // Calculate aspect ratio for natural sizing
  const aspectRatio = item.height / item.width

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300',
        isHovered && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black'
      )}
      style={{ paddingBottom: `${aspectRatio * 100}%` }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
    >
      {/* Image */}
      <Image
        src={item.thumbnail}
        alt={item.title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={cn(
          'object-cover transition-transform duration-500',
          isHovered && 'scale-105'
        )}
      />

      {/* Gradient Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Type Badge */}
      <div className="absolute top-3 left-3">
        <TypeBadge type={item.type} />
      </div>

      {/* Featured Badge */}
      {item.featured && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-semibold text-black">
            <Sparkles className="h-3 w-3" />
            Featured
          </div>
        </div>
      )}

      {/* Video Play Button */}
      {item.type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300',
            isHovered && 'scale-110'
          )}>
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Info Overlay */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 p-4 transition-all duration-300',
          isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}
      >
        <h3 className="font-semibold text-white text-lg truncate">{item.title}</h3>
        {item.location && (
          <p className="text-sm text-white/70 mt-0.5">{item.location}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
          {item.propertyType && <span>{item.propertyType}</span>}
          {item.sqft && <span>{item.sqft.toLocaleString()} sqft</span>}
        </div>
      </div>

      {/* Expand Icon */}
      <div
        className={cn(
          'absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-300',
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        )}
      >
        <Expand className="h-5 w-5 text-white" />
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: PortfolioItem['type'] }) {
  const config = {
    photo: { icon: Camera, label: 'Photo', color: 'bg-blue-500' },
    video: { icon: Video, label: 'Video', color: 'bg-purple-500' },
    drone: { icon: Plane, label: 'Aerial', color: 'bg-cyan-500' },
    '3d-tour': { icon: Home, label: '3D Tour', color: 'bg-green-500' },
    staging: { icon: Sparkles, label: 'Staged', color: 'bg-amber-500' },
    'floor-plan': { icon: ImageIcon, label: 'Floor Plan', color: 'bg-rose-500' },
  }

  const { icon: Icon, label, color } = config[type]

  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white',
      color
    )}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  )
}

// Hook to load portfolio items
export function usePortfolioItems() {
  // In production, this would fetch from Supabase
  // For now, return mock data
  const items: PortfolioItem[] = [
    // This would be populated from the database
  ]

  return { items, isLoading: false }
}
