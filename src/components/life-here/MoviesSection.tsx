'use client'

import { useState } from 'react'
import { Film, Star, MapPin, Clock } from 'lucide-react'
import Image from 'next/image'
import type { MoviesData, Movie, Theater } from '@/lib/api/types'

interface MoviesSectionProps {
  movies: MoviesData | null
}

type TabKey = 'nowPlaying' | 'theaters'

function MovieCard({ movie }: { movie: Movie }) {
  return (
    <div className="group flex-shrink-0 w-[140px]">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.05] flex items-center justify-center">
            <Film className="w-8 h-8 text-[#636366]" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs text-white font-medium">{movie.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <h4 className="text-sm font-medium text-white truncate">{movie.title}</h4>
      <p className="text-xs text-[#636366] truncate">
        {movie.genres.slice(0, 2).join(' · ')}
      </p>
      {movie.runtime && (
        <p className="flex items-center gap-1 text-xs text-[#636366] mt-0.5">
          <Clock className="w-3 h-3" />
          {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
        </p>
      )}
    </div>
  )
}

function TheaterCard({ theater }: { theater: Theater }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{theater.name}</h4>
          {theater.chain && (
            <span className="text-xs text-[#636366]">{theater.chain}</span>
          )}
        </div>
        <span className="flex items-center gap-1 text-sm text-[#a1a1a6]">
          <MapPin className="w-3.5 h-3.5" />
          {theater.distanceMiles.toFixed(1)} mi
        </span>
      </div>
      <p className="text-xs text-[#636366] mt-2 truncate">{theater.address}</p>
      {theater.rating && (
        <div className="flex items-center gap-1 mt-2">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs text-white">{theater.rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  )
}

export function MoviesSection({ movies }: MoviesSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('nowPlaying')

  if (!movies) {
    return null
  }

  const { nowPlaying, theaters } = movies

  // Check if we have any data
  if ((!nowPlaying || nowPlaying.length === 0) && (!theaters || theaters.length === 0)) {
    return null
  }

  const allTabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'nowPlaying', label: 'Now Playing', count: nowPlaying?.length || 0 },
    { key: 'theaters', label: 'Nearby Theaters', count: theaters?.length || 0 },
  ]
  const tabs = allTabs.filter(tab => tab.count > 0)

  return (
    <section className="py-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Movies & Theaters</h2>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-2 mb-4">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-white text-black font-medium'
                  : 'bg-white/[0.05] text-[#a1a1a6] hover:bg-white/[0.08]'
              }`}
            >
              {label}
              <span className="text-xs opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'nowPlaying' && nowPlaying && nowPlaying.length > 0 && (
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-4">
            {nowPlaying.slice(0, 10).map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'theaters' && theaters && theaters.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {theaters.slice(0, 6).map((theater) => (
            <TheaterCard key={theater.id} theater={theater} />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-[#636366]">
        Movie data powered by TMDb
      </p>
    </section>
  )
}
