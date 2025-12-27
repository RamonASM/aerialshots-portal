'use client'

import { useState } from 'react'
import { Utensils, Star, TrendingUp, Sparkles, MapPin, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import type { Restaurant, DiningData } from '@/lib/api/types'

interface DiningSectionProps {
  dining: DiningData | null
}

type TabKey = 'trending' | 'new' | 'topRated'

function getPriceLevelDisplay(level: 1 | 2 | 3 | 4): string {
  return '$'.repeat(level)
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <div className="group rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-colors">
      {restaurant.photoUrl && (
        <div className="relative h-32 overflow-hidden">
          <Image
            src={restaurant.photoUrl}
            alt={restaurant.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {restaurant.highlights && restaurant.highlights.length > 0 && (
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/90 text-white text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                {restaurant.highlights[0]}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white truncate">{restaurant.name}</h4>
            <p className="text-xs text-[#636366] truncate">
              {restaurant.cuisine.slice(0, 2).join(' · ')}
            </p>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              restaurant.isOpen
                ? 'bg-green-500/20 text-green-500'
                : 'bg-[#636366]/20 text-[#636366]'
            }`}
          >
            {restaurant.isOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-white font-medium">{restaurant.rating.toFixed(1)}</span>
            <span className="text-[#636366]">({restaurant.reviewCount})</span>
          </span>
          <span className="text-[#a1a1a6]">{getPriceLevelDisplay(restaurant.priceLevel)}</span>
          <span className="flex items-center gap-1 text-[#636366]">
            <MapPin className="w-3 h-3" />
            {restaurant.distanceMiles.toFixed(1)} mi
          </span>
        </div>

        {(restaurant.yelpUrl || restaurant.googleUrl) && (
          <div className="flex gap-2 mt-3">
            {restaurant.yelpUrl && (
              <a
                href={restaurant.yelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors"
              >
                Yelp <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {restaurant.googleUrl && (
              <a
                href={restaurant.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors"
              >
                Google <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function DiningSection({ dining }: DiningSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('trending')

  if (!dining) {
    return null
  }

  const { trending, newOpenings, topRated } = dining

  // Check if we have any data
  if ((!trending || trending.length === 0) &&
      (!newOpenings || newOpenings.length === 0) &&
      (!topRated || topRated.length === 0)) {
    return null
  }

  const allTabs: { key: TabKey; label: string; icon: typeof TrendingUp; data: Restaurant[] }[] = [
    { key: 'trending', label: 'Trending', icon: TrendingUp, data: trending || [] },
    { key: 'new', label: 'Hot & New', icon: Sparkles, data: newOpenings || [] },
    { key: 'topRated', label: 'Top Rated', icon: Star, data: topRated || [] },
  ]
  const tabs = allTabs.filter(tab => tab.data.length > 0)

  const activeData = tabs.find(t => t.key === activeTab)?.data || tabs[0]?.data || []

  return (
    <section className="py-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-semibold text-white">Dining & Restaurants</h2>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {tabs.map(({ key, label, icon: Icon, data }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-white text-black font-medium'
                  : 'bg-white/[0.05] text-[#a1a1a6] hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className="text-xs opacity-60">{data.length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeData.slice(0, 6).map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>

      {activeData.length > 6 && (
        <p className="mt-4 text-sm text-[#a1a1a6]">
          +{activeData.length - 6} more restaurants nearby
        </p>
      )}

      <p className="mt-4 text-xs text-[#636366]">
        Restaurant data powered by Yelp and Google Places
      </p>
    </section>
  )
}
